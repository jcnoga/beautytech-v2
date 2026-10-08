// Regras da agenda (salão/barbearia/clínica), conferidas no backend ao criar ou editar um agendamento
// (decisões de 08/10/2026):
// 1) Profissional habilitado: se o profissional tem ALGUM serviço configurado (professional_services), cada serviço
//    do agendamento precisa estar entre os habilitados dele. Sem nenhum configurado, não confere (conta nova).
// 2) Jornada: se há jornada para o dia (professional_schedules), o horário precisa caber nela, fora do intervalo;
//    "não atende" no dia recusa. Bloqueio do profissional (professional_blocks) que encoste no horário recusa.
// 3) Choque: outro agendamento do mesmo profissional que ocupe o horário recusa (409). Ocupam: pendente, confirmado,
//    em atendimento e concluído. Não ocupam: cancelado, não compareceu, remarcado e apagado (deleted_at).
// Horários da jornada são de Brasília (America/Sao_Paulo); agendamentos são guardados em UTC.
import { sql } from "drizzle-orm";
import { rows } from "../group-classes/rules";

export const TZ = "America/Sao_Paulo";
export const OCCUPYING_STATUSES = ["pending", "confirmed", "in_progress", "completed"] as const;
const OCCUPYING_SQL = sql.raw(`(${OCCUPYING_STATUSES.map((s) => `'${s}'`).join(",")})`);

export class AgendaRuleError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}

/** Partes de um instante no horário de Brasília: data (AAAA-MM-DD), dia da semana (0=dom) e minutos do dia. */
export function localParts(d: Date) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23", weekday: "short" }).formatToParts(d).map((x) => [x.type, x.value]));
  const date = `${p.year}-${p.month}-${p.day}`;
  return { date, dow: new Date(date + "T00:00:00Z").getUTCDay(), minutes: Number(p.hour) * 60 + Number(p.minute) };
}

/** Instante (UTC) de uma data AAAA-MM-DD + HH:MM no horário de Brasília. */
export function localToUtc(date: string, hhmm: string): Date {
  const guess = new Date(`${date}T${hhmm}:00Z`);
  const { minutes, date: d2 } = localParts(guess);
  const [h, m] = hhmm.split(":").map(Number);
  const dayShift = d2 === date ? 0 : (d2 < date ? -1440 : 1440);
  const offset = (minutes + dayShift) - (h * 60 + m); // minutos que o relógio local está à frente do UTC
  return new Date(guess.getTime() - offset * 60000);
}

const toMin = (hhmm: string | null | undefined) => {
  if (!hhmm) return null;
  const [h, m] = String(hhmm).split(":").map(Number);
  return Number.isFinite(h) ? h * 60 + (m || 0) : null;
};
const hm = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
const hmOf = (d: Date) => hm(localParts(d).minutes);

export type SlotCheck = {
  tenantId: string;
  professionalId?: string | null;
  scheduledAt: Date;
  endsAt: Date;
  /** pares profissional/serviço a conferir (item sem profissional usa o do agendamento) */
  services?: { serviceId: string; professionalId?: string | null }[];
  /** ao editar: o próprio agendamento não conta como choque */
  ignoreAppointmentId?: string;
};

/** Confere as regras 1, 2 e 3; lança AgendaRuleError com mensagem clara. Chamar dentro da transação, após lockProfessional. */
export async function checkAgendaRules(exec: any, c: SlotCheck) {
  const q = async (s: any) => rows(await exec.execute(s)) as any[];
  if (!(c.endsAt > c.scheduledAt)) throw new AgendaRuleError(422, "INVALID_TIME", "O horário de término precisa ser depois do início.");

  // 1) habilitado para o serviço
  for (const s of c.services ?? []) {
    const profId = s.professionalId ?? c.professionalId;
    if (!profId) continue;
    const [cfg] = await q(sql`SELECT count(*)::int AS total,
        count(*) FILTER (WHERE service_id = ${s.serviceId} AND is_enabled)::int AS ok
      FROM professional_services WHERE tenant_id = ${c.tenantId} AND professional_id = ${profId}`);
    if (cfg.total > 0 && cfg.ok === 0) {
      const [n] = await q(sql`SELECT (SELECT full_name FROM professionals WHERE id = ${profId}) AS p, (SELECT name FROM services WHERE id = ${s.serviceId}) AS s`);
      throw new AgendaRuleError(422, "PROFESSIONAL_NOT_ENABLED", `${n?.p ?? "O profissional"} não está habilitado para o serviço "${n?.s ?? ""}".`);
    }
  }
  if (!c.professionalId) return;
  const [prof] = await q(sql`SELECT full_name AS name FROM professionals WHERE id = ${c.professionalId} AND tenant_id = ${c.tenantId}`);
  const who = prof?.name ?? "O profissional";

  // 2) jornada e bloqueios
  const a = localParts(c.scheduledAt), b = localParts(new Date(c.endsAt.getTime() - 1));
  const [sch] = await q(sql`SELECT is_working, start_time, end_time, break_start, break_end FROM professional_schedules
    WHERE tenant_id = ${c.tenantId} AND professional_id = ${c.professionalId} AND day_of_week = ${a.dow} LIMIT 1`);
  if (sch) {
    if (!sch.is_working) throw new AgendaRuleError(422, "OUTSIDE_SCHEDULE", `${who} não atende neste dia.`);
    const start = a.minutes, end = b.date === a.date ? b.minutes + 1 : 24 * 60 + 1;
    const ws = toMin(sch.start_time), we = toMin(sch.end_time);
    if (ws !== null && we !== null && (start < ws || end > we)) {
      throw new AgendaRuleError(422, "OUTSIDE_SCHEDULE", `Fora do horário de ${who}: atende das ${hm(ws)} às ${hm(we)}.`);
    }
    const bs = toMin(sch.break_start), be = toMin(sch.break_end);
    if (bs !== null && be !== null && start < be && end > bs) {
      throw new AgendaRuleError(422, "OUTSIDE_SCHEDULE", `O horário cai no intervalo de ${who} (${hm(bs)} às ${hm(be)}).`);
    }
  }
  const [blk] = await q(sql`SELECT starts_at, ends_at, reason FROM professional_blocks
    WHERE tenant_id = ${c.tenantId} AND professional_id = ${c.professionalId}
      AND starts_at < ${c.endsAt.toISOString()} AND ends_at > ${c.scheduledAt.toISOString()} LIMIT 1`);
  if (blk) {
    throw new AgendaRuleError(422, "PROFESSIONAL_BLOCKED",
      `${who} está com a agenda bloqueada nesse horário${blk.reason ? ` (${blk.reason})` : ""}.`);
  }

  // 3) choque com outro agendamento do mesmo profissional
  const [hit] = await q(sql`SELECT a.scheduled_at, coalesce(a.ends_at, a.scheduled_at + make_interval(mins => coalesce(a.duration_minutes, 60))) AS ends_at,
      c.full_name AS client
    FROM appointments a LEFT JOIN clients c ON c.id = a.client_id
    WHERE a.tenant_id = ${c.tenantId} AND a.professional_id = ${c.professionalId} AND a.deleted_at IS NULL
      AND a.status IN ${OCCUPYING_SQL}
      ${c.ignoreAppointmentId ? sql`AND a.id <> ${c.ignoreAppointmentId}` : sql``}
      AND a.scheduled_at < ${c.endsAt.toISOString()}
      AND coalesce(a.ends_at, a.scheduled_at + make_interval(mins => coalesce(a.duration_minutes, 60))) > ${c.scheduledAt.toISOString()}
    ORDER BY a.scheduled_at LIMIT 1`);
  if (hit) {
    throw new AgendaRuleError(409, "SCHEDULE_CONFLICT",
      `${who} já tem agendamento das ${hmOf(new Date(hit.scheduled_at))} às ${hmOf(new Date(hit.ends_at))}${hit.client ? ` (${hit.client})` : ""}.`);
  }
}

/** Trava o profissional até o fim da transação: dois agendamentos ao mesmo tempo não passam juntos pela conferência. */
export async function lockProfessional(exec: any, tenantId: string, professionalId?: string | null) {
  if (professionalId) await exec.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${"agenda:" + tenantId + ":" + professionalId}))`);
}
