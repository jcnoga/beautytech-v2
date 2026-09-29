// Rotas do nicho Pilates (Fase 2: alunos, instrutores, planos, matrículas e modalidades).
// Todas ficam sob /pilates/* e passam pelo feature-guard (ROUTE_FEATURES em config/features.ts):
// só empresas com business_type = "pilates" acessam; os outros nichos recebem 403.
// Reaproveitam as tabelas existentes: aluno = clients (+ pilates_student_profiles),
// instrutor = professionals (+ professional_schedules), modalidade = services.
import type { FastifyInstance } from "fastify";
import { and, asc, desc, eq, ilike, isNull, sql } from "drizzle-orm";
import { db } from "@db/connection";
import {
  clients, professionals, services, professionalSchedules,
  pilatesStudentProfiles, pilatesPlans, pilatesEnrollments,
} from "@db/schema/index";
import { authenticate, requireManager } from "@middleware/auth";
import { parseBody } from "../dtos";
import { rejectForeignRefs } from "../tenant-guard";
import { auditLog, checkClientLimit, checkProfessionalLimit, getPlanInfo } from "../all-modules";
import {
  studentCreateDto, studentUpdateDto, STUDENT_CLIENT_FIELDS,
  instructorCreateDto, instructorUpdateDto, instructorSchedulesDto,
  planCreateDto, planUpdateDto, planRuleError,
  enrollmentCreateDto, enrollmentUpdateDto,
  modalityCreateDto, modalityUpdateDto,
} from "./pilates.dto";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const notFound = (reply: any, error: string) => reply.status(404).send({ success: false, error, code: "NOT_FOUND" });
const defined = (o: Record<string, unknown>) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));

// ─── datas (AAAA-MM-DD, sem fuso: são dias de calendário) ───────────────────
const iso = (d: Date) => d.toISOString().slice(0, 10);
/** Colunas date: o driver postgres-js devolve Date; a API responde sempre AAAA-MM-DD. */
const toDay = (v: unknown): string | null => (v instanceof Date ? iso(v) : (v as string | null) ?? null);
const withDays = <T extends Record<string, any>>(row: T, keys: string[]): T =>
  row && Object.fromEntries(Object.entries(row).map(([k, v]) => [k, keys.includes(k) ? toDay(v) : v])) as T;
const STUDENT_DAYS = ["birthDate", "startDate", "initialAssessmentDate"];
const ENROLLMENT_DAYS = ["startDate", "endDate"];
const parseDay = (s: string) => { const [y, m, d] = s.split("-").map(Number); return new Date(Date.UTC(y, m - 1, d)); };
/** Último dia de uma vigência de N meses a partir de start (ex.: 2026-10-15 + 1 mês → 2026-11-14). */
function endAfterMonths(start: string, months: number) {
  const s = parseDay(start);
  const target = new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth() + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(s.getUTCDate(), lastDay));
  target.setUTCDate(target.getUTCDate() - 1);
  return iso(target);
}
/** Último dia de uma validade de N dias contando o dia de início. */
function endAfterDays(start: string, days: number) {
  const s = parseDay(start);
  s.setUTCDate(s.getUTCDate() + days - 1);
  return iso(s);
}

// ─── consultas ──────────────────────────────────────────────────────────────
const studentFields = {
  id: clients.id,
  // false = cliente do studio ainda sem ficha de Pilates ("ficha incompleta"); salvar a ficha a cria.
  hasProfile: sql<boolean>`("pilates_student_profiles"."id" IS NOT NULL)`,
  fullName: clients.fullName,
  phone: clients.phone,
  whatsapp: clients.whatsapp,
  email: clients.email,
  birthDate: clients.birthDate,
  goal: pilatesStudentProfiles.goal,
  level: pilatesStudentProfiles.level,
  startDate: pilatesStudentProfiles.startDate,
  weeklyFrequency: pilatesStudentProfiles.weeklyFrequency,
  status: pilatesStudentProfiles.status,
  instructorId: pilatesStudentProfiles.instructorId,
  instructorName: professionals.fullName,
  notes: pilatesStudentProfiles.notes,
  emergencyContactName: pilatesStudentProfiles.emergencyContactName,
  emergencyContactPhone: pilatesStudentProfiles.emergencyContactPhone,
  initialAssessmentDate: pilatesStudentProfiles.initialAssessmentDate,
  declaredRestrictions: pilatesStudentProfiles.declaredRestrictions,
  activeEnrollments: sql<number>`(SELECT count(*)::int FROM pilates_enrollments e
    WHERE e.client_id = "clients"."id" AND e.tenant_id = "clients"."tenant_id" AND e.status = 'active')`,
};

/** Todos os clientes do studio, com a ficha de Pilates quando existir (mesmo cadastro, sem duplicar). */
function studentsQuery(tenantId: string) {
  return db.select(studentFields).from(clients)
    .leftJoin(pilatesStudentProfiles, and(eq(pilatesStudentProfiles.clientId, clients.id), eq(pilatesStudentProfiles.tenantId, tenantId)))
    .leftJoin(professionals, eq(professionals.id, pilatesStudentProfiles.instructorId));
}

async function findStudent(tenantId: string, clientId: string) {
  if (!UUID.test(clientId)) return undefined;
  const [row] = await studentsQuery(tenantId)
    .where(and(eq(clients.id, clientId), eq(clients.tenantId, tenantId), isNull(clients.deletedAt)));
  return row ? withDays(row, STUDENT_DAYS) : undefined;
}

async function findInstructor(tenantId: string, id: string) {
  if (!UUID.test(id)) return undefined;
  const [row] = await db.select({ id: professionals.id }).from(professionals)
    .where(and(eq(professionals.id, id), eq(professionals.tenantId, tenantId), isNull(professionals.deletedAt)));
  return row;
}

async function findPlan(tenantId: string, id: string) {
  if (!UUID.test(id)) return undefined;
  const [row] = await db.select().from(pilatesPlans).where(and(eq(pilatesPlans.id, id), eq(pilatesPlans.tenantId, tenantId)));
  return row;
}

/** Zera os campos do outro tipo de plano (frequência x pacote). */
function normalizePlan<T extends Record<string, any>>(p: T): T {
  if (p.kind === "frequency") return { ...p, totalClasses: null, validityDays: null, isTrial: false };
  if (p.kind === "package") return { ...p, classesPerWeek: null, durationMonths: null };
  return p;
}

export async function pilatesModule(fastify: FastifyInstance) {
  // ═══ ALUNOS ═══════════════════════════════════════════════════════════════
  fastify.get("/pilates/students", { preHandler: [authenticate] }, async (req: any, reply) => {
    const { tenantId } = req.tenantContext;
    const { status, search } = req.query as any;
    const cond = [eq(clients.tenantId, tenantId), isNull(clients.deletedAt)];
    if (status === "incomplete") cond.push(isNull(pilatesStudentProfiles.id));
    else if (typeof status === "string" && status) cond.push(eq(pilatesStudentProfiles.status, status));
    if (typeof search === "string" && search.trim()) cond.push(ilike(clients.fullName, `%${search.trim()}%`));
    const data = await studentsQuery(tenantId).where(and(...cond)).orderBy(asc(clients.fullName));
    return reply.send({ success: true, data: data.map((r) => withDays(r, STUDENT_DAYS)) });
  });

  fastify.get("/pilates/students/:id", { preHandler: [authenticate] }, async (req: any, reply) => {
    const { tenantId } = req.tenantContext;
    const student = await findStudent(tenantId, req.params.id);
    if (!student) return notFound(reply, "Aluno nao encontrado");
    return reply.send({ success: true, data: student });
  });

  fastify.post("/pilates/students", { preHandler: [authenticate] }, async (req: any, reply) => {
    const { tenantId, userId } = req.tenantContext;
    // Mesmos limites da assinatura do cadastro de clientes (item 36).
    const lim = await checkClientLimit(tenantId);
    if (!lim.allowed) return reply.status(403).send({ success: false, error: `Limite do plano: ${lim.current}/${lim.limit} alunos. Faca upgrade.`, code: "PLAN_LIMIT" });
    const plan = await getPlanInfo(tenantId);
    if (plan.isFree && lim.current >= plan.maxClients) {
      return reply.status(403).send({ success: false, error: `Limite de ${plan.maxClients} alunos atingido no plano gratuito. Faca upgrade.`, code: "PLAN_LIMIT" });
    }
    const body = parseBody(studentCreateDto, req, reply); if (!body) return;
    if (await rejectForeignRefs(reply, tenantId, { professionals: [body.instructorId] })) return;

    const clientData: Record<string, unknown> = {};
    const profileData: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(body)) ((STUDENT_CLIENT_FIELDS as readonly string[]).includes(k) ? clientData : profileData)[k] = v;

    const clientId = await db.transaction(async (tx) => {
      const [c] = await tx.insert(clients).values({ ...(defined(clientData) as any), tenantId, createdBy: userId, updatedBy: userId }).returning({ id: clients.id });
      await tx.insert(pilatesStudentProfiles).values({ ...(defined(profileData) as any), tenantId, clientId: c.id });
      return c.id;
    });
    auditLog({ tenantId, userId, action: "pilates.student.created", tableName: "clients", recordId: clientId, newData: { fullName: body.fullName } });
    return reply.status(201).send({ success: true, data: await findStudent(tenantId, clientId) });
  });

  fastify.patch("/pilates/students/:id", { preHandler: [authenticate] }, async (req: any, reply) => {
    const { tenantId, userId } = req.tenantContext;
    const current = await findStudent(tenantId, req.params.id);
    if (!current) return notFound(reply, "Aluno nao encontrado");
    const body = parseBody(studentUpdateDto, req, reply); if (!body) return;
    if (await rejectForeignRefs(reply, tenantId, { professionals: [body.instructorId] })) return;

    const clientData: Record<string, unknown> = {};
    const profileData: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(defined(body))) ((STUDENT_CLIENT_FIELDS as readonly string[]).includes(k) ? clientData : profileData)[k] = v;

    await db.transaction(async (tx) => {
      if (Object.keys(clientData).length) {
        await tx.update(clients).set({ ...(clientData as any), updatedBy: userId, updatedAt: new Date() })
          .where(and(eq(clients.id, current.id), eq(clients.tenantId, tenantId)));
      }
      if (!current.hasProfile) {
        // Cliente sem ficha: salvar cria a ficha de Pilates (completa o cadastro).
        await tx.insert(pilatesStudentProfiles).values({ ...(profileData as any), tenantId, clientId: current.id });
      } else if (Object.keys(profileData).length) {
        await tx.update(pilatesStudentProfiles).set({ ...(profileData as any), updatedAt: new Date() })
          .where(and(eq(pilatesStudentProfiles.clientId, current.id), eq(pilatesStudentProfiles.tenantId, tenantId)));
      }
    });
    auditLog({ tenantId, userId, action: "pilates.student.updated", tableName: "clients", recordId: current.id, newData: defined(body) });
    return reply.send({ success: true, data: await findStudent(tenantId, current.id) });
  });

  // ═══ INSTRUTORES ══════════════════════════════════════════════════════════
  const instructorFields = {
    id: professionals.id,
    fullName: professionals.fullName,
    phone: professionals.phone,
    whatsapp: professionals.whatsapp,
    email: professionals.email,
    bio: professionals.bio,
    specialties: professionals.specialties,
    professionalRegistration: professionals.professionalRegistration,
    commissionPct: professionals.commissionPct,
    isActive: professionals.isActive,
    studentsCount: sql<number>`(SELECT count(*)::int FROM pilates_student_profiles p
      WHERE p.instructor_id = "professionals"."id" AND p.tenant_id = "professionals"."tenant_id" AND p.status = 'active')`,
  };

  fastify.get("/pilates/instructors", { preHandler: [authenticate] }, async (req: any, reply) => {
    const { tenantId } = req.tenantContext;
    const data = await db.select(instructorFields).from(professionals)
      .where(and(eq(professionals.tenantId, tenantId), isNull(professionals.deletedAt)))
      .orderBy(desc(professionals.isActive), asc(professionals.fullName));
    return reply.send({ success: true, data });
  });

  fastify.post("/pilates/instructors", { preHandler: [authenticate, requireManager] }, async (req: any, reply) => {
    const { tenantId, userId } = req.tenantContext;
    const lim = await checkProfessionalLimit(tenantId);
    if (!lim.allowed) return reply.status(403).send({ success: false, error: `Limite do plano: ${lim.current}/${lim.limit} instrutores. Faca upgrade.`, code: "PLAN_LIMIT" });
    const body = parseBody(instructorCreateDto, req, reply); if (!body) return;
    const [row] = await db.insert(professionals)
      .values({ ...(defined(body) as any), tenantId, commissionType: "percentage", createdBy: userId, updatedBy: userId })
      .returning({ id: professionals.id });
    auditLog({ tenantId, userId, action: "pilates.instructor.created", tableName: "professionals", recordId: row.id, newData: { fullName: body.fullName } });
    const [data] = await db.select(instructorFields).from(professionals).where(eq(professionals.id, row.id));
    return reply.status(201).send({ success: true, data });
  });

  fastify.patch("/pilates/instructors/:id", { preHandler: [authenticate, requireManager] }, async (req: any, reply) => {
    const { tenantId, userId } = req.tenantContext;
    if (!(await findInstructor(tenantId, req.params.id))) return notFound(reply, "Instrutor nao encontrado");
    const body = parseBody(instructorUpdateDto, req, reply); if (!body) return;
    const changes = defined(body);
    if (Object.keys(changes).length) {
      await db.update(professionals).set({ ...(changes as any), updatedBy: userId, updatedAt: new Date() })
        .where(and(eq(professionals.id, req.params.id), eq(professionals.tenantId, tenantId)));
    }
    auditLog({ tenantId, userId, action: "pilates.instructor.updated", tableName: "professionals", recordId: req.params.id, newData: changes });
    const [data] = await db.select(instructorFields).from(professionals).where(eq(professionals.id, req.params.id));
    return reply.send({ success: true, data });
  });

  fastify.get("/pilates/instructors/:id/schedules", { preHandler: [authenticate] }, async (req: any, reply) => {
    const { tenantId } = req.tenantContext;
    if (!(await findInstructor(tenantId, req.params.id))) return notFound(reply, "Instrutor nao encontrado");
    const data = await db.select({
      dayOfWeek: professionalSchedules.dayOfWeek, isWorking: professionalSchedules.isWorking,
      startTime: professionalSchedules.startTime, endTime: professionalSchedules.endTime,
      breakStart: professionalSchedules.breakStart, breakEnd: professionalSchedules.breakEnd,
    }).from(professionalSchedules)
      .where(and(eq(professionalSchedules.professionalId, req.params.id), eq(professionalSchedules.tenantId, tenantId)))
      .orderBy(asc(professionalSchedules.dayOfWeek));
    return reply.send({ success: true, data });
  });

  fastify.put("/pilates/instructors/:id/schedules", { preHandler: [authenticate, requireManager] }, async (req: any, reply) => {
    const { tenantId, userId } = req.tenantContext;
    if (!(await findInstructor(tenantId, req.params.id))) return notFound(reply, "Instrutor nao encontrado");
    const rows = parseBody(instructorSchedulesDto, req, reply); if (!rows) return;
    await db.transaction(async (tx) => {
      for (const r of rows) {
        const values = { isWorking: r.isWorking, startTime: r.startTime, endTime: r.endTime,
          breakStart: r.breakStart ?? null, breakEnd: r.breakEnd ?? null, updatedAt: new Date() };
        await tx.insert(professionalSchedules)
          .values({ tenantId, professionalId: req.params.id, dayOfWeek: r.dayOfWeek, ...values })
          .onConflictDoUpdate({ target: [professionalSchedules.professionalId, professionalSchedules.dayOfWeek], set: values });
      }
    });
    auditLog({ tenantId, userId, action: "pilates.instructor.schedules", tableName: "professional_schedules", recordId: req.params.id });
    return reply.send({ success: true });
  });

  // ═══ PLANOS ═══════════════════════════════════════════════════════════════
  fastify.get("/pilates/plans", { preHandler: [authenticate] }, async (req: any, reply) => {
    const { tenantId } = req.tenantContext;
    const { status } = req.query as any;
    const cond = [eq(pilatesPlans.tenantId, tenantId)];
    if (status === "active" || status === "inactive") cond.push(eq(pilatesPlans.status, status));
    const data = await db.select({ plan: pilatesPlans, modalityName: services.name }).from(pilatesPlans)
      .leftJoin(services, eq(services.id, pilatesPlans.modalityId))
      .where(and(...cond)).orderBy(asc(pilatesPlans.status), asc(pilatesPlans.name));
    return reply.send({ success: true, data: data.map((r) => ({ ...r.plan, modalityName: r.modalityName })) });
  });

  fastify.post("/pilates/plans", { preHandler: [authenticate, requireManager] }, async (req: any, reply) => {
    const { tenantId, userId } = req.tenantContext;
    const body = parseBody(planCreateDto, req, reply); if (!body) return;
    const ruleError = planRuleError(body);
    if (ruleError) return reply.status(400).send({ success: false, error: ruleError });
    if (await rejectForeignRefs(reply, tenantId, { services: [body.modalityId] })) return;
    const [row] = await db.insert(pilatesPlans).values({ ...(normalizePlan(defined(body)) as any), tenantId }).returning();
    auditLog({ tenantId, userId, action: "pilates.plan.created", tableName: "pilates_plans", recordId: row.id, newData: { name: row.name } });
    return reply.status(201).send({ success: true, data: row });
  });

  fastify.patch("/pilates/plans/:id", { preHandler: [authenticate, requireManager] }, async (req: any, reply) => {
    const { tenantId, userId } = req.tenantContext;
    const current = await findPlan(tenantId, req.params.id);
    if (!current) return notFound(reply, "Plano nao encontrado");
    const body = parseBody(planUpdateDto, req, reply); if (!body) return;
    const changes = defined(body);
    const merged = normalizePlan({ ...current, ...changes });
    const ruleError = planRuleError(merged as any);
    if (ruleError) return reply.status(400).send({ success: false, error: ruleError });
    if (await rejectForeignRefs(reply, tenantId, { services: [body.modalityId] })) return;
    const { id: _id, tenantId: _t, createdAt: _c, ...set } = merged as any;
    const [row] = await db.update(pilatesPlans).set({ ...set, updatedAt: new Date() })
      .where(and(eq(pilatesPlans.id, current.id), eq(pilatesPlans.tenantId, tenantId))).returning();
    auditLog({ tenantId, userId, action: "pilates.plan.updated", tableName: "pilates_plans", recordId: row.id, newData: changes });
    return reply.send({ success: true, data: row });
  });

  // ═══ MATRÍCULAS ═══════════════════════════════════════════════════════════
  fastify.get("/pilates/enrollments", { preHandler: [authenticate] }, async (req: any, reply) => {
    const { tenantId } = req.tenantContext;
    const { studentId } = req.query as any;
    const cond = [eq(pilatesEnrollments.tenantId, tenantId)];
    if (studentId !== undefined) {
      if (typeof studentId !== "string" || !UUID.test(studentId)) return reply.send({ success: true, data: [] });
      cond.push(eq(pilatesEnrollments.clientId, studentId));
    }
    const data = await db.select({ enrollment: pilatesEnrollments, planName: pilatesPlans.name, planKind: pilatesPlans.kind, studentName: clients.fullName })
      .from(pilatesEnrollments)
      .innerJoin(pilatesPlans, eq(pilatesPlans.id, pilatesEnrollments.planId))
      .innerJoin(clients, eq(clients.id, pilatesEnrollments.clientId))
      .where(and(...cond)).orderBy(desc(pilatesEnrollments.startDate));
    return reply.send({ success: true, data: data.map((r) => withDays({ ...r.enrollment, planName: r.planName, planKind: r.planKind, studentName: r.studentName }, ENROLLMENT_DAYS)) });
  });

  fastify.post("/pilates/enrollments", { preHandler: [authenticate] }, async (req: any, reply) => {
    const { tenantId, userId } = req.tenantContext;
    const body = parseBody(enrollmentCreateDto, req, reply); if (!body) return;
    const student = await findStudent(tenantId, body.studentId);
    if (!student) return notFound(reply, "Aluno nao encontrado");
    if (!student.hasProfile) return reply.status(400).send({ success: false, error: "Complete a ficha de Pilates do aluno antes de matricular", code: "INCOMPLETE_PROFILE" });
    const plan = await findPlan(tenantId, body.planId);
    if (!plan) return notFound(reply, "Plano nao encontrado");
    if (plan.status !== "active") return reply.status(400).send({ success: false, error: "Plano inativo" });
    const endDate = body.endDate ?? (plan.kind === "frequency"
      ? endAfterMonths(body.startDate, plan.durationMonths ?? 1)
      : endAfterDays(body.startDate, plan.validityDays ?? 30));
    if (endDate < body.startDate) return reply.status(400).send({ success: false, error: "Fim antes do inicio" });
    const dueDay = body.dueDay ?? (plan.kind === "frequency" ? Math.min(Number(body.startDate.slice(8, 10)), 28) : null);
    const [row] = await db.insert(pilatesEnrollments).values({
      tenantId, clientId: body.studentId, planId: plan.id, startDate: body.startDate, endDate, dueDay,
      price: body.price ?? plan.price, notes: body.notes ?? null,
    }).returning();
    auditLog({ tenantId, userId, action: "pilates.enrollment.created", tableName: "pilates_enrollments", recordId: row.id, newData: { studentId: body.studentId, planId: plan.id } });
    return reply.status(201).send({ success: true, data: withDays({ ...row, planName: plan.name, planKind: plan.kind }, ENROLLMENT_DAYS) });
  });

  fastify.patch("/pilates/enrollments/:id", { preHandler: [authenticate] }, async (req: any, reply) => {
    const { tenantId, userId } = req.tenantContext;
    if (!UUID.test(req.params.id)) return notFound(reply, "Matricula nao encontrada");
    const [current] = await db.select().from(pilatesEnrollments)
      .where(and(eq(pilatesEnrollments.id, req.params.id), eq(pilatesEnrollments.tenantId, tenantId)));
    if (!current) return notFound(reply, "Matricula nao encontrada");
    const body = parseBody(enrollmentUpdateDto, req, reply); if (!body) return;
    const changes = defined(body);
    const endDate = "endDate" in changes ? (changes.endDate as string | null) : toDay(current.endDate);
    if (endDate && endDate < (toDay(current.startDate) as string)) return reply.status(400).send({ success: false, error: "Fim antes do inicio" });
    const [row] = await db.update(pilatesEnrollments).set({ ...(changes as any), updatedAt: new Date() })
      .where(and(eq(pilatesEnrollments.id, current.id), eq(pilatesEnrollments.tenantId, tenantId))).returning();
    auditLog({ tenantId, userId, action: "pilates.enrollment.updated", tableName: "pilates_enrollments", recordId: row.id, newData: changes });
    return reply.send({ success: true, data: withDays(row, ENROLLMENT_DAYS) });
  });

  // ═══ MODALIDADES (services) ═══════════════════════════════════════════════
  const modalityFields = {
    id: services.id, name: services.name, description: services.description,
    durationMinutes: services.durationMinutes, price: services.price, isActive: services.isActive,
  };

  fastify.get("/pilates/modalities", { preHandler: [authenticate] }, async (req: any, reply) => {
    const { tenantId } = req.tenantContext;
    const data = await db.select(modalityFields).from(services)
      .where(and(eq(services.tenantId, tenantId), isNull(services.deletedAt)))
      .orderBy(desc(services.isActive), asc(services.name));
    return reply.send({ success: true, data });
  });

  fastify.post("/pilates/modalities", { preHandler: [authenticate, requireManager] }, async (req: any, reply) => {
    const { tenantId, userId } = req.tenantContext;
    const body = parseBody(modalityCreateDto, req, reply); if (!body) return;
    const [row] = await db.insert(services).values({ ...(defined(body) as any), tenantId, createdBy: userId, updatedBy: userId }).returning(modalityFields);
    auditLog({ tenantId, userId, action: "pilates.modality.created", tableName: "services", recordId: row.id, newData: { name: row.name } });
    return reply.status(201).send({ success: true, data: row });
  });

  fastify.patch("/pilates/modalities/:id", { preHandler: [authenticate, requireManager] }, async (req: any, reply) => {
    const { tenantId, userId } = req.tenantContext;
    if (!UUID.test(req.params.id)) return notFound(reply, "Modalidade nao encontrada");
    const body = parseBody(modalityUpdateDto, req, reply); if (!body) return;
    const changes = defined(body);
    const [row] = await db.update(services).set({ ...(changes as any), updatedBy: userId, updatedAt: new Date() })
      .where(and(eq(services.id, req.params.id), eq(services.tenantId, tenantId), isNull(services.deletedAt))).returning(modalityFields);
    if (!row) return notFound(reply, "Modalidade nao encontrada");
    auditLog({ tenantId, userId, action: "pilates.modality.updated", tableName: "services", recordId: row.id, newData: changes });
    return reply.send({ success: true, data: row });
  });
}
