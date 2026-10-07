// Dados de teste (Super Admin), repository: lotes, itens e o conjunto de linhas de um lote. Só SQL.
// Conjunto de um lote = os ids registrados (test_batch_items) + tudo que aponta para eles pelas ligações do banco
// (mensalidades da matrícula, ficha do aluno, itens do agendamento, aulas do horário e as inscrições nelas...),
// achado de novo a cada vez (o que nasceu depois da geração também entra) + o cliente criado ao converter um
// interessado de teste (leads.converted_to). Nada é achado por nome.
import { sql } from "drizzle-orm";
import { type Exec, rows } from "../group-classes/rules";
import type { FkEdge } from "./admin-ops.repository";

/** Tabelas que nunca entram no conjunto: o próprio registro do lote. */
const BOOKKEEPING = new Set(["test_batches", "test_batch_items"]);
/** Recursos compartilhados que a geração pode ter criado: só saem se nada fora do lote os usar. */
export const SHARED_TABLES = new Set(["financial_accounts", "financial_categories"]);

export type RowRef = { table: string; id: string };
export type BatchRows = Map<string, Set<string>>; // tabela -> ids

export async function createBatch(exec: Exec, tenantId: string, actor: string) {
  const [b] = rows(await exec.execute(sql`INSERT INTO test_batches (tenant_id, status, created_by) VALUES (${tenantId}, 'generating', ${actor}) RETURNING id, created_at`));
  return b as { id: string; created_at: string };
}

export async function finishBatch(exec: Exec, batchId: string, status: string, counts: unknown) {
  await exec.execute(sql`UPDATE test_batches SET status = ${status}, counts = ${JSON.stringify(counts)}::text::jsonb, finished_at = now() WHERE id = ${batchId}`);
}

export async function addItem(exec: Exec, batchId: string, tenantId: string, table: string, id: string, kind: "root" | "derived" = "root") {
  await exec.execute(sql`INSERT INTO test_batch_items (batch_id, tenant_id, table_name, record_id, kind)
    VALUES (${batchId}, ${tenantId}, ${table}, ${id}, ${kind}) ON CONFLICT (table_name, record_id) DO NOTHING`);
}

export async function batchItems(exec: Exec, batchId: string): Promise<{ table: string; id: string; kind: string }[]> {
  return rows(await exec.execute(sql`SELECT table_name AS "table", record_id::text AS id, kind FROM test_batch_items WHERE batch_id = ${batchId}`)) as any;
}

export async function findBatch(exec: Exec, tenantId: string, batchId: string) {
  const [b] = rows(await exec.execute(sql`SELECT id, tenant_id AS "tenantId", status, created_by AS "createdBy", counts,
      created_at AS "createdAt", finished_at AS "finishedAt" FROM test_batches WHERE id = ${batchId} AND tenant_id = ${tenantId}`));
  return b as any;
}

export async function listBatches(exec: Exec, tenantId: string) {
  return rows(await exec.execute(sql`SELECT b.id, b.status, b.created_by AS "createdBy", b.counts, b.created_at AS "createdAt",
      b.finished_at AS "finishedAt", (SELECT count(*)::int FROM test_batch_items i WHERE i.batch_id = b.id) AS items
    FROM test_batches b WHERE b.tenant_id = ${tenantId} ORDER BY b.created_at DESC`));
}

/** Lote em andamento ou pronto (ainda não apagado) na conta. */
export async function hasLiveBatch(exec: Exec, tenantId: string): Promise<boolean> {
  const [r] = rows(await exec.execute(sql`SELECT 1 AS x FROM test_batches WHERE tenant_id = ${tenantId} AND status IN ('generating','ready') LIMIT 1`));
  return !!r;
}

/** Lote sendo gerado na conta. */
export async function hasRunningBatch(exec: Exec, tenantId: string): Promise<boolean> {
  const [r] = rows(await exec.execute(sql`SELECT 1 AS x FROM test_batches WHERE tenant_id = ${tenantId} AND status = 'generating' LIMIT 1`));
  return !!r;
}

export async function setBatchStatus(exec: Exec, batchId: string, status: string) {
  await exec.execute(sql`UPDATE test_batches SET status = ${status}, finished_at = now() WHERE id = ${batchId}`);
}

/** Trava da conta para gerar/apagar lotes (até o fim da transação). */
export async function lockTenantBatches(tx: Exec, tenantId: string) {
  await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${"test-batches:" + tenantId}))`);
}

const add = (m: BatchRows, table: string, id: string) => {
  if (!m.has(table)) m.set(table, new Set());
  const s = m.get(table)!;
  if (s.has(id)) return false;
  s.add(id);
  return true;
};

/**
 * Todas as linhas do lote: raízes registradas + o que aponta para elas (fechamento pelas ligações do banco)
 * + cliente convertido de interessado de teste. Só dentro da conta.
 */
export async function collectBatchRows(exec: Exec, tenantId: string, batchId: string, edges: FkEdge[]): Promise<BatchRows> {
  const m: BatchRows = new Map();
  for (const it of await batchItems(exec, batchId)) add(m, it.table, it.id);
  const incoming = edges.filter((e) => !BOOKKEEPING.has(e.child) && e.parentColumn === "id");
  let frontier: RowRef[] = [...m.entries()].flatMap(([t, ids]) => [...ids].map((id) => ({ table: t, id })));
  for (let round = 0; frontier.length > 0 && round < 20; round++) {
    const byTable = new Map<string, string[]>();
    for (const f of frontier) byTable.set(f.table, [...(byTable.get(f.table) ?? []), f.id]);
    const next: RowRef[] = [];
    for (const [parent, ids] of byTable) {
      // interessado de teste convertido: o cliente criado na conversão também é do lote
      if (parent === "leads") {
        const conv = rows(await exec.execute(sql`SELECT converted_to::text AS id FROM leads
          WHERE tenant_id = ${tenantId} AND converted_to IS NOT NULL AND id::text IN (${sql.join(ids.map((i) => sql`${i}`), sql`, `)})`));
        for (const c of conv) if (add(m, "clients", c.id)) next.push({ table: "clients", id: c.id });
      }
      if (SHARED_TABLES.has(parent)) continue; // quem usa um recurso compartilhado não vira "do lote"
      for (const e of incoming.filter((x) => x.parent === parent)) {
        const found = rows(await exec.execute(sql`SELECT id::text AS id FROM ${sql.identifier(e.child)}
          WHERE tenant_id = ${tenantId} AND ${sql.identifier(e.childColumn)}::text IN (${sql.join(ids.map((i) => sql`${i}`), sql`, `)})`));
        for (const r of found) if (add(m, e.child, r.id)) next.push({ table: e.child, id: r.id });
      }
    }
    frontier = next;
  }
  // Histórico da conta (audit_logs) dos registros do lote: aponta só pelo id (sem ligação no banco).
  const all = [...m.entries()].filter(([t]) => t !== "audit_logs").flatMap(([, ids]) => [...ids]);
  if (all.length) {
    const logs = rows(await exec.execute(sql`SELECT id::text AS id FROM audit_logs WHERE tenant_id = ${tenantId}
      AND record_id::text IN (${sql.join(all.map((i) => sql`${i}`), sql`, `)})`));
    for (const l of logs) add(m, "audit_logs", l.id);
  }
  return m;
}

/** Ids atuais dos recursos compartilhados da conta (para saber quais a geração criou). */
export async function sharedIds(exec: Exec, tenantId: string): Promise<Set<string>> {
  const out = new Set<string>();
  for (const t of SHARED_TABLES) {
    for (const r of rows(await exec.execute(sql`SELECT id::text AS id FROM ${sql.identifier(t)} WHERE tenant_id = ${tenantId}`))) out.add(`${t}:${r.id}`);
  }
  return out;
}

/** Registra no lote (como derivados) os recursos compartilhados que nasceram durante a geração. */
export async function registerNewShared(exec: Exec, batchId: string, tenantId: string, before: Set<string>) {
  const now = await sharedIds(exec, tenantId);
  for (const key of now) {
    if (before.has(key)) continue;
    const [table, id] = key.split(":");
    await addItem(exec, batchId, tenantId, table, id, "derived");
  }
}

/** Linhas FORA do lote que apontam para um recurso compartilhado do lote (então ele fica). */
export async function sharedInUse(exec: Exec, tenantId: string, m: BatchRows, edges: FkEdge[]): Promise<RowRef[]> {
  const keep: RowRef[] = [];
  for (const table of SHARED_TABLES) {
    for (const id of m.get(table) ?? []) {
      for (const e of edges.filter((x) => x.parent === table && !BOOKKEEPING.has(x.child))) {
        const inBatch = [...(m.get(e.child) ?? [])];
        const [r] = rows(await exec.execute(sql`SELECT 1 AS x FROM ${sql.identifier(e.child)} WHERE tenant_id = ${tenantId}
          AND ${sql.identifier(e.childColumn)} = ${id}
          ${inBatch.length ? sql`AND id::text NOT IN (${sql.join(inBatch.map((i) => sql`${i}`), sql`, `)})` : sql``} LIMIT 1`));
        if (r) { keep.push({ table, id }); break; }
      }
    }
  }
  return keep;
}

/** Ligações que não contam como "dado fora do lote": a própria conta, logins e recursos compartilhados. */
const NEUTRAL_PARENTS = new Set(["tenants", "user_profiles", ...SHARED_TABLES]);

/**
 * Linhas que sairiam por arrasto (não anotadas no lote) e que também apontam para um registro FORA do conjunto
 * (ex.: inscrição de uma aluna real numa aula gerada pelo lote). Devolve tabela -> quantidade de linhas.
 */
export async function linkedOutside(exec: Exec, tenantId: string, m: BatchRows, annotated: Set<string>, edges: FkEdge[]) {
  const out: Record<string, number> = {};
  for (const [table, ids] of m) {
    const dragged = [...ids].filter((id) => !annotated.has(`${table}:${id}`));
    if (dragged.length === 0) continue;
    const bad = new Set<string>();
    for (const e of edges.filter((x) => x.child === table && x.parentColumn === "id" && !NEUTRAL_PARENTS.has(x.parent))) {
      const inSet = [...(m.get(e.parent) ?? [])];
      const found = rows(await exec.execute(sql`SELECT id::text AS id FROM ${sql.identifier(table)} WHERE tenant_id = ${tenantId}
        AND id::text IN (${sql.join(dragged.map((i) => sql`${i}`), sql`, `)}) AND ${sql.identifier(e.childColumn)} IS NOT NULL
        ${inSet.length ? sql`AND ${sql.identifier(e.childColumn)}::text NOT IN (${sql.join(inSet.map((i) => sql`${i}`), sql`, `)})` : sql``}`));
      for (const r of found) bad.add(r.id);
    }
    if (bad.size) out[table] = bad.size;
  }
  return out;
}

/** Apaga as linhas do conjunto, tabela por tabela, na ordem dada (filhos antes dos pais). Devolve a contagem. */
export async function deleteRows(tx: Exec, tenantId: string, m: BatchRows, order: string[]) {
  const out: Record<string, number> = {};
  for (const t of order) {
    const ids = [...(m.get(t) ?? [])];
    if (ids.length === 0) continue;
    const [r] = rows(await tx.execute(sql`WITH d AS (DELETE FROM ${sql.identifier(t)} WHERE tenant_id = ${tenantId}
      AND id::text IN (${sql.join(ids.map((i) => sql`${i}`), sql`, `)}) RETURNING 1) SELECT count(*)::int AS n FROM d`));
    out[t] = Number(r.n);
  }
  return out;
}
