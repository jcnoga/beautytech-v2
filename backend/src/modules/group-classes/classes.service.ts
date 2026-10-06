// Aulas em turma, Fase 3: regras de negócio das aulas (sem HTTP). Usado por classes.routes.ts.
//
// TRAVAS (C4): toda operação que ocupa vaga trava SEMPRE nesta ordem:
//   1) a linha da grade (class_schedules)  — se a aula vier de uma grade;
//   2) a(s) linha(s) da aula (class_sessions), por data;
//   3) a matrícula (membership_enrollments) e a reposição (class_makeup_credits), quando houver.
// Com a mesma ordem em todo lugar, dois cliques ao mesmo tempo nunca passam da capacidade e não há deadlock.
//
// VAGAS OCUPADAS de uma aula = inscrições ativas (inscrito/presente/falta/falta justificada)
//   + horários fixos que ainda não viraram inscrição naquela data (matrícula ativa cobrindo a data,
//     fora de pausa) — assim um pacote não "rouba" a vaga de um fixo em datas além das 4 semanas geradas.
// Pausa (C6): a inscrição fixa do período vira "pausado" e a vaga fica livre; depois da pausa volta.
// Horários: grade em HH:MM de Brasília; conversão sempre com o fuso America/Sao_Paulo.
import { sql } from "drizzle-orm";
import { type Exec, rows, getStudioSettings, rulesForEnrollment } from "./rules";

export const TZ = "America/Sao_Paulo";
export const WINDOW_DAYS = 28; // gera aulas para as próximas 4 semanas
export const OCCUPYING = ["booked", "present", "absent", "excused"] as const;

export class ClassError extends Error {
  /** details: dados extras devolvidos em "data" na resposta de erro (ex.: o cliente duplicado). */
  constructor(public status: number, public code: string, message: string, public details?: unknown) { super(message); }
}
const fail = (status: number, code: string, message: string): never => { throw new ClassError(status, code, message); };

const occupying = sql.raw(`('booked','present','absent','excused')`);
const todaySP = sql.raw(`(now() AT TIME ZONE '${TZ}')::date`);

/**
 * Vagas ocupadas de uma aula (alias ss = class_sessions), em SQL: inscrições ativas + horários fixos que ainda não
 * viraram inscrição naquela data (fora de pausa). Mesma regra de seatsTaken; usada nas listas de aulas e no painel.
 */
export const sessionTakenSql = sql`((SELECT count(*) FROM class_bookings b WHERE b.session_id = ss.id AND b.status IN ('booked','present','absent','excused'))
     + (SELECT count(*) FROM class_enrollment_slots es JOIN membership_enrollments e ON e.id = es.enrollment_id AND e.status = 'active'
        WHERE ss.schedule_id IS NOT NULL AND es.schedule_id = ss.schedule_id AND ss.session_date >= e.start_date
          AND (e.end_date IS NULL OR ss.session_date <= e.end_date)
          AND NOT EXISTS (SELECT 1 FROM class_bookings b2 WHERE b2.session_id = ss.id AND b2.client_id = e.client_id)
          AND NOT EXISTS (SELECT 1 FROM membership_pauses pp WHERE pp.enrollment_id = e.id AND ss.session_date BETWEEN pp.start_date AND pp.end_date))
    )::int`;

// ─── geração ────────────────────────────────────────────────────────────────
/** Gera (sem duplicar) as aulas das próximas 4 semanas de todas as turmas ativas e materializa os fixos. */
export async function ensureSessions(exec: Exec, tenantId: string, scheduleId?: string) {
  const only = scheduleId ? sql`AND s.id = ${scheduleId}` : sql``;
  await exec.execute(sql`
    INSERT INTO class_sessions (tenant_id, schedule_id, session_date, starts_at, ends_at,
      instructor_id, modality_id, room, capacity, class_type)
    SELECT s.tenant_id, s.id, d::date,
      (d::date + s.start_time::time) AT TIME ZONE ${TZ},
      ((d::date + s.start_time::time) AT TIME ZONE ${TZ}) + make_interval(mins => s.duration_minutes),
      s.instructor_id, s.modality_id, s.room, s.capacity, s.class_type
    FROM class_schedules s
    CROSS JOIN LATERAL generate_series(${todaySP}, ${todaySP} + ${WINDOW_DAYS - 1}::int, interval '1 day') AS d
    WHERE s.tenant_id = ${tenantId} AND s.is_active ${only}
      AND EXTRACT(DOW FROM d) = s.day_of_week
      AND ((d::date + s.start_time::time) AT TIME ZONE ${TZ}) > now()
    ON CONFLICT (schedule_id, session_date) DO NOTHING`);
  await materializeFixed(exec, tenantId);
}

/** Cria as inscrições fixas nas aulas futuras geradas (até o fim da matrícula; na pausa = "pausado"). */
export async function materializeFixed(exec: Exec, tenantId: string) {
  await exec.execute(sql`
    INSERT INTO class_bookings (tenant_id, session_id, client_id, enrollment_id, kind, status)
    SELECT ss.tenant_id, ss.id, e.client_id, e.id, 'fixed',
      CASE WHEN EXISTS (SELECT 1 FROM membership_pauses pp WHERE pp.enrollment_id = e.id
        AND ss.session_date BETWEEN pp.start_date AND pp.end_date) THEN 'paused' ELSE 'booked' END
    FROM class_enrollment_slots es
    JOIN membership_enrollments e ON e.id = es.enrollment_id AND e.status = 'active'
    JOIN class_sessions ss ON ss.schedule_id = es.schedule_id AND ss.status = 'scheduled' AND ss.starts_at > now()
      AND ss.session_date >= e.start_date AND (e.end_date IS NULL OR ss.session_date <= e.end_date)
    WHERE es.tenant_id = ${tenantId}
    ON CONFLICT (session_id, client_id) DO NOTHING`);
}

/** Tira inscrições fixas futuras ainda sem presença que não valem mais (matrícula encerrada, fim antecipado, horário removido). */
export async function pruneFixed(exec: Exec, tenantId: string, enrollmentId: string) {
  await exec.execute(sql`
    DELETE FROM class_bookings b USING class_sessions ss, membership_enrollments e
    WHERE b.session_id = ss.id AND e.id = b.enrollment_id AND b.tenant_id = ${tenantId} AND b.enrollment_id = ${enrollmentId}
      AND b.kind = 'fixed' AND b.status IN ('booked', 'paused') AND ss.starts_at > now()
      AND (e.status <> 'active' OR (e.end_date IS NOT NULL AND ss.session_date > e.end_date)
        OR NOT EXISTS (SELECT 1 FROM class_enrollment_slots es WHERE es.enrollment_id = e.id AND es.schedule_id = ss.schedule_id))`);
}

// ─── vagas e travas ─────────────────────────────────────────────────────────
/** Vagas ocupadas numa aula (ver cabeçalho). */
export async function seatsTaken(exec: Exec, s: { id: string; schedule_id: string | null; session_date: any }) {
  const date = toDay(s.session_date);
  const [r] = rows(await exec.execute(sql`
    SELECT (SELECT count(*) FROM class_bookings b WHERE b.session_id = ${s.id} AND b.status IN ${occupying})::int
      + (SELECT count(*) FROM class_enrollment_slots es
          JOIN membership_enrollments e ON e.id = es.enrollment_id AND e.status = 'active'
          WHERE ${s.schedule_id}::uuid IS NOT NULL AND es.schedule_id = ${s.schedule_id}::uuid
            AND ${date}::date >= e.start_date AND (e.end_date IS NULL OR ${date}::date <= e.end_date)
            AND NOT EXISTS (SELECT 1 FROM class_bookings b2 WHERE b2.session_id = ${s.id} AND b2.client_id = e.client_id)
            AND NOT EXISTS (SELECT 1 FROM membership_pauses pp WHERE pp.enrollment_id = e.id AND ${date}::date BETWEEN pp.start_date AND pp.end_date)
        )::int AS taken`));
  return Number(r.taken);
}

/** Trava grade (se houver) e depois a aula, nessa ordem. Devolve a aula travada. */
export async function lockSession(tx: Exec, tenantId: string, sessionId: string) {
  const [peek] = rows(await tx.execute(sql`SELECT schedule_id FROM class_sessions WHERE id = ${sessionId} AND tenant_id = ${tenantId}`));
  if (!peek) fail(404, "NOT_FOUND", "Aula não encontrada");
  if (peek.schedule_id) await tx.execute(sql`SELECT id FROM class_schedules WHERE id = ${peek.schedule_id} FOR UPDATE`);
  const [s] = rows(await tx.execute(sql`SELECT * FROM class_sessions WHERE id = ${sessionId} AND tenant_id = ${tenantId} FOR UPDATE`));
  return s;
}

/** Ocupa uma vaga (dentro da transação, com a aula já travada). Reaproveita a linha se o aluno já esteve inscrito e cancelou. */
async function takeSeat(tx: Exec, tenantId: string, session: any, clientId: string, fields: { kind: string; enrollmentId: string | null; makeupCreditId?: string | null }) {
  if (session.status !== "scheduled") fail(409, "CLASS_CANCELLED", "Esta aula foi cancelada");
  if (new Date(session.ends_at) <= new Date()) fail(409, "CLASS_ENDED", "Esta aula já terminou");
  const [existing] = rows(await tx.execute(sql`SELECT id, status FROM class_bookings WHERE session_id = ${session.id} AND client_id = ${clientId}`));
  if (existing && (OCCUPYING as readonly string[]).includes(existing.status)) fail(409, "ALREADY_BOOKED", "O aluno já está inscrito nesta aula");
  const taken = await seatsTaken(tx, session);
  if (taken >= session.capacity) fail(409, "CLASS_FULL", "Turma lotada");
  if (existing) {
    await tx.execute(sql`UPDATE class_bookings SET kind = ${fields.kind}, enrollment_id = ${fields.enrollmentId}, makeup_credit_id = ${fields.makeupCreditId ?? null},
      status = 'booked', credit_consumed = false, attendance_marked_by = NULL, attendance_marked_at = NULL, attendance_updated_by = NULL,
      attendance_updated_at = NULL, cancelled_by = NULL, cancelled_at = NULL, updated_at = now() WHERE id = ${existing.id}`);
    return existing.id as string;
  }
  const [b] = rows(await tx.execute(sql`INSERT INTO class_bookings (tenant_id, session_id, client_id, enrollment_id, kind, makeup_credit_id)
    VALUES (${tenantId}, ${session.id}, ${clientId}, ${fields.enrollmentId}, ${fields.kind}, ${fields.makeupCreditId ?? null}) RETURNING id`));
  return b.id as string;
}

// ─── créditos (pacote) ──────────────────────────────────────────────────────
export async function creditUsage(exec: Exec, enrollmentId: string) {
  const [r] = rows(await exec.execute(sql`
    SELECT p.total_classes AS total,
      (SELECT count(*) FROM class_bookings b WHERE b.enrollment_id = e.id AND b.credit_consumed)::int AS consumed,
      (SELECT count(*) FROM class_bookings b WHERE b.enrollment_id = e.id AND b.kind = 'credit' AND b.status = 'booked')::int AS reserved
    FROM membership_enrollments e JOIN membership_plans p ON p.id = e.plan_id WHERE e.id = ${enrollmentId}`));
  const total = Number(r?.total ?? 0), consumed = Number(r?.consumed ?? 0), reserved = Number(r?.reserved ?? 0);
  return { total, consumed, reserved, remaining: Math.max(total - consumed - reserved, 0) };
}

/** Inscrição com crédito de pacote (inclui aula experimental e aula extra). Chamar DENTRO de transação. */
export async function bookWithCredit(tx: Exec, tenantId: string, a: { sessionId: string; studentId: string; enrollmentId: string }) {
  const session = await lockSession(tx, tenantId, a.sessionId);
  const [e] = rows(await tx.execute(sql`SELECT e.*, p.kind AS plan_kind FROM membership_enrollments e JOIN membership_plans p ON p.id = e.plan_id
    WHERE e.id = ${a.enrollmentId} AND e.tenant_id = ${tenantId} FOR UPDATE OF e`));
  if (!e || e.client_id !== a.studentId) fail(404, "NOT_FOUND", "Matrícula não encontrada");
  if (e.status !== "active") fail(409, "ENROLLMENT_INACTIVE", "A matrícula não está ativa");
  if (e.plan_kind !== "package") fail(400, "NOT_PACKAGE", "Plano por frequência usa horário fixo; para uma aula a mais, use Aula extra");
  const date = toDay(session.session_date)!;
  if (date < toDay(e.start_date)! || (e.end_date && date > toDay(e.end_date)!)) fail(409, "OUT_OF_VALIDITY", "A aula está fora da validade do pacote");
  const usage = await creditUsage(tx, e.id);
  if (usage.remaining <= 0) fail(409, "NO_CREDITS", "Este pacote não tem créditos livres");
  return takeSeat(tx, tenantId, session, a.studentId, { kind: "credit", enrollmentId: e.id });
}

/** Inscrição usando uma reposição (C5). Chamar DENTRO de transação. */
export async function bookWithMakeup(tx: Exec, tenantId: string, a: { sessionId: string; studentId: string; makeupCreditId: string }) {
  const session = await lockSession(tx, tenantId, a.sessionId);
  await expireMakeups(tx, tenantId);
  const [m] = rows(await tx.execute(sql`SELECT * FROM class_makeup_credits WHERE id = ${a.makeupCreditId} AND tenant_id = ${tenantId} FOR UPDATE`));
  if (!m || m.client_id !== a.studentId) fail(404, "NOT_FOUND", "Reposição não encontrada");
  if (m.status !== "available") fail(409, "MAKEUP_UNAVAILABLE", "Esta reposição já foi usada ou venceu");
  const date = toDay(session.session_date)!;
  if (date > toDay(m.expires_on)!) fail(409, "MAKEUP_EXPIRED", "A aula é depois do vencimento da reposição");
  const { rules } = await rulesForEnrollment(tx, tenantId, m.enrollment_id);
  if (m.enrollment_id) {
    const [e] = rows(await tx.execute(sql`SELECT status, start_date, end_date FROM membership_enrollments WHERE id = ${m.enrollment_id}`));
    if (!e || e.status !== "active" || date < toDay(e.start_date)! || (e.end_date && date > toDay(e.end_date)!)) {
      fail(409, "OUT_OF_VALIDITY", "Reposição só dentro da vigência do plano");
    }
  }
  if (rules.makeupMonthlyLimitEnabled) {
    const [c] = rows(await tx.execute(sql`SELECT count(*)::int AS n FROM class_bookings b JOIN class_sessions ss ON ss.id = b.session_id
      WHERE b.tenant_id = ${tenantId} AND b.client_id = ${a.studentId} AND b.kind = 'makeup' AND b.status IN ${occupying}
        AND date_trunc('month', ss.session_date) = date_trunc('month', ${date}::date)`));
    if (Number(c.n) >= rules.makeupMaxPerMonth) fail(409, "MAKEUP_MONTHLY_LIMIT", `Limite de ${rules.makeupMaxPerMonth} reposições no mês atingido`);
  }
  const bookingId = await takeSeat(tx, tenantId, session, a.studentId, { kind: "makeup", enrollmentId: m.enrollment_id, makeupCreditId: m.id });
  await tx.execute(sql`UPDATE class_makeup_credits SET status = 'used', used_booking_id = ${bookingId}, used_at = now() WHERE id = ${m.id}`);
  return bookingId;
}

/** De onde veio a regra aplicada: exceção do plano ou padrão do studio (vai para o histórico do aluno). */
export const ruleSource = (rules: { fromPlan: string[] }, key: string) => (rules.fromPlan.includes(key) ? "plan" : "studio");

// ─── reposições ─────────────────────────────────────────────────────────────
export async function expireMakeups(exec: Exec, tenantId: string) {
  await exec.execute(sql`UPDATE class_makeup_credits SET status = 'expired'
    WHERE tenant_id = ${tenantId} AND status = 'available' AND expires_on < ${todaySP}`);
}

async function createMakeup(tx: Exec, tenantId: string, b: any, reason: string, validityDays: number, source: string) {
  await tx.execute(sql`INSERT INTO class_makeup_credits (tenant_id, client_id, enrollment_id, origin_booking_id, reason, expires_on, rule_source)
    VALUES (${tenantId}, ${b.client_id}, ${b.enrollment_id}, ${b.id}, ${reason}, ${todaySP} + ${validityDays}::int, ${source})`);
}

/** Desfaz a reposição gerada por uma inscrição (ao mudar a presença). Recusa se já foi usada. */
async function undoGeneratedMakeup(tx: Exec, bookingId: string) {
  const gen = rows(await tx.execute(sql`SELECT id, status FROM class_makeup_credits WHERE origin_booking_id = ${bookingId}
    AND reason IN ('excused_absence', 'unexcused_absence') FOR UPDATE`));
  if (gen.some((g) => g.status === "used")) fail(409, "MAKEUP_ALREADY_USED", "A reposição gerada por esta falta já foi usada; não dá para mudar a presença");
  if (gen.length) await tx.execute(sql`DELETE FROM class_makeup_credits WHERE origin_booking_id = ${bookingId} AND reason IN ('excused_absence', 'unexcused_absence')`);
}

// ─── cancelamento pelo aluno (lançado pela equipe) ──────────────────────────
export async function cancelBooking(tx: Exec, tenantId: string, bookingId: string, userId: string) {
  const [b] = rows(await tx.execute(sql`SELECT b.*, ss.starts_at FROM class_bookings b JOIN class_sessions ss ON ss.id = b.session_id
    WHERE b.id = ${bookingId} AND b.tenant_id = ${tenantId} FOR UPDATE OF b`));
  if (!b) fail(404, "NOT_FOUND", "Inscrição não encontrada");
  if (b.status !== "booked") fail(409, "NOT_CANCELLABLE", "Só dá para cancelar uma inscrição que ainda não aconteceu");
  if (new Date(b.starts_at) <= new Date()) fail(409, "CLASS_STARTED", "A aula já começou; lance a presença");
  const { rules } = await rulesForEnrollment(tx, tenantId, b.enrollment_id);
  const hoursBefore = (new Date(b.starts_at).getTime() - Date.now()) / 3_600_000;
  const timely = !rules.cancelDeadlineEnabled || hoursBefore >= rules.cancelMinHours;
  let consumed = false;
  if (b.kind === "credit") consumed = !timely && rules.lateCancelConsumesCredit;
  const makeup = b.kind === "fixed" && timely && rules.makeupEnabled && rules.timelyCancelGeneratesMakeup;
  const source = ruleSource(rules, makeup ? "timelyCancelGeneratesMakeup" : timely ? "cancelMinHours" : "lateCancelConsumesCredit");
  await tx.execute(sql`UPDATE class_bookings SET status = ${timely ? "cancelled" : "cancelled_late"}, credit_consumed = ${consumed},
    cancelled_by = ${userId}, cancelled_at = now(), effect_reason = ${timely ? "timely_cancel" : "late_cancel"},
    effect_rule_source = ${source}, effect_at = now(), updated_at = now() WHERE id = ${b.id}`);
  if (makeup) await createMakeup(tx, tenantId, b, "timely_cancel", rules.makeupValidityDays, source);
  if (b.kind === "makeup" && timely && b.makeup_credit_id) {
    await tx.execute(sql`UPDATE class_makeup_credits SET status = 'available', used_booking_id = NULL, used_at = NULL WHERE id = ${b.makeup_credit_id}`);
  }
  return { timely, creditConsumed: consumed, makeupGenerated: makeup, kind: b.kind, hoursBefore: Math.round(hoursBefore * 10) / 10,
    cancelMinHours: rules.cancelDeadlineEnabled ? rules.cancelMinHours : 0 };
}

// ─── cancelamento pelo studio ───────────────────────────────────────────────
export async function cancelSessionByStudio(tx: Exec, tenantId: string, sessionId: string, userId: string, reason: string | null) {
  const session = await lockSession(tx, tenantId, sessionId);
  if (session.status === "cancelled") fail(409, "CLASS_CANCELLED", "Esta aula já foi cancelada");
  const [marked] = rows(await tx.execute(sql`SELECT count(*)::int AS n FROM class_bookings WHERE session_id = ${sessionId} AND status IN ('present','absent','excused')`));
  if (Number(marked.n) > 0) fail(409, "ATTENDANCE_MARKED", "Esta aula já tem presença lançada; não dá para cancelar");
  const list = rows(await tx.execute(sql`SELECT * FROM class_bookings WHERE session_id = ${sessionId} AND status = 'booked' FOR UPDATE`));
  const result = { refunded: 0, makeups: 0, effects: [] as { bookingId: string; studentId: string; kind: string; effect: string }[] };
  for (const b of list) {
    const { rules } = await rulesForEnrollment(tx, tenantId, b.enrollment_id);
    const source = ruleSource(rules, "studioCancelAction");
    let consumed = false, effect = "none";
    if (b.kind === "makeup" && b.makeup_credit_id) {
      await tx.execute(sql`UPDATE class_makeup_credits SET status = 'available', used_booking_id = NULL, used_at = NULL WHERE id = ${b.makeup_credit_id}`);
      effect = "makeup_returned";
    } else if (rules.studioCancelAction === "generate_makeup" && rules.makeupEnabled) {
      if (b.kind === "credit") consumed = true; // o crédito vira a reposição
      await createMakeup(tx, tenantId, b, "studio_cancel", rules.makeupValidityDays, source); result.makeups++; effect = "makeup";
    } else if (b.kind === "credit") { result.refunded++; effect = "refund"; }
    result.effects.push({ bookingId: b.id, studentId: b.client_id, kind: b.kind, effect });
    await tx.execute(sql`UPDATE class_bookings SET status = 'cancelled_studio', credit_consumed = ${consumed}, cancelled_by = ${userId},
      cancelled_at = now(), effect_reason = 'studio_cancel', effect_rule_source = ${source}, effect_at = now(), updated_at = now() WHERE id = ${b.id}`);
  }
  await tx.execute(sql`UPDATE class_sessions SET status = 'cancelled', cancel_reason = ${reason}, cancelled_at = now(),
    cancelled_by = ${userId}, updated_at = now() WHERE id = ${sessionId}`);
  return result;
}

// ─── presença ───────────────────────────────────────────────────────────────
export type Actor = { tenantId: string; userId: string; role: string };

/** Confere quem pode lançar presença nesta aula (regra 4). Devolve o motivo da recusa ou null. */
export async function attendanceDenied(exec: Exec, actor: Actor, session: any): Promise<string | null> {
  if (["owner", "manager", "receptionist"].includes(actor.role)) return null;
  if (actor.role !== "professional") return "Seu perfil não lança presença";
  const studio = await getStudioSettings(exec, actor.tenantId);
  const [me] = rows(await exec.execute(sql`SELECT p.id FROM professionals p JOIN user_profiles up ON up.id = p.user_profile_id
    WHERE up.auth_user_id = ${actor.userId} AND p.tenant_id = ${actor.tenantId} AND p.deleted_at IS NULL LIMIT 1`));
  if (studio.instructor_attendance_scope === "own" && (!me || me.id !== session.instructor_id)) return "O instrutor só lança presença nas próprias aulas";
  const limit = new Date(session.ends_at).getTime() + Number(studio.instructor_edit_window_hours) * 3_600_000;
  if (Date.now() > limit) return `O prazo de ${studio.instructor_edit_window_hours} h depois da aula terminou; peça ao dono ou gerente`;
  return null;
}

export async function markAttendance(tx: Exec, actor: Actor, bookingId: string, status: "present" | "absent" | "excused") {
  const [b] = rows(await tx.execute(sql`SELECT * FROM class_bookings WHERE id = ${bookingId} AND tenant_id = ${actor.tenantId} FOR UPDATE`));
  if (!b) fail(404, "NOT_FOUND", "Inscrição não encontrada");
  if (!(OCCUPYING as readonly string[]).includes(b.status)) fail(409, "NOT_ATTENDABLE", "Esta inscrição foi cancelada ou está pausada");
  const [session] = rows(await tx.execute(sql`SELECT * FROM class_sessions WHERE id = ${b.session_id}`));
  if (session.status !== "scheduled") fail(409, "CLASS_CANCELLED", "Esta aula foi cancelada");
  if (new Date(session.starts_at).getTime() - Date.now() > 3_600_000) fail(400, "TOO_EARLY", "A aula ainda não começou");
  const denied = await attendanceDenied(tx, actor, session);
  if (denied) fail(403, "ATTENDANCE_NOT_ALLOWED", denied);

  const previous = b.status;
  if (previous !== "booked") await undoGeneratedMakeup(tx, b.id);
  const { rules } = await rulesForEnrollment(tx, actor.tenantId, b.enrollment_id);
  let consumed = false;
  if (b.kind === "credit") {
    consumed = status === "present" || (status === "absent" && rules.unexcusedAbsenceConsumesCredit)
      || (status === "excused" && rules.excusedAbsenceConsumesCredit);
  }
  const first = !b.attendance_marked_at;
  const reason = status === "present" ? "present" : status === "absent" ? "unexcused_absence" : "excused_absence";
  const ruleKey = b.kind === "credit"
    ? (status === "absent" ? "unexcusedAbsenceConsumesCredit" : status === "excused" ? "excusedAbsenceConsumesCredit" : null)
    : (status === "absent" ? "unexcusedAbsenceGeneratesMakeup" : status === "excused" ? "excusedAbsenceGeneratesMakeup" : null);
  const source = ruleKey ? ruleSource(rules, ruleKey) : null;
  await tx.execute(sql`UPDATE class_bookings SET status = ${status}, credit_consumed = ${consumed},
    effect_reason = ${reason}, effect_rule_source = ${source}, effect_at = now(),
    attendance_marked_by = COALESCE(attendance_marked_by, ${actor.userId}), attendance_marked_at = COALESCE(attendance_marked_at, now()),
    attendance_updated_by = ${first ? null : actor.userId}, attendance_updated_at = ${first ? null : sql`now()`}, updated_at = now()
    WHERE id = ${b.id}`);
  // Reposição por falta: no fixo (frequência) conforme a regra; no pacote só se o crédito foi descontado
  // (se não descontou, o próprio crédito já é a compensação — não dá as duas coisas).
  let makeup = false;
  if (b.kind !== "makeup" && (b.kind !== "credit" || consumed) && rules.makeupEnabled
    && ((status === "absent" && rules.unexcusedAbsenceGeneratesMakeup) || (status === "excused" && rules.excusedAbsenceGeneratesMakeup))) {
    await createMakeup(tx, actor.tenantId, b, status === "absent" ? "unexcused_absence" : "excused_absence", rules.makeupValidityDays,
      ruleSource(rules, status === "absent" ? "unexcusedAbsenceGeneratesMakeup" : "excusedAbsenceGeneratesMakeup"));
    makeup = true;
  }
  return { previous: first ? null : previous, status, creditConsumed: consumed, makeupGenerated: makeup, kind: b.kind, studentId: b.client_id };
}

// ─── pausa (C6) ─────────────────────────────────────────────────────────────
export async function createPause(tx: Exec, tenantId: string, userId: string, a: { enrollmentId: string; startDate: string; endDate: string; reason: string | null }) {
  const [e] = rows(await tx.execute(sql`SELECT * FROM membership_enrollments WHERE id = ${a.enrollmentId} AND tenant_id = ${tenantId} FOR UPDATE`));
  if (!e) fail(404, "NOT_FOUND", "Matrícula não encontrada");
  if (e.status !== "active") fail(409, "ENROLLMENT_INACTIVE", "A matrícula não está ativa");
  if (a.endDate < a.startDate) fail(400, "INVALID_DATES", "O fim é antes do início");
  const [t] = rows(await tx.execute(sql`SELECT ${todaySP} AS today`));
  if (a.startDate < toDay(t.today)!) fail(400, "INVALID_DATES", "A pausa não pode começar no passado");
  if (a.startDate < toDay(e.start_date)! || (e.end_date && a.startDate > toDay(e.end_date)!)) fail(400, "INVALID_DATES", "A pausa precisa começar dentro da vigência");
  const { rules } = await rulesForEnrollment(tx, tenantId, e.id);
  if (!rules.pauseEnabled) fail(409, "PAUSE_DISABLED", "A pausa está desligada para este plano");
  const days = Math.round((parseDay(a.endDate) - parseDay(a.startDate)) / 86_400_000) + 1;
  const [used] = rows(await tx.execute(sql`SELECT COALESCE(sum(days), 0)::int AS n FROM membership_pauses WHERE enrollment_id = ${e.id}`));
  if (Number(used.n) + days > rules.pauseMaxDays) fail(409, "PAUSE_LIMIT", `Máximo de ${rules.pauseMaxDays} dias de pausa nesta vigência (já usados: ${used.n})`);
  const [overlap] = rows(await tx.execute(sql`SELECT count(*)::int AS n FROM membership_pauses WHERE enrollment_id = ${e.id}
    AND start_date <= ${a.endDate}::date AND end_date >= ${a.startDate}::date`));
  if (Number(overlap.n) > 0) fail(409, "PAUSE_OVERLAP", "Já existe uma pausa nesse período");
  const [p] = rows(await tx.execute(sql`INSERT INTO membership_pauses (tenant_id, enrollment_id, start_date, end_date, days, reason, created_by)
    VALUES (${tenantId}, ${e.id}, ${a.startDate}, ${a.endDate}, ${days}, ${a.reason}, ${userId}) RETURNING id`));
  // Inscrições fixas do período: vaga liberada (não gera reposição).
  await tx.execute(sql`UPDATE class_bookings b SET status = 'paused', updated_at = now() FROM class_sessions ss
    WHERE b.session_id = ss.id AND b.enrollment_id = ${e.id} AND b.kind = 'fixed' AND b.status = 'booked'
      AND ss.session_date BETWEEN ${a.startDate}::date AND ${a.endDate}::date`);
  // Estende a vigência pelos dias pausados.
  const [upd] = rows(await tx.execute(sql`UPDATE membership_enrollments SET end_date = CASE WHEN end_date IS NULL THEN NULL ELSE end_date + ${days}::int END,
    updated_at = now() WHERE id = ${e.id} RETURNING end_date`));
  await materializeFixed(tx, tenantId);
  return { id: p.id, days, newEndDate: toDay(upd.end_date) };
}

// ─── conflitos de instrutor ─────────────────────────────────────────────────
const toMin = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

/** Outra turma ativa do mesmo instrutor no mesmo dia com horário que se sobrepõe? */
export async function scheduleConflict(exec: Exec, tenantId: string, a: { instructorId: string; dayOfWeek: number; startTime: string; durationMinutes: number; exceptId?: string }) {
  const start = toMin(a.startTime), end = start + a.durationMinutes;
  const list = rows(await exec.execute(sql`SELECT id, start_time, duration_minutes FROM class_schedules
    WHERE tenant_id = ${tenantId} AND instructor_id = ${a.instructorId} AND day_of_week = ${a.dayOfWeek} AND is_active
      AND id <> ${a.exceptId ?? "00000000-0000-0000-0000-000000000000"}`));
  return list.find((s) => { const s0 = toMin(s.start_time); return s0 < end && start < s0 + Number(s.duration_minutes); }) ?? null;
}

/** Outra aula (ocorrência) do instrutor que se sobrepõe a [startsAt, endsAt)? */
export async function sessionConflict(exec: Exec, tenantId: string, instructorId: string, startsAt: string | Date, endsAt: string | Date, exceptId?: string) {
  const [c] = rows(await exec.execute(sql`SELECT id FROM class_sessions WHERE tenant_id = ${tenantId} AND instructor_id = ${instructorId}
    AND status = 'scheduled' AND id <> ${exceptId ?? "00000000-0000-0000-0000-000000000000"}
    AND starts_at < ${new Date(endsAt).toISOString()}::timestamptz AND ends_at > ${new Date(startsAt).toISOString()}::timestamptz LIMIT 1`));
  return c ?? null;
}

/** Aviso (não bloqueia): horário fora da jornada do instrutor. */
export async function outsideWorkingHours(exec: Exec, instructorId: string, dayOfWeek: number, startTime: string, durationMinutes: number) {
  const [w] = rows(await exec.execute(sql`SELECT is_working, start_time, end_time FROM professional_schedules
    WHERE professional_id = ${instructorId} AND day_of_week = ${dayOfWeek}`));
  if (!w) return false;
  const start = toMin(startTime), end = start + durationMinutes;
  return !w.is_working || start < toMin(w.start_time) || end > toMin(w.end_time);
}

// ─── datas ──────────────────────────────────────────────────────────────────
export function toDay(v: any): string | null {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).slice(0, 10);
}
const parseDay = (s: string) => { const [y, m, d] = s.split("-").map(Number); return Date.UTC(y, m - 1, d); };
const fmt = (d: string) => d.split("-").reverse().join("/");

// ─── horário fixo (C2) ──────────────────────────────────────────────────────
/** Trava a grade e depois as aulas futuras dela (por data). */
async function lockScheduleAndSessions(tx: Exec, tenantId: string, scheduleId: string) {
  const [s] = rows(await tx.execute(sql`SELECT * FROM class_schedules WHERE id = ${scheduleId} AND tenant_id = ${tenantId} FOR UPDATE`));
  if (!s) fail(404, "NOT_FOUND", "Turma não encontrada");
  await ensureSessions(tx, tenantId, scheduleId);
  const sessions = rows(await tx.execute(sql`SELECT * FROM class_sessions WHERE schedule_id = ${scheduleId}
    AND status = 'scheduled' AND starts_at > now() ORDER BY session_date FOR UPDATE`));
  return { schedule: s, sessions };
}

export async function createSlot(tx: Exec, tenantId: string, a: { enrollmentId: string; scheduleId?: string;
  individual?: { dayOfWeek: number; startTime: string; instructorId: string; modalityId?: string | null; durationMinutes?: number; room?: string | null } }) {
  const [e0] = rows(await tx.execute(sql`SELECT e.*, p.kind AS plan_kind, p.classes_per_week FROM membership_enrollments e
    JOIN membership_plans p ON p.id = e.plan_id WHERE e.id = ${a.enrollmentId} AND e.tenant_id = ${tenantId}`));
  if (!e0) fail(404, "NOT_FOUND", "Matrícula não encontrada");
  if (e0.status !== "active") fail(409, "ENROLLMENT_INACTIVE", "A matrícula não está ativa");
  if (e0.plan_kind !== "frequency") fail(400, "NOT_FREQUENCY", "Horário fixo só em plano por frequência");
  const { rules, studio } = await rulesForEnrollment(tx, tenantId, e0.id);

  let scheduleId = a.scheduleId ?? null;
  let warning: string | null = null;
  if (a.individual) {
    if (!rules.allowIndividualSlot) fail(409, "INDIVIDUAL_DISABLED", "O horário individual está desligado para este plano");
    const ind = a.individual;
    const duration = ind.durationMinutes ?? Number(studio.default_class_duration);
    const [prof] = rows(await tx.execute(sql`SELECT id FROM professionals WHERE id = ${ind.instructorId} AND tenant_id = ${tenantId} AND deleted_at IS NULL`));
    if (!prof) fail(404, "NOT_FOUND", "Instrutor não encontrado");
    if (ind.modalityId) {
      const [m] = rows(await tx.execute(sql`SELECT id FROM services WHERE id = ${ind.modalityId} AND tenant_id = ${tenantId} AND deleted_at IS NULL`));
      if (!m) fail(404, "NOT_FOUND", "Modalidade não encontrada");
    }
    const clash = await scheduleConflict(tx, tenantId, { instructorId: ind.instructorId, dayOfWeek: ind.dayOfWeek, startTime: ind.startTime, durationMinutes: duration });
    if (clash) fail(409, "INSTRUCTOR_CONFLICT", `O instrutor já tem aula às ${clash.start_time} nesse dia`);
    if (await outsideWorkingHours(tx, ind.instructorId, ind.dayOfWeek, ind.startTime, duration)) warning = "Horário fora da jornada de trabalho do instrutor";
    const cap = rules.individualSlotCapacity;
    const [s] = rows(await tx.execute(sql`INSERT INTO class_schedules (tenant_id, modality_id, instructor_id, day_of_week, start_time,
      duration_minutes, room, capacity, class_type, owner_enrollment_id)
      VALUES (${tenantId}, ${ind.modalityId ?? null}, ${ind.instructorId}, ${ind.dayOfWeek}, ${ind.startTime}, ${duration}, ${ind.room ?? null},
        ${cap}, ${cap === 1 ? "individual" : "duo"}, ${e0.id}) RETURNING id`));
    scheduleId = s.id;
  }
  const { schedule, sessions } = await lockScheduleAndSessions(tx, tenantId, scheduleId!);
  if (!schedule.is_active) fail(409, "SCHEDULE_INACTIVE", "Esta turma está desativada");
  const [e] = rows(await tx.execute(sql`SELECT * FROM membership_enrollments WHERE id = ${e0.id} FOR UPDATE`));
  const [slots] = rows(await tx.execute(sql`SELECT count(*)::int AS n, count(*) FILTER (WHERE schedule_id = ${scheduleId})::int AS here
    FROM class_enrollment_slots WHERE enrollment_id = ${e.id}`));
  if (Number(slots.here) > 0) fail(409, "SLOT_EXISTS", "A matrícula já tem esse horário");
  if (Number(slots.n) >= Number(e0.classes_per_week)) fail(409, "SLOT_LIMIT", `O plano permite ${e0.classes_per_week} horário(s) fixo(s) por semana`);
  // Datas além das 4 semanas: os fixos ativos da turma precisam caber na capacidade.
  const [fixed] = rows(await tx.execute(sql`SELECT count(*)::int AS n FROM class_enrollment_slots es JOIN membership_enrollments en ON en.id = es.enrollment_id
    WHERE es.schedule_id = ${scheduleId} AND en.status = 'active' AND (en.end_date IS NULL OR en.end_date >= ${todaySP})`));
  if (Number(fixed.n) >= schedule.capacity) fail(409, "CLASS_FULL", "A turma já está lotada de alunos fixos");
  // Todas as aulas já geradas no período da matrícula (fora de pausa) precisam ter vaga.
  const full: string[] = [];
  for (const s of sessions) {
    const d = toDay(s.session_date)!;
    if (d < toDay(e.start_date)! || (e.end_date && d > toDay(e.end_date)!)) continue;
    const [paused] = rows(await tx.execute(sql`SELECT 1 AS x FROM membership_pauses WHERE enrollment_id = ${e.id} AND ${d}::date BETWEEN start_date AND end_date`));
    if (paused) continue;
    if ((await seatsTaken(tx, s)) >= s.capacity) full.push(fmt(d));
  }
  if (full.length) fail(409, "CLASS_FULL", `Turma lotada em ${full.join(", ")}`);
  const [slot] = rows(await tx.execute(sql`INSERT INTO class_enrollment_slots (tenant_id, enrollment_id, schedule_id)
    VALUES (${tenantId}, ${e.id}, ${scheduleId}) RETURNING id`));
  await materializeFixed(tx, tenantId);
  return { slotId: slot.id as string, scheduleId: scheduleId!, warning };
}

export async function deleteSlot(tx: Exec, tenantId: string, slotId: string) {
  const [slot] = rows(await tx.execute(sql`SELECT * FROM class_enrollment_slots WHERE id = ${slotId} AND tenant_id = ${tenantId}`));
  if (!slot) fail(404, "NOT_FOUND", "Horário fixo não encontrado");
  const { schedule } = await lockScheduleAndSessions(tx, tenantId, slot.schedule_id);
  await tx.execute(sql`DELETE FROM class_enrollment_slots WHERE id = ${slotId}`);
  await pruneFixed(tx, tenantId, slot.enrollment_id);
  if (schedule.owner_enrollment_id === slot.enrollment_id) {
    // Horário individual desta matrícula: desativado junto; aulas futuras sem ninguém são apagadas.
    await tx.execute(sql`UPDATE class_schedules SET is_active = false, updated_at = now() WHERE id = ${schedule.id}`);
    await tx.execute(sql`DELETE FROM class_sessions ss WHERE ss.schedule_id = ${schedule.id} AND ss.starts_at > now()
      AND NOT EXISTS (SELECT 1 FROM class_bookings b WHERE b.session_id = ss.id AND b.status IN ${occupying})`);
  }
}

// ─── edição da grade ────────────────────────────────────────────────────────
export async function updateSchedule(tx: Exec, tenantId: string, id: string, ch: Record<string, any>) {
  const { schedule: cur, sessions } = await lockScheduleAndSessions(tx, tenantId, id);
  const next = {
    instructorId: ch.instructorId ?? cur.instructor_id, modalityId: ch.modalityId !== undefined ? ch.modalityId : cur.modality_id,
    dayOfWeek: ch.dayOfWeek ?? cur.day_of_week, startTime: ch.startTime ?? cur.start_time,
    durationMinutes: ch.durationMinutes ?? cur.duration_minutes, room: ch.room !== undefined ? ch.room : cur.room,
    capacity: ch.capacity ?? cur.capacity, classType: ch.classType ?? cur.class_type, isActive: ch.isActive ?? cur.is_active,
  };
  const [slotCount] = rows(await tx.execute(sql`SELECT count(*)::int AS n FROM class_enrollment_slots es JOIN membership_enrollments en ON en.id = es.enrollment_id
    WHERE es.schedule_id = ${id} AND en.status = 'active' AND (en.end_date IS NULL OR en.end_date >= ${todaySP})`));
  const nonFixedFuture = async () => Number(rows(await tx.execute(sql`SELECT count(*)::int AS n FROM class_bookings b JOIN class_sessions ss ON ss.id = b.session_id
    WHERE ss.schedule_id = ${id} AND ss.starts_at > now() AND b.kind <> 'fixed' AND b.status IN ${occupying}`))[0].n);

  if (!next.isActive && cur.is_active) {
    if (Number(slotCount.n) > 0) fail(409, "SCHEDULE_HAS_STUDENTS", "A turma tem alunos com horário fixo; remova esses horários antes");
    if (await nonFixedFuture() > 0) fail(409, "SCHEDULE_HAS_BOOKINGS", "A turma tem inscrições em aulas futuras; cancele-as antes");
    await tx.execute(sql`DELETE FROM class_sessions WHERE schedule_id = ${id} AND starts_at > now() AND status = 'scheduled'`);
    await tx.execute(sql`UPDATE class_schedules SET is_active = false, updated_at = now() WHERE id = ${id}`);
    return;
  }
  if (next.capacity < Number(slotCount.n)) fail(409, "CAPACITY_BELOW_FIXED", `A capacidade ficaria menor que os ${slotCount.n} alunos com horário fixo`);
  for (const s of sessions) {
    const taken = await seatsTaken(tx, s);
    if (next.capacity < taken) fail(409, "CAPACITY_BELOW_BOOKINGS", `A capacidade ficaria menor que as ${taken} inscrições da aula de ${fmt(toDay(s.session_date)!)}`);
  }
  const timeChanged = next.dayOfWeek !== cur.day_of_week || next.startTime !== cur.start_time || next.durationMinutes !== cur.duration_minutes;
  if (timeChanged || next.instructorId !== cur.instructor_id) {
    const clash = await scheduleConflict(tx, tenantId, { instructorId: next.instructorId, dayOfWeek: next.dayOfWeek, startTime: next.startTime, durationMinutes: next.durationMinutes, exceptId: id });
    if (clash) fail(409, "INSTRUCTOR_CONFLICT", `O instrutor já tem aula às ${clash.start_time} nesse dia`);
  }
  if (next.dayOfWeek !== cur.day_of_week) {
    if (await nonFixedFuture() > 0) fail(409, "SCHEDULE_HAS_BOOKINGS", "Para mudar o dia, cancele antes as inscrições avulsas das aulas futuras");
    await tx.execute(sql`DELETE FROM class_sessions ss WHERE ss.schedule_id = ${id} AND ss.starts_at > now() AND ss.status = 'scheduled'
      AND NOT EXISTS (SELECT 1 FROM class_bookings b WHERE b.session_id = ss.id AND b.status IN ('present','absent','excused'))`);
  }
  await tx.execute(sql`UPDATE class_schedules SET instructor_id = ${next.instructorId}, modality_id = ${next.modalityId}, day_of_week = ${next.dayOfWeek},
    start_time = ${next.startTime}, duration_minutes = ${next.durationMinutes}, room = ${next.room}, capacity = ${next.capacity},
    class_type = ${next.classType}, is_active = true, updated_at = now() WHERE id = ${id}`);
  // Aulas futuras sem presença lançada acompanham a grade; o instrutor trocado só numa aula é mantido.
  await tx.execute(sql`UPDATE class_sessions ss SET
      starts_at = (ss.session_date + ${next.startTime}::time) AT TIME ZONE ${TZ},
      ends_at = ((ss.session_date + ${next.startTime}::time) AT TIME ZONE ${TZ}) + make_interval(mins => ${next.durationMinutes}::int),
      instructor_id = CASE WHEN ss.instructor_overridden THEN ss.instructor_id ELSE ${next.instructorId}::uuid END,
      modality_id = ${next.modalityId}, room = ${next.room}, capacity = ${next.capacity}, class_type = ${next.classType}, updated_at = now()
    WHERE ss.schedule_id = ${id} AND ss.starts_at > now() AND ss.status = 'scheduled'
      AND NOT EXISTS (SELECT 1 FROM class_bookings b WHERE b.session_id = ss.id AND b.status IN ('present','absent','excused'))`);
  await ensureSessions(tx, tenantId, id);
}
