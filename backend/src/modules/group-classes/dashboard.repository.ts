// Painel do studio (repository): contagens em SQL, sempre filtradas por tenant_id. Sem regra de negócio.
import { sql } from "drizzle-orm";
import { type Exec, rows } from "./rules";
import { TZ, sessionTakenSql } from "./classes.service";

const todaySP = sql.raw(`(now() AT TIME ZONE '${TZ}')::date`);

/** Alunos (distintos) com matrícula de situação "active" cujo período vale hoje; aluno apagado não conta. */
export async function countActiveStudents(exec: Exec, tenantId: string): Promise<number> {
  const [r] = rows(await exec.execute(sql`
    SELECT count(DISTINCT e.client_id)::int AS n
    FROM membership_enrollments e
    JOIN clients c ON c.id = e.client_id AND c.deleted_at IS NULL
    WHERE e.tenant_id = ${tenantId} AND e.status = 'active'
      AND e.start_date <= ${todaySP} AND (e.end_date IS NULL OR e.end_date >= ${todaySP})`));
  return Number(r?.n ?? 0);
}

/** Aulas de hoje (Brasília) não canceladas: quantidade, alunos (vagas ocupadas) e vagas totais. */
export async function todayClasses(exec: Exec, tenantId: string): Promise<{ classes: number; students: number; capacity: number }> {
  const [r] = rows(await exec.execute(sql`
    SELECT count(*)::int AS classes, coalesce(sum(t.taken), 0)::int AS students, coalesce(sum(t.capacity), 0)::int AS capacity
    FROM (SELECT ss.capacity, ${sessionTakenSql} AS taken
          FROM class_sessions ss
          WHERE ss.tenant_id = ${tenantId} AND ss.session_date = ${todaySP} AND ss.status = 'scheduled') t`));
  return { classes: Number(r?.classes ?? 0), students: Number(r?.students ?? 0), capacity: Number(r?.capacity ?? 0) };
}

/**
 * Mensalidades pendentes (parcelas de matrícula, não apagadas): a receber de hoje até o fim do mês (Brasília) e
 * atrasadas (venceram antes de hoje), com total, quantidade e alunos distintos. Lançamento manual não entra.
 */
export async function installmentTotals(exec: Exec, tenantId: string) {
  const [r] = rows(await exec.execute(sql`
    SELECT
      coalesce(sum(ft.amount) FILTER (WHERE ft.due_date >= ${todaySP}
        AND ft.due_date < date_trunc('month', ${todaySP}) + interval '1 month'), 0)::float AS due_amount,
      count(*) FILTER (WHERE ft.due_date >= ${todaySP}
        AND ft.due_date < date_trunc('month', ${todaySP}) + interval '1 month')::int AS due_count,
      coalesce(sum(ft.amount) FILTER (WHERE ft.due_date < ${todaySP}), 0)::float AS overdue_amount,
      count(*) FILTER (WHERE ft.due_date < ${todaySP})::int AS overdue_count,
      count(DISTINCT e.client_id) FILTER (WHERE ft.due_date < ${todaySP})::int AS overdue_students
    FROM financial_transactions ft
    JOIN membership_enrollments e ON e.id = ft.enrollment_id
    WHERE ft.tenant_id = ${tenantId} AND ft.status = 'pending' AND ft.deleted_at IS NULL`));
  return {
    toReceive: { amount: Number(r?.due_amount ?? 0), count: Number(r?.due_count ?? 0) },
    overdue: { amount: Number(r?.overdue_amount ?? 0), count: Number(r?.overdue_count ?? 0), students: Number(r?.overdue_students ?? 0) },
  };
}

/** Data de hoje em Brasília (AAAA-MM-DD), a mesma usada nas contagens. */
export async function todayDate(exec: Exec): Promise<string> {
  const [r] = rows(await exec.execute(sql`SELECT to_char(${todaySP}, 'YYYY-MM-DD') AS d`));
  return r.d;
}
