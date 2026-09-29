// Rotas do Pilates, Fase 3: regras do studio, grade, aulas, horários fixos, inscrições, presença,
// reposições e pausas. Todas sob /pilates/* e protegidas pelo feature-guard (pilates_classes / pilates_settings).
// A regra de negócio fica em classes.service.ts; aqui: DTO, permissão, transação e Log de ações.
import type { FastifyInstance } from "fastify";
import { sql } from "drizzle-orm";
import { db } from "@db/connection";
import { authenticate, requireManager } from "@middleware/auth";
import { parseBody } from "../dtos";
import { auditLog } from "../all-modules";
import { rows, getStudioSettings, settingsToApi, PLAN_RULES, STUDIO_ONLY } from "./rules";
import {
  ClassError, TZ, ensureSessions, lockSession, bookWithCredit, bookWithMakeup, cancelBooking, cancelSessionByStudio,
  markAttendance, createPause, createSlot, deleteSlot, updateSchedule, expireMakeups,
  scheduleConflict, sessionConflict, toDay,
} from "./classes.service";
import {
  studioSettingsDto, scheduleCreateDto, scheduleUpdateDto, sessionCreateDto, sessionUpdateDto, sessionCancelDto,
  slotCreateDto, bookingCreateDto, extraClassDto, attendanceDto, pauseCreateDto,
} from "./pilates.dto";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const todaySP = sql.raw(`(now() AT TIME ZONE '${TZ}')::date`);

/** Dono, gerente e recepção (inscrever, cancelar, pausar, cancelar aula, trocar instrutor da aula). */
async function requireFrontDesk(req: any, reply: any) {
  if (!["owner", "manager", "receptionist"].includes(req.tenantContext?.role)) {
    return reply.status(403).send({ success: false, error: "Permissao insuficiente", code: "FORBIDDEN" });
  }
}

/** Executa numa transação e traduz ClassError em resposta HTTP. */
async function run(reply: any, fn: (tx: any) => Promise<any>, status = 200) {
  try {
    const data = await db.transaction(fn);
    return reply.status(status).send({ success: true, data });
  } catch (e: any) {
    if (e instanceof ClassError) return reply.status(e.status).send({ success: false, error: e.message, code: e.code });
    if (e?.code === "23505") return reply.status(409).send({ success: false, error: "Registro duplicado", code: "DUPLICATE" });
    throw e;
  }
}

const sessionSelect = sql`
  SELECT ss.id, ss.schedule_id, to_char(ss.session_date, 'YYYY-MM-DD') AS session_date, ss.starts_at, ss.ends_at,
    to_char(ss.starts_at AT TIME ZONE ${TZ}, 'HH24:MI') AS start_local, to_char(ss.ends_at AT TIME ZONE ${TZ}, 'HH24:MI') AS end_local,
    ss.instructor_id, i.full_name AS instructor_name, ss.instructor_overridden, ss.modality_id, m.name AS modality_name,
    ss.room, ss.capacity, ss.class_type, ss.status, ss.cancel_reason, ss.notes,
    ((SELECT count(*) FROM pilates_bookings b WHERE b.session_id = ss.id AND b.status IN ('booked','present','absent','excused'))
     + (SELECT count(*) FROM pilates_enrollment_slots es JOIN pilates_enrollments e ON e.id = es.enrollment_id AND e.status = 'active'
        WHERE ss.schedule_id IS NOT NULL AND es.schedule_id = ss.schedule_id AND ss.session_date >= e.start_date
          AND (e.end_date IS NULL OR ss.session_date <= e.end_date)
          AND NOT EXISTS (SELECT 1 FROM pilates_bookings b2 WHERE b2.session_id = ss.id AND b2.client_id = e.client_id)
          AND NOT EXISTS (SELECT 1 FROM pilates_plan_pauses pp WHERE pp.enrollment_id = e.id AND ss.session_date BETWEEN pp.start_date AND pp.end_date))
    )::int AS taken,
    (ss.status = 'scheduled' AND ss.ends_at < now()
      AND EXISTS (SELECT 1 FROM pilates_bookings b3 WHERE b3.session_id = ss.id AND b3.status = 'booked')) AS pending_attendance
  FROM pilates_class_sessions ss
  JOIN professionals i ON i.id = ss.instructor_id
  LEFT JOIN services m ON m.id = ss.modality_id`;

async function sessionDetail(tenantId: string, id: string) {
  const [s] = rows(await db.execute(sql`${sessionSelect} WHERE ss.id = ${id} AND ss.tenant_id = ${tenantId}`));
  if (!s) return null;
  s.bookings = rows(await db.execute(sql`
    SELECT b.id, b.client_id AS student_id, c.full_name AS student_name, b.kind, b.status, b.credit_consumed,
      b.enrollment_id, pl.name AS plan_name, pp.declared_restrictions,
      b.attendance_marked_at, mb.full_name AS attendance_marked_by_name, b.attendance_updated_at, ub.full_name AS attendance_updated_by_name
    FROM pilates_bookings b
    JOIN clients c ON c.id = b.client_id
    LEFT JOIN pilates_student_profiles pp ON pp.client_id = b.client_id
    LEFT JOIN pilates_enrollments e ON e.id = b.enrollment_id
    LEFT JOIN pilates_plans pl ON pl.id = e.plan_id
    LEFT JOIN user_profiles mb ON mb.auth_user_id = b.attendance_marked_by AND mb.tenant_id = b.tenant_id
    LEFT JOIN user_profiles ub ON ub.auth_user_id = b.attendance_updated_by AND ub.tenant_id = b.tenant_id
    WHERE b.session_id = ${id} ORDER BY c.full_name`));
  return s;
}

async function studentExists(tenantId: string, clientId: string) {
  const [s] = rows(await db.execute(sql`SELECT 1 AS x FROM clients c JOIN pilates_student_profiles p ON p.client_id = c.id
    WHERE c.id = ${clientId} AND c.tenant_id = ${tenantId} AND c.deleted_at IS NULL`));
  return !!s;
}

export async function pilatesClassesModule(fastify: FastifyInstance) {
  // ═══ REGRAS DO STUDIO ═════════════════════════════════════════════════════
  fastify.get("/pilates/settings", { preHandler: [authenticate] }, async (req: any, reply) => {
    return reply.send({ success: true, data: settingsToApi(await getStudioSettings(db, req.tenantContext.tenantId)) });
  });

  fastify.patch("/pilates/settings", { preHandler: [authenticate, requireManager] }, async (req: any, reply) => {
    const { tenantId, userId } = req.tenantContext;
    const body = parseBody(studioSettingsDto, req, reply); if (!body) return;
    const before = settingsToApi(await getStudioSettings(db, tenantId));
    const cols = Object.fromEntries([...PLAN_RULES, ...STUDIO_ONLY]);
    const changed = Object.entries(body).filter(([k, v]) => v !== undefined && before[k] !== v);
    if (changed.length) {
      const sets = changed.map(([k, v]) => sql`${sql.raw(`"${(cols as any)[k]}"`)} = ${v}`);
      await db.execute(sql`UPDATE pilates_settings SET ${sql.join(sets, sql`, `)}, updated_at = now() WHERE tenant_id = ${tenantId}`);
      auditLog({ tenantId, userId, action: "pilates.settings.updated", tableName: "pilates_settings",
        oldData: Object.fromEntries(changed.map(([k]) => [k, before[k]])), newData: Object.fromEntries(changed) });
    }
    return reply.send({ success: true, data: settingsToApi(await getStudioSettings(db, tenantId)) });
  });

  // ═══ GRADE ════════════════════════════════════════════════════════════════
  fastify.get("/pilates/schedules", { preHandler: [authenticate] }, async (req: any, reply) => {
    const { tenantId } = req.tenantContext;
    const data = rows(await db.execute(sql`
      SELECT s.id, s.day_of_week, s.start_time, s.duration_minutes, s.room, s.capacity, s.class_type, s.is_active,
        s.instructor_id, i.full_name AS instructor_name, s.modality_id, m.name AS modality_name, s.owner_enrollment_id,
        (SELECT count(*) FROM pilates_enrollment_slots es JOIN pilates_enrollments e ON e.id = es.enrollment_id
          WHERE es.schedule_id = s.id AND e.status = 'active' AND (e.end_date IS NULL OR e.end_date >= ${todaySP}))::int AS fixed_count
      FROM pilates_class_schedules s JOIN professionals i ON i.id = s.instructor_id LEFT JOIN services m ON m.id = s.modality_id
      WHERE s.tenant_id = ${tenantId} ORDER BY s.is_active DESC, s.day_of_week, s.start_time`));
    return reply.send({ success: true, data });
  });

  fastify.post("/pilates/schedules", { preHandler: [authenticate, requireManager] }, async (req: any, reply) => {
    const { tenantId, userId } = req.tenantContext;
    const body = parseBody(scheduleCreateDto, req, reply); if (!body) return;
    return run(reply, async (tx) => {
      const studio = await getStudioSettings(tx, tenantId);
      const [prof] = rows(await tx.execute(sql`SELECT id FROM professionals WHERE id = ${body.instructorId} AND tenant_id = ${tenantId} AND deleted_at IS NULL`));
      if (!prof) throw new ClassError(404, "NOT_FOUND", "Instrutor nao encontrado");
      if (body.modalityId) {
        const [m] = rows(await tx.execute(sql`SELECT id FROM services WHERE id = ${body.modalityId} AND tenant_id = ${tenantId} AND deleted_at IS NULL`));
        if (!m) throw new ClassError(404, "NOT_FOUND", "Modalidade nao encontrada");
      }
      const duration = body.durationMinutes ?? Number(studio.default_class_duration);
      const clash = await scheduleConflict(tx, tenantId, { instructorId: body.instructorId, dayOfWeek: body.dayOfWeek, startTime: body.startTime, durationMinutes: duration });
      if (clash) throw new ClassError(409, "INSTRUCTOR_CONFLICT", `O instrutor ja tem aula as ${clash.start_time} nesse dia`);
      const [s] = rows(await tx.execute(sql`INSERT INTO pilates_class_schedules (tenant_id, modality_id, instructor_id, day_of_week, start_time,
        duration_minutes, room, capacity, class_type) VALUES (${tenantId}, ${body.modalityId ?? null}, ${body.instructorId}, ${body.dayOfWeek},
        ${body.startTime}, ${duration}, ${body.room ?? null}, ${body.capacity ?? Number(studio.default_class_capacity)}, ${body.classType ?? "group"}) RETURNING id`));
      await ensureSessions(tx, tenantId, s.id);
      auditLog({ tenantId, userId, action: "pilates.schedule.created", tableName: "pilates_class_schedules", recordId: s.id, newData: body });
      return { id: s.id };
    }, 201);
  });

  fastify.patch("/pilates/schedules/:id", { preHandler: [authenticate, requireManager] }, async (req: any, reply) => {
    const { tenantId, userId } = req.tenantContext;
    if (!UUID.test(req.params.id)) return reply.status(404).send({ success: false, error: "Turma nao encontrada", code: "NOT_FOUND" });
    const body = parseBody(scheduleUpdateDto, req, reply); if (!body) return;
    return run(reply, async (tx) => {
      if (body.instructorId) {
        const [p] = rows(await tx.execute(sql`SELECT id FROM professionals WHERE id = ${body.instructorId} AND tenant_id = ${tenantId} AND deleted_at IS NULL`));
        if (!p) throw new ClassError(404, "NOT_FOUND", "Instrutor nao encontrado");
      }
      await updateSchedule(tx, tenantId, req.params.id, body);
      auditLog({ tenantId, userId, action: "pilates.schedule.updated", tableName: "pilates_class_schedules", recordId: req.params.id, newData: body });
      return { id: req.params.id };
    });
  });

  // ═══ AULAS ════════════════════════════════════════════════════════════════
  fastify.get("/pilates/sessions", { preHandler: [authenticate] }, async (req: any, reply) => {
    const { tenantId } = req.tenantContext;
    const { from, to, instructorId } = req.query as any;
    if (!DAY.test(from ?? "") || !DAY.test(to ?? "")) return reply.status(400).send({ success: false, error: "Informe from e to (AAAA-MM-DD)" });
    await ensureSessions(db, tenantId);
    const byInstr = typeof instructorId === "string" && UUID.test(instructorId) ? sql`AND ss.instructor_id = ${instructorId}` : sql``;
    const data = rows(await db.execute(sql`${sessionSelect}
      WHERE ss.tenant_id = ${tenantId} AND ss.session_date BETWEEN ${from}::date AND ${to}::date ${byInstr}
      ORDER BY ss.starts_at`));
    return reply.send({ success: true, data });
  });

  /** "Aulas de hoje" (C7): aulas de hoje + aulas passadas com presença pendente. */
  fastify.get("/pilates/sessions/today", { preHandler: [authenticate] }, async (req: any, reply) => {
    const { tenantId, userId, role } = req.tenantContext;
    await ensureSessions(db, tenantId);
    let own = sql``;
    if (role === "professional") {
      const studio = await getStudioSettings(db, tenantId);
      if (studio.instructor_attendance_scope === "own") {
        own = sql`AND ss.instructor_id IN (SELECT p.id FROM professionals p JOIN user_profiles up ON up.id = p.user_profile_id
          WHERE up.auth_user_id = ${userId} AND p.tenant_id = ${tenantId})`;
      }
    }
    const today = rows(await db.execute(sql`${sessionSelect} WHERE ss.tenant_id = ${tenantId} AND ss.session_date = ${todaySP} ${own} ORDER BY ss.starts_at`));
    const pending = rows(await db.execute(sql`${sessionSelect} WHERE ss.tenant_id = ${tenantId} AND ss.session_date < ${todaySP}
      AND ss.session_date >= ${todaySP} - 14 AND ss.status = 'scheduled' ${own}
      AND EXISTS (SELECT 1 FROM pilates_bookings b WHERE b.session_id = ss.id AND b.status = 'booked') ORDER BY ss.starts_at`));
    return reply.send({ success: true, data: { today, pending } });
  });

  fastify.get("/pilates/sessions/:id", { preHandler: [authenticate] }, async (req: any, reply) => {
    const { tenantId } = req.tenantContext;
    if (!UUID.test(req.params.id)) return reply.status(404).send({ success: false, error: "Aula nao encontrada", code: "NOT_FOUND" });
    const data = await sessionDetail(tenantId, req.params.id);
    if (!data) return reply.status(404).send({ success: false, error: "Aula nao encontrada", code: "NOT_FOUND" });
    return reply.send({ success: true, data });
  });

  /** Aula avulsa sem grade (ex.: avaliação inicial). */
  fastify.post("/pilates/sessions", { preHandler: [authenticate, requireFrontDesk] }, async (req: any, reply) => {
    const { tenantId, userId } = req.tenantContext;
    const body = parseBody(sessionCreateDto, req, reply); if (!body) return;
    return run(reply, async (tx) => {
      const studio = await getStudioSettings(tx, tenantId);
      const [p] = rows(await tx.execute(sql`SELECT id FROM professionals WHERE id = ${body.instructorId} AND tenant_id = ${tenantId} AND deleted_at IS NULL`));
      if (!p) throw new ClassError(404, "NOT_FOUND", "Instrutor nao encontrado");
      const duration = body.durationMinutes ?? Number(studio.default_class_duration);
      const [t] = rows(await tx.execute(sql`SELECT (${body.date}::date + ${body.startTime}::time) AT TIME ZONE ${TZ} AS starts_at`));
      const endsAt = new Date(new Date(t.starts_at).getTime() + duration * 60_000);
      if (await sessionConflict(tx, tenantId, body.instructorId, t.starts_at, endsAt)) throw new ClassError(409, "INSTRUCTOR_CONFLICT", "O instrutor ja tem aula nesse horario");
      const type = body.classType ?? "assessment";
      const cap = body.capacity ?? (type === "group" ? Number(studio.default_class_capacity) : type === "duo" ? 2 : 1);
      const [s] = rows(await tx.execute(sql`INSERT INTO pilates_class_sessions (tenant_id, session_date, starts_at, ends_at, instructor_id, modality_id, room, capacity, class_type, notes)
        VALUES (${tenantId}, ${body.date}, ${t.starts_at}, ${endsAt.toISOString()}, ${body.instructorId}, ${body.modalityId ?? null}, ${body.room ?? null}, ${cap}, ${type}, ${body.notes ?? null}) RETURNING id`));
      auditLog({ tenantId, userId, action: "pilates.session.created", tableName: "pilates_class_sessions", recordId: s.id, newData: body });
      return { id: s.id };
    }, 201);
  });

  /** Nesta aula (uma ocorrência): trocar instrutor, sala ou observação. */
  fastify.patch("/pilates/sessions/:id", { preHandler: [authenticate, requireFrontDesk] }, async (req: any, reply) => {
    const { tenantId, userId } = req.tenantContext;
    if (!UUID.test(req.params.id)) return reply.status(404).send({ success: false, error: "Aula nao encontrada", code: "NOT_FOUND" });
    const body = parseBody(sessionUpdateDto, req, reply); if (!body) return;
    return run(reply, async (tx) => {
      const s = await lockSession(tx, tenantId, req.params.id);
      if (s.status !== "scheduled") throw new ClassError(409, "CLASS_CANCELLED", "Aula cancelada");
      const old: Record<string, any> = {};
      if (body.instructorId && body.instructorId !== s.instructor_id) {
        const [p] = rows(await tx.execute(sql`SELECT id FROM professionals WHERE id = ${body.instructorId} AND tenant_id = ${tenantId} AND deleted_at IS NULL`));
        if (!p) throw new ClassError(404, "NOT_FOUND", "Instrutor nao encontrado");
        if (await sessionConflict(tx, tenantId, body.instructorId, s.starts_at, s.ends_at, s.id)) throw new ClassError(409, "INSTRUCTOR_CONFLICT", "O novo instrutor ja tem aula nesse horario");
        old.instructorId = s.instructor_id;
        await tx.execute(sql`UPDATE pilates_class_sessions SET instructor_id = ${body.instructorId}, instructor_overridden = true, updated_at = now() WHERE id = ${s.id}`);
      }
      if (body.room !== undefined) { old.room = s.room; await tx.execute(sql`UPDATE pilates_class_sessions SET room = ${body.room}, updated_at = now() WHERE id = ${s.id}`); }
      if (body.notes !== undefined) { old.notes = s.notes; await tx.execute(sql`UPDATE pilates_class_sessions SET notes = ${body.notes}, updated_at = now() WHERE id = ${s.id}`); }
      auditLog({ tenantId, userId, action: "pilates.session.updated", tableName: "pilates_class_sessions", recordId: s.id, oldData: old, newData: body });
      return { id: s.id };
    });
  });

  fastify.post("/pilates/sessions/:id/cancel", { preHandler: [authenticate, requireFrontDesk] }, async (req: any, reply) => {
    const { tenantId, userId } = req.tenantContext;
    if (!UUID.test(req.params.id)) return reply.status(404).send({ success: false, error: "Aula nao encontrada", code: "NOT_FOUND" });
    const body = parseBody(sessionCancelDto, req, reply); if (!body) return;
    return run(reply, async (tx) => {
      const r = await cancelSessionByStudio(tx, tenantId, req.params.id, userId, body.reason ?? null);
      auditLog({ tenantId, userId, action: "pilates.session.cancelled_by_studio", tableName: "pilates_class_sessions", recordId: req.params.id, newData: { reason: body.reason, ...r } });
      return r;
    });
  });

  /** "Marcar todos presentes" (C7): só as inscrições ainda sem presença. */
  fastify.post("/pilates/sessions/:id/attendance-all", { preHandler: [authenticate] }, async (req: any, reply) => {
    const { tenantId, userId, role } = req.tenantContext;
    if (!UUID.test(req.params.id)) return reply.status(404).send({ success: false, error: "Aula nao encontrada", code: "NOT_FOUND" });
    return run(reply, async (tx) => {
      const ids = rows(await tx.execute(sql`SELECT id FROM pilates_bookings WHERE session_id = ${req.params.id} AND tenant_id = ${tenantId} AND status = 'booked'`));
      for (const b of ids) await markAttendance(tx, { tenantId, userId, role }, b.id, "present");
      return { marked: ids.length };
    });
  });

  // ═══ HORÁRIOS FIXOS ═══════════════════════════════════════════════════════
  fastify.get("/pilates/slots", { preHandler: [authenticate] }, async (req: any, reply) => {
    const { tenantId } = req.tenantContext;
    const { enrollmentId } = req.query as any;
    if (typeof enrollmentId !== "string" || !UUID.test(enrollmentId)) return reply.send({ success: true, data: [] });
    const data = rows(await db.execute(sql`SELECT es.id, es.schedule_id, s.day_of_week, s.start_time, s.duration_minutes, s.class_type, s.capacity,
        s.owner_enrollment_id IS NOT NULL AS individual, i.full_name AS instructor_name, m.name AS modality_name
      FROM pilates_enrollment_slots es JOIN pilates_class_schedules s ON s.id = es.schedule_id
      JOIN professionals i ON i.id = s.instructor_id LEFT JOIN services m ON m.id = s.modality_id
      WHERE es.tenant_id = ${tenantId} AND es.enrollment_id = ${enrollmentId} ORDER BY s.day_of_week, s.start_time`));
    return reply.send({ success: true, data });
  });

  fastify.post("/pilates/slots", { preHandler: [authenticate, requireFrontDesk] }, async (req: any, reply) => {
    const { tenantId, userId } = req.tenantContext;
    const body = parseBody(slotCreateDto, req, reply); if (!body) return;
    return run(reply, async (tx) => {
      const r = await createSlot(tx, tenantId, body as any);
      auditLog({ tenantId, userId, action: "pilates.slot.created", tableName: "pilates_enrollment_slots", recordId: r.slotId, newData: body });
      return r;
    }, 201);
  });

  fastify.delete("/pilates/slots/:id", { preHandler: [authenticate, requireFrontDesk] }, async (req: any, reply) => {
    const { tenantId, userId } = req.tenantContext;
    if (!UUID.test(req.params.id)) return reply.status(404).send({ success: false, error: "Horario fixo nao encontrado", code: "NOT_FOUND" });
    return run(reply, async (tx) => {
      await deleteSlot(tx, tenantId, req.params.id);
      auditLog({ tenantId, userId, action: "pilates.slot.deleted", tableName: "pilates_enrollment_slots", recordId: req.params.id });
      return { id: req.params.id };
    });
  });

  // ═══ INSCRIÇÕES E PRESENÇA ════════════════════════════════════════════════
  fastify.post("/pilates/bookings", { preHandler: [authenticate, requireFrontDesk] }, async (req: any, reply) => {
    const { tenantId, userId } = req.tenantContext;
    const body = parseBody(bookingCreateDto, req, reply); if (!body) return;
    if (!(await studentExists(tenantId, body.studentId))) return reply.status(404).send({ success: false, error: "Aluno nao encontrado", code: "NOT_FOUND" });
    return run(reply, async (tx) => {
      const id = body.makeupCreditId
        ? await bookWithMakeup(tx, tenantId, { sessionId: body.sessionId, studentId: body.studentId, makeupCreditId: body.makeupCreditId })
        : await bookWithCredit(tx, tenantId, { sessionId: body.sessionId, studentId: body.studentId, enrollmentId: body.enrollmentId! });
      auditLog({ tenantId, userId, action: "pilates.booking.created", tableName: "pilates_bookings", recordId: id, newData: body });
      return { id };
    }, 201);
  });

  /** Aula extra: matrícula avulsa (pacote) + inscrição, numa só transação. */
  fastify.post("/pilates/bookings/extra", { preHandler: [authenticate, requireFrontDesk] }, async (req: any, reply) => {
    const { tenantId, userId } = req.tenantContext;
    const body = parseBody(extraClassDto, req, reply); if (!body) return;
    if (!(await studentExists(tenantId, body.studentId))) return reply.status(404).send({ success: false, error: "Aluno nao encontrado", code: "NOT_FOUND" });
    return run(reply, async (tx) => {
      const session = await lockSession(tx, tenantId, body.sessionId);
      const [plan] = rows(await tx.execute(sql`SELECT * FROM pilates_plans WHERE id = ${body.planId} AND tenant_id = ${tenantId}`));
      if (!plan) throw new ClassError(404, "NOT_FOUND", "Plano nao encontrado");
      if (plan.kind !== "package" || plan.status !== "active") throw new ClassError(400, "NOT_PACKAGE", "Aula extra usa um plano avulso (pacote) ativo");
      const start = toDay(session.session_date)!;
      const [e] = rows(await tx.execute(sql`INSERT INTO pilates_enrollments (tenant_id, client_id, plan_id, start_date, end_date, price)
        VALUES (${tenantId}, ${body.studentId}, ${plan.id}, ${start}::date, ${start}::date + ${Math.max(Number(plan.validity_days) - 1, 0)}::int, ${plan.price}) RETURNING id`));
      const id = await bookWithCredit(tx, tenantId, { sessionId: body.sessionId, studentId: body.studentId, enrollmentId: e.id });
      auditLog({ tenantId, userId, action: "pilates.extra_class.created", tableName: "pilates_bookings", recordId: id, newData: { ...body, enrollmentId: e.id } });
      return { id, enrollmentId: e.id };
    }, 201);
  });

  fastify.post("/pilates/bookings/:id/cancel", { preHandler: [authenticate, requireFrontDesk] }, async (req: any, reply) => {
    const { tenantId, userId } = req.tenantContext;
    if (!UUID.test(req.params.id)) return reply.status(404).send({ success: false, error: "Inscricao nao encontrada", code: "NOT_FOUND" });
    return run(reply, async (tx) => {
      const r = await cancelBooking(tx, tenantId, req.params.id, userId);
      auditLog({ tenantId, userId, action: "pilates.booking.cancelled", tableName: "pilates_bookings", recordId: req.params.id, newData: r });
      return r;
    });
  });

  fastify.post("/pilates/bookings/:id/attendance", { preHandler: [authenticate] }, async (req: any, reply) => {
    const { tenantId, userId, role } = req.tenantContext;
    if (!UUID.test(req.params.id)) return reply.status(404).send({ success: false, error: "Inscricao nao encontrada", code: "NOT_FOUND" });
    const body = parseBody(attendanceDto, req, reply); if (!body) return;
    return run(reply, async (tx) => {
      const r = await markAttendance(tx, { tenantId, userId, role }, req.params.id, body.status);
      if (r.previous) {
        auditLog({ tenantId, userId, action: "pilates.attendance.changed", tableName: "pilates_bookings", recordId: req.params.id,
          oldData: { status: r.previous }, newData: { status: r.status } });
      }
      return r;
    });
  });

  // ═══ REPOSIÇÕES E PAUSAS ══════════════════════════════════════════════════
  fastify.get("/pilates/makeups", { preHandler: [authenticate] }, async (req: any, reply) => {
    const { tenantId } = req.tenantContext;
    const { studentId } = req.query as any;
    if (typeof studentId !== "string" || !UUID.test(studentId)) return reply.send({ success: true, data: [] });
    await expireMakeups(db, tenantId);
    const data = rows(await db.execute(sql`SELECT mc.id, mc.reason, mc.status, to_char(mc.expires_on, 'YYYY-MM-DD') AS expires_on,
        mc.created_at, mc.used_at, mc.enrollment_id, pl.name AS plan_name, to_char(us.session_date, 'YYYY-MM-DD') AS used_on
      FROM pilates_makeup_credits mc LEFT JOIN pilates_enrollments e ON e.id = mc.enrollment_id LEFT JOIN pilates_plans pl ON pl.id = e.plan_id
      LEFT JOIN pilates_bookings ub ON ub.id = mc.used_booking_id LEFT JOIN pilates_class_sessions us ON us.id = ub.session_id
      WHERE mc.tenant_id = ${tenantId} AND mc.client_id = ${studentId} ORDER BY mc.created_at DESC`));
    return reply.send({ success: true, data });
  });

  fastify.get("/pilates/pauses", { preHandler: [authenticate] }, async (req: any, reply) => {
    const { tenantId } = req.tenantContext;
    const { enrollmentId } = req.query as any;
    if (typeof enrollmentId !== "string" || !UUID.test(enrollmentId)) return reply.send({ success: true, data: [] });
    const data = rows(await db.execute(sql`SELECT id, to_char(start_date, 'YYYY-MM-DD') AS start_date, to_char(end_date, 'YYYY-MM-DD') AS end_date,
      days, reason, created_at FROM pilates_plan_pauses WHERE tenant_id = ${tenantId} AND enrollment_id = ${enrollmentId} ORDER BY start_date`));
    return reply.send({ success: true, data });
  });

  fastify.post("/pilates/pauses", { preHandler: [authenticate, requireFrontDesk] }, async (req: any, reply) => {
    const { tenantId, userId } = req.tenantContext;
    const body = parseBody(pauseCreateDto, req, reply); if (!body) return;
    return run(reply, async (tx) => {
      const r = await createPause(tx, tenantId, userId, { enrollmentId: body.enrollmentId, startDate: body.startDate, endDate: body.endDate, reason: body.reason ?? null });
      auditLog({ tenantId, userId, action: "pilates.pause.created", tableName: "pilates_plan_pauses", recordId: r.id, newData: { ...body, ...r } });
      return r;
    }, 201);
  });

}
