// Restauração de uma conta a partir do backup do "Excluir conta" (usada por scripts/restaurar-conta.ts e pelos testes).
// Confere os sha256sums, recusa se a conta ainda existir ou se a estrutura do banco (última migration) for outra.
// Logins: recriados no GoTrue com o mesmo e-mail (a senha não está no backup: cada usuário usa "Esqueci minha senha").
// Se o GoTrue devolver outro id, os perfis apontam para o novo. Dados: uma transação, pais antes dos filhos
// (ordem inversa da exclusão); se falhar, os logins recém-criados são apagados. Arquivos: copiados de volta.
import { createHash, randomBytes } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { gunzipSync } from "node:zlib";
import { sql } from "drizzle-orm";
import { db } from "@db/connection";
import { env } from "@config/env";
import { gotrueAdmin } from "@config/gotrue";
import { rows } from "../group-classes/rules";
import * as ops from "./admin-ops.repository";

export async function readBackup(dir: string) {
  const sums = (await fs.readFile(path.join(dir, "sha256sums"), "utf8")).trim().split("\n").map((l) => l.split(/\s+/));
  for (const [hash, name] of sums) {
    const got = createHash("sha256").update(await fs.readFile(path.join(dir, name))).digest("hex");
    if (got !== hash) throw new Error(`Arquivo alterado ou corrompido no backup: ${name}`);
  }
  const manifest = JSON.parse(await fs.readFile(path.join(dir, "manifest.json"), "utf8"));
  const data = JSON.parse(gunzipSync(await fs.readFile(path.join(dir, "dados.json.gz"))).toString()) as Record<string, any[]>;
  const auth = JSON.parse(gunzipSync(await fs.readFile(path.join(dir, "gotrue-usuarios.json.gz"))).toString()) as { users: any[] };
  return { manifest, data, auth };
}

export async function restoreFromBackup(dir: string, opts: { apply: boolean }) {
  const { manifest, data, auth } = await readBackup(dir);
  const tenantId: string = manifest.tenant.id;
  if (await ops.findTenant(db, tenantId)) throw new Error("A conta ainda existe no banco: restauração recusada.");
  const current = await ops.lastMigration(db);
  if (current !== manifest.lastMigration) throw new Error(`Estrutura do banco diferente (backup: ${manifest.lastMigration}, banco: ${current}).`);
  const order: string[] = [...manifest.deletionOrder].reverse(); // pais antes dos filhos (tenants primeiro)
  const summary = Object.fromEntries(Object.entries(data).map(([t, r]) => [t, r.length]));
  if (!opts.apply) return { applied: false, tenant: manifest.tenant, rows: summary, logins: auth.users.length };

  // 1. Logins (fora do banco do app).
  const idMap = new Map<string, string>(), created: string[] = [];
  for (const u of auth.users) {
    const res = await gotrueAdmin("/admin/users", { method: "POST", body: JSON.stringify({
      id: u.id, email: u.email, email_confirm: true, password: randomBytes(18).toString("base64url"),
      user_metadata: u.user_metadata ?? {}, app_metadata: u.app_metadata ?? {},
    }) });
    if (!res.ok) {
      for (const id of created) await gotrueAdmin(`/admin/users/${id}`, { method: "DELETE" }).catch(() => {});
      throw new Error(`GoTrue respondeu ${res.status} ao recriar ${u.email}: nada foi restaurado.`);
    }
    const nu = await res.json() as { id: string };
    created.push(nu.id);
    idMap.set(u.id, nu.id);
  }
  const mapId = (v: string) => idMap.get(v) ?? v;
  for (const r of data.user_profiles ?? []) r.auth_user_id = mapId(r.auth_user_id);
  for (const r of data.password_resets ?? []) r.user_id = mapId(r.user_id);

  // 2. Dados, numa transação.
  try {
    await db.transaction(async (tx) => {
      for (const t of [...order, "password_resets"]) {
        const list = data[t];
        if (!list || list.length === 0) continue;
        const n = rows(await tx.execute(sql`WITH ins AS (INSERT INTO ${sql.identifier(t)}
            SELECT * FROM json_populate_recordset(NULL::${sql.identifier(t)}, ${JSON.stringify(list)}::text::json) RETURNING 1)
          SELECT count(*)::int AS n FROM ins`))[0].n;
        if (Number(n) !== list.length) throw new Error(`${t}: ${n} de ${list.length} linhas`);
      }
    });
  } catch (e) {
    for (const id of created) await gotrueAdmin(`/admin/users/${id}`, { method: "DELETE" }).catch(() => {});
    throw e;
  }

  // 3. Arquivos.
  const up = path.join(dir, "uploads");
  if (await fs.stat(up).then(() => true, () => false)) await fs.cp(up, path.join(env.UPLOADS_DIR, tenantId), { recursive: true });
  return { applied: true, tenant: manifest.tenant, rows: summary, logins: created.length };
}
