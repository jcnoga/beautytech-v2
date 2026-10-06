// Aulas em turma, Fase 2 (rotas: alunos, instrutores, planos, matrículas e modalidades).
// Ficam sob /class-students, /class-instructors, /memberships/* e /classes/modalities e passam pelo feature-guard (ROUTE_FEATURES em config/features.ts):
// só empresas com business_type = "pilates" acessam; os outros nichos recebem 403.
// Reaproveitam as tabelas existentes: aluno = clients (+ student_profiles),
// instrutor = professionals (+ professional_schedules), modalidade = services.
import type { FastifyInstance } from "fastify";
import { and, asc, desc, eq, ilike, isNull, sql } from "drizzle-orm";
import { db } from "@db/connection";
import {
  clients, professionals, services, professionalSchedules,
  studentProfiles, membershipPlans, membershipEnrollments,
} from "@db/schema/index";
import { authenticate, hasRole, requireFinancial, requireManager } from "@middleware/auth";
import { parseBody } from "../dtos";
import { rejectForeignRefs } from "../tenant-guard";
import { auditLog, checkProfessionalLimit } from "../all-modules";
import { ClassError, creditUsage, materializeFixed, pruneFixed, TZ } from "./classes.service";
import { assertStudentLimit, insertStudent } from "./students.service";
import {
  generateAllInstallments, generateInstallments, receiveInstallment, RECEIVE_METHODS, studentInstallments, syncInstallments,
} from "./installments.service";
import { limitMessage } from "../billing/plan-limits.service";
import { rows } from "./rules";
import {
  studentCreateDto, studentUpdateDto, STUDENT_CLIENT_FIELDS,
  instructorCreateDto, instructorUpdateDto, instructorSchedulesDto,
  planCreateDto, planUpdateDto, planRuleError,
  enrollmentCreateDto, enrollmentUpdateDto,
  modalityCreateDto, modalityUpdateDto,
} from "./group-classes.dto";

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
  // false = cliente do studio ainda sem ficha de aluno ("ficha incompleta"); salvar a ficha a cria.
  hasProfile: sql<boolean>`("student_profiles"."id" IS NOT NULL)`,
  fullName: clients.fullName,
  phone: clients.phone,
  whatsapp: clients.whatsapp,
  email: clients.email,
  birthDate: clients.birthDate,
  goal: studentProfiles.goal,
  level: studentProfiles.level,
  startDate: studentProfiles.startDate,
  weeklyFrequency: studentProfiles.weeklyFrequency,
  status: studentProfiles.status,
  instructorId: studentProfiles.instructorId,
  instructorName: professionals.fullName,
  notes: studentProfiles.notes,
  emergencyContactName: studentProfiles.emergencyContactName,
  emergencyContactPhone: studentProfiles.emergencyContactPhone,
  initialAssessmentDate: studentProfiles.initialAssessmentDate,
  declaredRestrictions: studentProfiles.declaredRestrictions,
  activeEnrollments: sql<number>`(SELECT count(*)::int FROM membership_enrollments e
    WHERE e.client_id = "clients"."id" AND e.tenant_id = "clients"."tenant_id" AND e.status = 'active')`,
};

/** Todos os clientes do studio, com a ficha do aluno quando existir (mesmo cadastro, sem duplicar). */
function studentsQuery(tenantId: string) {
  return db.select(studentFields).from(clients)
    .leftJoin(studentProfiles, and(eq(studentProfiles.clientId, clients.id), eq(studentProfiles.tenantId, tenantId)))
    .leftJoin(professionals, eq(professionals.id, studentProfiles.instructorId));
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
  const [row] = await db.select().from(membershipPlans).where(and(eq(membershipPlans.id, id), eq(membershipPlans.tenantId, tenantId)));
  return row;
}

/** Zera os campos do outro tipo de plano (frequência x pacote). */
function normalizePlan<T extends Record<string, any>>(p: T): T {
  if (p.kind === "frequency") return { ...p, totalClasses: null, validityDays: null, isTrial: false };
  if (p.kind === "package") return { ...p, classesPerWeek: null, durationMonths: null };
  return p;
}

export async function membershipsModule(fastify: FastifyInstance) {
  // ═══ ALUNOS ═══════════════════════════════════════════════════════════════
  fastify.get("/class-students", { preHandler: [authenticate] }, async (req: any, reply) => {
    const { tenantId } = req.tenantContext;
    const { status, search } = req.query as any;
    const cond = [eq(clients.tenantId, tenantId), isNull(clients.deletedAt)];
    if (status === "incomplete") cond.push(isNull(studentProfiles.id));
    else if (typeof status === "string" && status) cond.push(eq(studentProfiles.status, status));
    if (typeof search === "string" && search.trim()) cond.push(ilike(clients.fullName, `%${search.trim()}%`));
    const data = await studentsQuery(tenantId).where(and(...cond)).orderBy(asc(clients.fullName));
    return reply.send({ success: true, data: data.map((r) => withDays(r, STUDENT_DAYS)) });
  });

  fastify.get("/class-students/:id", { preHandler: [authenticate] }, async (req: any, reply) => {
    const { tenantId } = req.tenantContext;
    const student = await findStudent(tenantId, req.params.id);
    if (!student) return notFound(reply, "Aluno nao encontrado");
    return reply.send({ success: true, data: student });
  });

  fastify.post("/class-students", { preHandler: [authenticate] }, async (req: any, reply) => {
    const { tenantId, userId } = req.tenantContext;
    try {
      await assertStudentLimit(tenantId);
    } catch (e: any) {
      if (e instanceof ClassError) return reply.status(e.status).send({ success: false, error: e.message, code: e.code });
      throw e;
    }
    const body = parseBody(studentCreateDto, req, reply); if (!body) return;
    if (await rejectForeignRefs(reply, tenantId, { professionals: [body.instructorId] })) return;

    const clientId = await db.transaction((tx) => insertStudent(tx, tenantId, userId, body));
    auditLog({ tenantId, userId, action: "classes.student.created", tableName: "clients", recordId: clientId, newData: { fullName: body.fullName } });
    return reply.status(201).send({ success: true, data: await findStudent(tenantId, clientId) });
  });

  fastify.patch("/class-students/:id", { preHandler: [authenticate] }, async (req: any, reply) => {
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
        // Cliente sem ficha: salvar cria a ficha do aluno (completa o cadastro).
        await tx.insert(studentProfiles).values({ ...(profileData as any), tenantId, clientId: current.id });
      } else if (Object.keys(profileData).length) {
        await tx.update(studentProfiles).set({ ...(profileData as any), updatedAt: new Date() })
          .where(and(eq(studentProfiles.clientId, current.id), eq(studentProfiles.tenantId, tenantId)));
      }
    });
    auditLog({ tenantId, userId, action: "classes.student.updated", tableName: "clients", recordId: current.id, newData: defined(body) });
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
    avatarUrl: professionals.avatarUrl,
    specialties: professionals.specialties,
    professionalRegistration: professionals.professionalRegistration,
    commissionPct: professionals.commissionPct,
    isActive: professionals.isActive,
    userProfileId: professionals.userProfileId,
    loginName: sql<string | null>`(SELECT up.full_name FROM user_profiles up WHERE up.id = "professionals"."user_profile_id")`,
    studentsCount: sql<number>`(SELECT count(*)::int FROM student_profiles p
      WHERE p.instructor_id = "professionals"."id" AND p.tenant_id = "professionals"."tenant_id" AND p.status = 'active')`,
  };

  fastify.get("/class-instructors", { preHandler: [authenticate] }, async (req: any, reply) => {
    const { tenantId } = req.tenantContext;
    const data = await db.select(instructorFields).from(professionals)
      .where(and(eq(professionals.tenantId, tenantId), isNull(professionals.deletedAt)))
      .orderBy(desc(professionals.isActive), asc(professionals.fullName));
    return reply.send({ success: true, data });
  });

  fastify.post("/class-instructors", { preHandler: [authenticate, requireManager] }, async (req: any, reply) => {
    const { tenantId, userId } = req.tenantContext;
    const lim = await checkProfessionalLimit(tenantId);
    if (!lim.allowed) return reply.status(403).send({ success: false, error: limitMessage("instrutores", lim), code: "PLAN_LIMIT" });
    const body = parseBody(instructorCreateDto, req, reply); if (!body) return;
    const [row] = await db.insert(professionals)
      .values({ ...(defined(body) as any), tenantId, commissionType: "percentage", createdBy: userId, updatedBy: userId })
      .returning({ id: professionals.id });
    auditLog({ tenantId, userId, action: "classes.instructor.created", tableName: "professionals", recordId: row.id, newData: { fullName: body.fullName } });
    const [data] = await db.select(instructorFields).from(professionals).where(eq(professionals.id, row.id));
    return reply.status(201).send({ success: true, data });
  });

  fastify.patch("/class-instructors/:id", { preHandler: [authenticate, requireManager] }, async (req: any, reply) => {
    const { tenantId, userId } = req.tenantContext;
    if (!(await findInstructor(tenantId, req.params.id))) return notFound(reply, "Instrutor nao encontrado");
    const body = parseBody(instructorUpdateDto, req, reply); if (!body) return;
    const changes = defined(body);
    if (changes.userProfileId) {
      // Login do instrutor: precisa ser um usuário da própria equipe.
      const [up] = rows(await db.execute(sql`SELECT id FROM user_profiles WHERE id = ${changes.userProfileId as string} AND tenant_id = ${tenantId}`));
      if (!up) return notFound(reply, "Usuario da equipe nao encontrado");
    }
    if (Object.keys(changes).length) {
      await db.update(professionals).set({ ...(changes as any), updatedBy: userId, updatedAt: new Date() })
        .where(and(eq(professionals.id, req.params.id), eq(professionals.tenantId, tenantId)));
    }
    auditLog({ tenantId, userId, action: "classes.instructor.updated", tableName: "professionals", recordId: req.params.id, newData: changes });
    const [data] = await db.select(instructorFields).from(professionals).where(eq(professionals.id, req.params.id));
    return reply.send({ success: true, data });
  });

  fastify.get("/class-instructors/:id/schedules", { preHandler: [authenticate] }, async (req: any, reply) => {
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

  fastify.put("/class-instructors/:id/schedules", { preHandler: [authenticate, requireManager] }, async (req: any, reply) => {
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
    auditLog({ tenantId, userId, action: "classes.instructor.schedules", tableName: "professional_schedules", recordId: req.params.id });
    return reply.send({ success: true });
  });

  // ═══ PLANOS ═══════════════════════════════════════════════════════════════
  fastify.get("/memberships/plans", { preHandler: [authenticate] }, async (req: any, reply) => {
    const { tenantId } = req.tenantContext;
    const { status } = req.query as any;
    const cond = [eq(membershipPlans.tenantId, tenantId)];
    if (status === "active" || status === "inactive") cond.push(eq(membershipPlans.status, status));
    const data = await db.select({ plan: membershipPlans, modalityName: services.name }).from(membershipPlans)
      .leftJoin(services, eq(services.id, membershipPlans.modalityId))
      .where(and(...cond)).orderBy(asc(membershipPlans.status), asc(membershipPlans.name));
    return reply.send({ success: true, data: data.map((r) => ({ ...r.plan, modalityName: r.modalityName })) });
  });

  fastify.post("/memberships/plans", { preHandler: [authenticate, requireManager] }, async (req: any, reply) => {
    const { tenantId, userId } = req.tenantContext;
    const body = parseBody(planCreateDto, req, reply); if (!body) return;
    const ruleError = planRuleError(body);
    if (ruleError) return reply.status(400).send({ success: false, error: ruleError });
    if (await rejectForeignRefs(reply, tenantId, { services: [body.modalityId] })) return;
    const [row] = await db.insert(membershipPlans).values({ ...(normalizePlan(defined(body)) as any), tenantId }).returning();
    auditLog({ tenantId, userId, action: "classes.plan.created", tableName: "membership_plans", recordId: row.id, newData: { name: row.name } });
    return reply.status(201).send({ success: true, data: row });
  });

  fastify.patch("/memberships/plans/:id", { preHandler: [authenticate, requireManager] }, async (req: any, reply) => {
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
    const [row] = await db.update(membershipPlans).set({ ...set, updatedAt: new Date() })
      .where(and(eq(membershipPlans.id, current.id), eq(membershipPlans.tenantId, tenantId))).returning();
    auditLog({ tenantId, userId, action: "classes.plan.updated", tableName: "membership_plans", recordId: row.id,
      oldData: Object.fromEntries(Object.keys(changes).map((k) => [k, (current as any)[k]])), newData: changes });
    return reply.send({ success: true, data: row });
  });

  // ═══ MATRÍCULAS ═══════════════════════════════════════════════════════════
  fastify.get("/memberships/enrollments", { preHandler: [authenticate] }, async (req: any, reply) => {
    const { tenantId } = req.tenantContext;
    const { studentId } = req.query as any;
    const cond = [eq(membershipEnrollments.tenantId, tenantId)];
    if (studentId !== undefined) {
      if (typeof studentId !== "string" || !UUID.test(studentId)) return reply.send({ success: true, data: [] });
      cond.push(eq(membershipEnrollments.clientId, studentId));
    }
    const data = await db.select({ enrollment: membershipEnrollments, planName: membershipPlans.name, planKind: membershipPlans.kind, studentName: clients.fullName })
      .from(membershipEnrollments)
      .innerJoin(membershipPlans, eq(membershipPlans.id, membershipEnrollments.planId))
      .innerJoin(clients, eq(clients.id, membershipEnrollments.clientId))
      .where(and(...cond)).orderBy(desc(membershipEnrollments.startDate));
    const out = [];
    for (const r of data) {
      const e: any = withDays({ ...r.enrollment, planName: r.planName, planKind: r.planKind, studentName: r.studentName }, ENROLLMENT_DAYS);
      // Uso (C1): pacote = créditos; frequência = aulas desta semana (semana de Brasília, segunda a domingo).
      if (r.planKind === "package") e.usage = await creditUsage(db, e.id);
      else {
        const [w] = rows(await db.execute(sql`SELECT count(*)::int AS n, p.classes_per_week AS per_week
          FROM membership_enrollments en JOIN membership_plans p ON p.id = en.plan_id
          LEFT JOIN class_bookings b ON b.enrollment_id = en.id AND b.status IN ('booked','present','absent','excused')
            AND b.session_id IN (SELECT id FROM class_sessions WHERE session_date BETWEEN date_trunc('week', (now() AT TIME ZONE ${TZ}))::date
              AND date_trunc('week', (now() AT TIME ZONE ${TZ}))::date + 6)
          WHERE en.id = ${e.id} GROUP BY p.classes_per_week`));
        e.usage = { thisWeek: Number(w?.n ?? 0), perWeek: Number(w?.per_week ?? 0) };
      }
      out.push(e);
    }
    return reply.send({ success: true, data: out });
  });

  fastify.post("/memberships/enrollments", { preHandler: [authenticate] }, async (req: any, reply) => {
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
    // Matrícula e parcelas (mensalidades no Financeiro) juntas: ou grava tudo, ou nada.
    const { row, installments } = await db.transaction(async (tx) => {
      const [row] = await tx.insert(membershipEnrollments).values({
        tenantId, clientId: body.studentId, planId: plan.id, startDate: body.startDate, endDate, dueDay,
        price: body.price ?? plan.price, notes: body.notes ?? null,
      }).returning();
      return { row, installments: await generateInstallments(tx, tenantId, row.id, userId) };
    });
    auditLog({ tenantId, userId, action: "classes.enrollment.created", tableName: "membership_enrollments", recordId: row.id, newData: { studentId: body.studentId, planId: plan.id, installments } });
    return reply.status(201).send({ success: true, data: withDays({ ...row, planName: plan.name, planKind: plan.kind, installmentsCreated: installments }, ENROLLMENT_DAYS) });
  });

  fastify.patch("/memberships/enrollments/:id", { preHandler: [authenticate] }, async (req: any, reply) => {
    const { tenantId, userId } = req.tenantContext;
    if (!UUID.test(req.params.id)) return notFound(reply, "Matricula nao encontrada");
    const [current] = await db.select().from(membershipEnrollments)
      .where(and(eq(membershipEnrollments.id, req.params.id), eq(membershipEnrollments.tenantId, tenantId)));
    if (!current) return notFound(reply, "Matricula nao encontrada");
    const body = parseBody(enrollmentUpdateDto, req, reply); if (!body) return;
    const changes = defined(body);
    // Valor da matrícula mexe nas mensalidades: só Admin (owner) e Gerente.
    if ("price" in changes && !hasRole(req.tenantContext.role, "manager")) {
      return reply.status(403).send({ success: false, error: "Só o Admin ou o Gerente pode mudar o valor da matrícula", code: "FORBIDDEN" });
    }
    const endDate = "endDate" in changes ? (changes.endDate as string | null) : toDay(current.endDate);
    if (endDate && endDate < (toDay(current.startDate) as string)) return reply.status(400).send({ success: false, error: "Fim antes do inicio" });
    // Matrícula e parcelas juntas: encerrar/cancelar, mudar fim, valor ou vencimento acerta as pendentes futuras.
    const { row, installments } = await db.transaction(async (tx) => {
      const [row] = await tx.update(membershipEnrollments).set({ ...(changes as any), updatedAt: new Date() })
        .where(and(eq(membershipEnrollments.id, current.id), eq(membershipEnrollments.tenantId, tenantId))).returning();
      const revive = "endDate" in changes || (changes.status === "active" && ["ended", "cancelled"].includes(current.status));
      return { row, installments: await syncInstallments(tx, tenantId, row.id, userId, revive) };
    });
    // Horários fixos (Fase 3): encerrar/cancelar/antecipar o fim tira as aulas futuras; prorrogar gera as novas.
    await pruneFixed(db, tenantId, current.id);
    await materializeFixed(db, tenantId);
    auditLog({ tenantId, userId, action: "classes.enrollment.updated", tableName: "membership_enrollments", recordId: row.id, newData: { ...changes, installments } });
    return reply.send({ success: true, data: withDays({ ...row, installments }, ENROLLMENT_DAYS) });
  });

  // Ficha do aluno, aba Pagamentos: parcelas de todas as matrículas. Mesma permissão do Financeiro.
  fastify.get("/memberships/enrollments/installments", { preHandler: [authenticate, requireFinancial] }, async (req: any, reply) => {
    const { tenantId } = req.tenantContext;
    const { studentId } = req.query as any;
    if (typeof studentId !== "string" || !UUID.test(studentId)) return reply.send({ success: true, data: [] });
    return reply.send({ success: true, data: await studentInstallments(db, tenantId, studentId) });
  });

  // "Receber": parcela pendente vira paga hoje, com a forma de pagamento.
  fastify.post("/memberships/enrollments/installments/:id/receive", { preHandler: [authenticate, requireFinancial] }, async (req: any, reply) => {
    const { tenantId, userId } = req.tenantContext;
    if (!UUID.test(req.params.id)) return notFound(reply, "Parcela nao encontrada");
    const method = (req.body as any)?.paymentMethod;
    if (!(RECEIVE_METHODS as readonly string[]).includes(method)) return reply.status(400).send({ success: false, error: "Escolha a forma de pagamento", code: "VALIDATION_ERROR" });
    const r = await receiveInstallment(db, tenantId, req.params.id, method, userId);
    if (r === null) return notFound(reply, "Parcela nao encontrada");
    if (r === "not_pending") return reply.status(409).send({ success: false, error: "Esta parcela já foi paga ou cancelada", code: "NOT_PENDING" });
    auditLog({ tenantId, userId, action: "classes.installment.received", tableName: "financial_transactions", recordId: req.params.id, newData: { paymentMethod: method } });
    return reply.send({ success: true, data: r });
  });

  // Matrículas de antes das mensalidades (ou sem fim): cria as parcelas que faltam. Apertar de novo não duplica.
  fastify.post("/memberships/enrollments/installments", { preHandler: [authenticate, requireFinancial] }, async (req: any, reply) => {
    const { tenantId, userId } = req.tenantContext;
    const result = await db.transaction((tx) => generateAllInstallments(tx, tenantId, userId));
    auditLog({ tenantId, userId, action: "classes.installments.generated", tableName: "financial_transactions", recordId: tenantId, newData: result });
    return reply.send({ success: true, data: result });
  });

  // ═══ MODALIDADES (services) ═══════════════════════════════════════════════
  const modalityFields = {
    id: services.id, name: services.name, description: services.description,
    durationMinutes: services.durationMinutes, price: services.price, isActive: services.isActive,
  };

  fastify.get("/classes/modalities", { preHandler: [authenticate] }, async (req: any, reply) => {
    const { tenantId } = req.tenantContext;
    const data = await db.select(modalityFields).from(services)
      .where(and(eq(services.tenantId, tenantId), isNull(services.deletedAt)))
      .orderBy(desc(services.isActive), asc(services.name));
    return reply.send({ success: true, data });
  });

  fastify.post("/classes/modalities", { preHandler: [authenticate, requireManager] }, async (req: any, reply) => {
    const { tenantId, userId } = req.tenantContext;
    const body = parseBody(modalityCreateDto, req, reply); if (!body) return;
    const [row] = await db.insert(services).values({ ...(defined(body) as any), tenantId, createdBy: userId, updatedBy: userId }).returning(modalityFields);
    auditLog({ tenantId, userId, action: "classes.modality.created", tableName: "services", recordId: row.id, newData: { name: row.name } });
    return reply.status(201).send({ success: true, data: row });
  });

  fastify.patch("/classes/modalities/:id", { preHandler: [authenticate, requireManager] }, async (req: any, reply) => {
    const { tenantId, userId } = req.tenantContext;
    if (!UUID.test(req.params.id)) return notFound(reply, "Modalidade nao encontrada");
    const body = parseBody(modalityUpdateDto, req, reply); if (!body) return;
    const changes = defined(body);
    const [row] = await db.update(services).set({ ...(changes as any), updatedBy: userId, updatedAt: new Date() })
      .where(and(eq(services.id, req.params.id), eq(services.tenantId, tenantId), isNull(services.deletedAt))).returning(modalityFields);
    if (!row) return notFound(reply, "Modalidade nao encontrada");
    auditLog({ tenantId, userId, action: "classes.modality.updated", tableName: "services", recordId: row.id, newData: changes });
    return reply.send({ success: true, data: row });
  });
}
