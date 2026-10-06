// Super Admin, "Excluir conta" (repository): leitura para o backup e exclusão na ordem calculada. Só SQL.
import { sql } from "drizzle-orm";
import { type Exec, rows } from "../group-classes/rules";

/** Logins (id no GoTrue) dos usuários da conta. */
export async function tenantAuthUserIds(exec: Exec, tenantId: string): Promise<string[]> {
  return rows(await exec.execute(sql`SELECT auth_user_id::text AS id FROM user_profiles WHERE tenant_id = ${tenantId} ORDER BY 1`))
    .map((r: any) => r.id);
}

/** Pedidos de troca de senha dos logins da conta (password_resets não tem tenant_id). */
export async function countPasswordResets(exec: Exec, userIds: string[]): Promise<number> {
  if (userIds.length === 0) return 0;
  const [r] = rows(await exec.execute(sql`SELECT count(*)::int AS n FROM password_resets WHERE user_id::text IN (${sql.join(userIds.map((u) => sql`${u}`), sql`, `)})`));
  return Number(r.n);
}

/** Todas as linhas da conta, tabela por tabela, para o backup (inclui a própria conta e os pedidos de senha). */
export async function exportRows(exec: Exec, tenantId: string, tables: string[], userIds: string[]) {
  const out: Record<string, unknown[]> = {};
  out.tenants = rows(await exec.execute(sql`SELECT * FROM tenants WHERE id = ${tenantId}`));
  for (const t of tables) out[t] = rows(await exec.execute(sql`SELECT * FROM ${sql.identifier(t)} WHERE tenant_id = ${tenantId}`));
  out.password_resets = userIds.length === 0 ? [] : rows(await exec.execute(sql`SELECT * FROM password_resets
    WHERE user_id::text IN (${sql.join(userIds.map((u) => sql`${u}`), sql`, `)})`));
  return out;
}

/** Trava a linha da conta até o fim da transação: quem tentar gravar dados dela espera e depois falha. */
export async function lockTenant(tx: Exec, tenantId: string) {
  const [r] = rows(await tx.execute(sql`SELECT id FROM tenants WHERE id = ${tenantId} FOR UPDATE`));
  return !!r;
}

/** Apaga as linhas da conta em cada tabela, na ordem dada (filhos antes dos pais). Devolve quantas saíram de cada. */
export async function deleteInOrder(tx: Exec, tenantId: string, order: string[], userIds: string[]) {
  const count = async (del: any) => Number(rows(await tx.execute(sql`WITH d AS (${del} RETURNING 1) SELECT count(*)::int AS n FROM d`))[0].n);
  const deleted: Record<string, number> = {};
  if (userIds.length > 0) {
    deleted.password_resets = await count(sql`DELETE FROM password_resets WHERE user_id::text IN (${sql.join(userIds.map((u) => sql`${u}`), sql`, `)})`);
  }
  for (const t of order) {
    deleted[t] = await count(t === "tenants"
      ? sql`DELETE FROM tenants WHERE id = ${tenantId}`
      : sql`DELETE FROM ${sql.identifier(t)} WHERE tenant_id = ${tenantId}`);
  }
  return deleted;
}
