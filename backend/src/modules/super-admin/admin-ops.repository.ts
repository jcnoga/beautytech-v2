// Super Admin, base comum (repository): estrutura do banco lida na hora (tabelas da conta e ligações),
// contagens por conta, marcas da conta e auditoria (admin_operations). Só SQL, sem regra de negócio.
import { sql } from "drizzle-orm";
import { type Exec, rows } from "../group-classes/rules";

export type FkEdge = { child: string; childColumn: string; parent: string; parentColumn: string; onDelete: string };

/** Tabelas do schema public que têm a coluna tenant_id (as que pertencem a uma conta). */
export async function tenantTables(exec: Exec): Promise<string[]> {
  return rows(await exec.execute(sql`SELECT c.table_name AS t FROM information_schema.columns c
    JOIN information_schema.tables t ON t.table_schema = c.table_schema AND t.table_name = c.table_name AND t.table_type = 'BASE TABLE'
    WHERE c.table_schema = 'public' AND c.column_name = 'tenant_id' ORDER BY 1`)).map((r: any) => r.t);
}

/** Todas as chaves estrangeiras de uma coluna entre tabelas do schema public. */
export async function fkEdges(exec: Exec): Promise<FkEdge[]> {
  return rows(await exec.execute(sql`SELECT ch.relname AS child, ca.attname AS child_column, pa.relname AS parent,
      pc.attname AS parent_column,
      CASE con.confdeltype WHEN 'a' THEN 'NO ACTION' WHEN 'r' THEN 'RESTRICT' WHEN 'c' THEN 'CASCADE'
        WHEN 'n' THEN 'SET NULL' WHEN 'd' THEN 'SET DEFAULT' END AS on_delete
    FROM pg_constraint con
    JOIN pg_class ch ON ch.oid = con.conrelid JOIN pg_namespace n ON n.oid = ch.relnamespace AND n.nspname = 'public'
    JOIN pg_class pa ON pa.oid = con.confrelid
    JOIN pg_attribute ca ON ca.attrelid = con.conrelid AND ca.attnum = con.conkey[1]
    JOIN pg_attribute pc ON pc.attrelid = con.confrelid AND pc.attnum = con.confkey[1]
    WHERE con.contype = 'f' AND array_length(con.conkey, 1) = 1
    ORDER BY 1, 2`)).map((r: any) => ({ child: r.child, childColumn: r.child_column, parent: r.parent, parentColumn: r.parent_column, onDelete: r.on_delete }));
}

/** Linhas de cada tabela que pertencem à conta (tenant_id = conta). */
export async function countByTenant(exec: Exec, tenantId: string, tables: string[]): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  for (const t of tables) {
    const [r] = rows(await exec.execute(sql`SELECT count(*)::int AS n FROM ${sql.identifier(t)} WHERE tenant_id = ${tenantId}`));
    out[t] = Number(r.n);
  }
  return out;
}

export async function findTenant(exec: Exec, tenantId: string) {
  const [t] = rows(await exec.execute(sql`SELECT id, name, slug, business_type AS "businessType", is_protected AS "isProtected",
      is_test_account AS "isTestAccount", plan_status AS "planStatus", asaas_subscription_id AS "asaasSubscriptionId",
      whatsapp_instance AS "whatsappInstance", deleted_at AS "deletedAt"
    FROM tenants WHERE id = ${tenantId}`));
  return t as any;
}

export async function setTenantFlags(exec: Exec, tenantId: string, flags: { isProtected?: boolean; isTestAccount?: boolean }) {
  const [t] = rows(await exec.execute(sql`UPDATE tenants SET
      is_protected = COALESCE(${flags.isProtected ?? null}::boolean, is_protected),
      is_test_account = COALESCE(${flags.isTestAccount ?? null}::boolean, is_test_account),
      updated_at = now()
    WHERE id = ${tenantId} RETURNING id, name, is_protected AS "isProtected", is_test_account AS "isTestAccount"`));
  return t as any;
}

// ─── auditoria ───────────────────────────────────────────────────────────────
// JSON vai como `::text::jsonb`: só `::jsonb` faz o driver codificar de novo e gravar uma string JSON, não o objeto.
export async function insertOperation(exec: Exec, op: { operation: string; tenantId: string | null; tenantName: string | null; actor: string; ip: string | null; counts?: unknown; details?: unknown }) {
  const [r] = rows(await exec.execute(sql`INSERT INTO admin_operations (operation, target_tenant_id, target_tenant_name, actor, ip, counts, details)
    VALUES (${op.operation}, ${op.tenantId}, ${op.tenantName}, ${op.actor}, ${op.ip}, ${JSON.stringify(op.counts ?? {})}::text::jsonb, ${JSON.stringify(op.details ?? {})}::text::jsonb)
    RETURNING id`));
  return r.id as string;
}

/** Fecha (ou atualiza) a operação: situação, contagens e detalhes (os detalhes são mesclados aos que já existem). */
export async function finishOperation(exec: Exec, id: string, f: { status: string; counts?: unknown; details?: unknown; finished?: boolean }) {
  await exec.execute(sql`UPDATE admin_operations SET status = ${f.status},
      counts = COALESCE(${f.counts === undefined ? null : JSON.stringify(f.counts)}::text::jsonb, counts),
      details = details || ${JSON.stringify(f.details ?? {})}::text::jsonb,
      finished_at = CASE WHEN ${f.finished ?? true} THEN now() ELSE finished_at END
    WHERE id = ${id}`);
}

export async function getOperation(exec: Exec, id: string) {
  const [r] = rows(await exec.execute(sql`SELECT id, operation, target_tenant_id AS "tenantId", target_tenant_name AS "tenantName",
      status, counts, details FROM admin_operations WHERE id = ${id}`));
  return r as any;
}

/** Última migration aplicada (para o manifesto do backup: restaurar só na mesma estrutura). */
export async function lastMigration(exec: Exec): Promise<string | null> {
  const [r] = rows(await exec.execute(sql`SELECT max(created_at)::text AS m FROM drizzle.__drizzle_migrations`));
  return r?.m ?? null;
}

export async function listOperations(exec: Exec, tenantId?: string) {
  return rows(await exec.execute(sql`SELECT id, operation, target_tenant_id AS "tenantId", target_tenant_name AS "tenantName",
      actor, status, counts, details, started_at AS "startedAt", finished_at AS "finishedAt"
    FROM admin_operations ${tenantId ? sql`WHERE target_tenant_id = ${tenantId}` : sql``}
    ORDER BY started_at DESC LIMIT 100`));
}
