// Mensalidades do Pilates no Financeiro: cada matrícula gera as suas parcelas como receitas PENDENTES em
// financial_transactions, ligadas por enrollment_id + installment_no (únicos: gerar de novo nunca duplica).
// Regras (decididas em 06/10/2026):
//  - Frequência: 1 parcela por mês de vigência. A 1ª vence na data de início; as seguintes, no dia de vencimento
//    (due_day; vazio = dia do início, até 28) do mês de cada período.
//  - Pacote: parcela única, vence na data de início. Valor 0 (ex.: experimental grátis): nenhuma parcela.
//  - Pausa: não muda a cobrança. As regras de pausa (pauseEnabled / pauseMaxDays) não falam de cobrança: só estendem
//    a vigência pelos dias pausados, e esses dias não viram mês novo (a conta das parcelas desconta as pausas).
//  - Matrícula sem fim: parcelas dos períodos que começam até 1 mês depois de hoje (gerar de novo completa).
// Lançamento em conta padrão do studio, categoria "Mensalidades" (criadas na hora se faltarem).
// Toda geração do studio passa por uma trava (advisory lock da transação) para não criar categoria/conta em dobro.
import { sql } from "drizzle-orm";
import { type Exec, rows } from "./rules";
import { TZ, toDay } from "./classes.service";

const todaySP = sql.raw(`(now() AT TIME ZONE '${TZ}')::date`);
export const INSTALLMENT_CATEGORY = "Mensalidades";

type Installment = { no: number; due: string; competence: string };

/** Dia `day` (limitado ao fim do mês) do mês de `start` + `months`. */
function monthDay(start: string, months: number, day: number) {
  const [y, m] = start.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + months, 1));
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d.toISOString().slice(0, 10);
}
function addDays(day: string, n: number) {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/**
 * Parcelas esperadas de uma matrícula (sem tocar no banco). `end` vazio = sem fim; `pausedDays` são descontados
 * do fim antes de contar os meses.
 */
export function installmentSchedule(a: { kind: string; start: string; end: string | null; dueDay: number | null; pausedDays: number; today: string }): Installment[] {
  if (a.kind !== "frequency") return [{ no: 1, due: a.start, competence: a.start }];
  const startDay = Number(a.start.slice(8, 10));
  const dueDay = a.dueDay ?? Math.min(startDay, 28);
  const limit = a.end ? addDays(a.end, -a.pausedDays) : monthDay(a.today, 1, Number(a.today.slice(8, 10)));
  const out: Installment[] = [];
  for (let k = 0; k < 120; k++) {
    const periodStart = monthDay(a.start, k, startDay);
    if (k > 0 && periodStart > limit) break;
    out.push({ no: k + 1, due: k === 0 ? a.start : monthDay(a.start, k, dueDay), competence: periodStart });
  }
  return out;
}

const mmYYYY = (day: string) => `${day.slice(5, 7)}/${day.slice(0, 4)}`;

async function lockTenant(tx: Exec, tenantId: string) {
  await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${"installments:" + tenantId}))`);
}

/** Conta padrão do studio (ou a primeira ativa); sem nenhuma, cria o "Caixa Principal". */
async function accountFor(tx: Exec, tenantId: string): Promise<string> {
  const [a] = rows(await tx.execute(sql`SELECT id FROM financial_accounts WHERE tenant_id = ${tenantId} AND is_active
    ORDER BY is_default DESC, created_at LIMIT 1`));
  if (a) return a.id;
  const [n] = rows(await tx.execute(sql`INSERT INTO financial_accounts (tenant_id, name, type, is_default)
    VALUES (${tenantId}, 'Caixa Principal', 'cash', true) RETURNING id`));
  return n.id;
}

async function categoryFor(tx: Exec, tenantId: string): Promise<string> {
  const [c] = rows(await tx.execute(sql`SELECT id FROM financial_categories WHERE tenant_id = ${tenantId}
    AND name = ${INSTALLMENT_CATEGORY} AND type = 'revenue' ORDER BY is_active DESC, created_at LIMIT 1`));
  if (c) return c.id;
  const [n] = rows(await tx.execute(sql`INSERT INTO financial_categories (tenant_id, name, type)
    VALUES (${tenantId}, ${INSTALLMENT_CATEGORY}, 'revenue') RETURNING id`));
  return n.id;
}

async function loadEnrollment(tx: Exec, tenantId: string, enrollmentId: string) {
  const [e] = rows(await tx.execute(sql`SELECT e.id, e.client_id, e.start_date, e.end_date, e.due_day, e.price, e.status,
      p.kind, p.name AS plan_name, c.full_name AS student_name, ${todaySP} AS today,
      (SELECT COALESCE(sum(pp.days), 0)::int FROM membership_pauses pp WHERE pp.enrollment_id = e.id) AS paused_days
    FROM membership_enrollments e JOIN membership_plans p ON p.id = e.plan_id JOIN clients c ON c.id = e.client_id
    WHERE e.id = ${enrollmentId} AND e.tenant_id = ${tenantId}`));
  return e as any;
}
const scheduleOf = (e: any) => installmentSchedule({ kind: e.kind, start: toDay(e.start_date)!, end: toDay(e.end_date),
  dueDay: e.due_day === null ? null : Number(e.due_day), pausedDays: Number(e.paused_days), today: toDay(e.today)! });

/**
 * Cria as parcelas que faltam de uma matrícula ativa (ou pausada). Chamar DENTRO de uma transação.
 * Devolve quantas parcelas foram criadas agora.
 */
export async function generateInstallments(tx: Exec, tenantId: string, enrollmentId: string, userId: string | null): Promise<number> {
  await lockTenant(tx, tenantId);
  const e = await loadEnrollment(tx, tenantId, enrollmentId);
  if (!e || !["active", "paused"].includes(e.status) || !(Number(e.price) > 0)) return 0;

  const list = scheduleOf(e);
  const accountId = await accountFor(tx, tenantId);
  const categoryId = await categoryFor(tx, tenantId);
  let created = 0;
  for (const i of list) {
    const description = e.kind === "frequency"
      ? `Mensalidade ${mmYYYY(i.competence)} - ${e.plan_name} - ${e.student_name}`
      : `${e.plan_name} - ${e.student_name}`;
    const r = rows(await tx.execute(sql`INSERT INTO financial_transactions (tenant_id, account_id, category_id, type, status,
        description, amount, due_date, competence_date, client_id, enrollment_id, installment_no, created_by, updated_by)
      VALUES (${tenantId}, ${accountId}, ${categoryId}, 'revenue', 'pending', ${description.slice(0, 500)}, ${e.price},
        ${i.due}, ${i.competence}, ${e.client_id}, ${e.id}, ${i.no}, ${userId}, ${userId})
      ON CONFLICT (enrollment_id, installment_no) DO NOTHING RETURNING id`));
    created += r.length;
  }
  return created;
}

/**
 * Acerta as parcelas depois de mudar a matrícula. Chamar DENTRO de uma transação. "Futura" = vence depois de hoje;
 * as que já venceram (atrasadas) nunca mudam: continuam como dívida, mesmo com a matrícula cancelada.
 *  - Encerrada/cancelada ou valor 0: cancela as pendentes futuras.
 *  - Fim antecipado: cancela as pendentes futuras que passaram do novo fim; fim prorrogado: cria as que faltam.
 *  - Valor ou dia de vencimento mudou: vale só para as pendentes futuras (o vencimento novo só se ainda for futuro).
 *  - `revive` (fim mudou ou matrícula reativada): as futuras canceladas que voltaram a caber no período voltam a
 *    pendente. Só nesses casos, para não desfazer um cancelamento feito à mão no Financeiro.
 */
export async function syncInstallments(tx: Exec, tenantId: string, enrollmentId: string, userId: string | null, revive = false) {
  await lockTenant(tx, tenantId);
  const e = await loadEnrollment(tx, tenantId, enrollmentId);
  if (!e) return { created: 0, cancelled: 0, updated: 0 };
  const today = toDay(e.today)!;
  const future = sql`enrollment_id = ${e.id} AND tenant_id = ${tenantId} AND status = 'pending' AND deleted_at IS NULL
    AND due_date > ${today}`;
  const cancel = async (extra = sql`TRUE`) => rows(await tx.execute(sql`UPDATE financial_transactions
    SET status = 'cancelled', updated_by = ${userId}, updated_at = now() WHERE ${future} AND ${extra} RETURNING id`)).length;

  if (!["active", "paused"].includes(e.status) || !(Number(e.price) > 0)) return { created: 0, cancelled: await cancel(), updated: 0 };

  const list = scheduleOf(e);
  const cancelled = await cancel(sql`installment_no > ${list.length}`);
  let updated = 0;
  if (revive) {
    updated += rows(await tx.execute(sql`UPDATE financial_transactions SET status = 'pending', updated_by = ${userId}, updated_at = now()
      WHERE enrollment_id = ${e.id} AND tenant_id = ${tenantId} AND status = 'cancelled' AND deleted_at IS NULL
        AND due_date > ${today} AND installment_no <= ${list.length} RETURNING id`)).length;
  }
  for (const i of list) {
    const r = rows(await tx.execute(sql`UPDATE financial_transactions
      SET amount = ${e.price}, due_date = CASE WHEN ${i.due}::date > ${today} THEN ${i.due}::date ELSE due_date END,
        updated_by = ${userId}, updated_at = now()
      WHERE ${future} AND installment_no = ${i.no}
        AND (amount <> ${e.price} OR (due_date <> ${i.due}::date AND ${i.due}::date > ${today})) RETURNING id`));
    updated += r.length;
  }
  return { created: await generateInstallments(tx, tenantId, e.id, userId), cancelled, updated };
}

/** "Gerar mensalidades das matrículas ativas": cria só o que falta (apertar de novo não duplica). */
export async function generateAllInstallments(tx: Exec, tenantId: string, userId: string | null) {
  await lockTenant(tx, tenantId);
  const list = rows(await tx.execute(sql`SELECT id FROM membership_enrollments
    WHERE tenant_id = ${tenantId} AND status IN ('active','paused') AND price > 0 ORDER BY start_date`));
  let created = 0, enrollments = 0;
  for (const { id } of list) {
    const n = await generateInstallments(tx, tenantId, id, userId);
    created += n;
    if (n > 0) enrollments++;
  }
  return { created, enrollments };
}
