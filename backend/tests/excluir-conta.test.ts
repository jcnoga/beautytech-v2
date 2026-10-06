// Super Admin, "Excluir conta": prévia, confirmação (nome + senha + previewHash), bloqueios (protegida, assinatura
// ativa, Asaas fora do ar), backup, transação única (falha no meio = nada apagado), limpeza de fora do banco com
// "tentar de novo", auditoria que sobrevive, outras contas intactas e restauração a partir do backup.
// GoTrue e Asaas são simulados (fetch); WhatsApp fica desligado (WHATSAPP_SEND_ENABLED=false).
// Uso: sh scripts/test-db.sh   (o banco de teste é APAGADO a cada execução)
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { gunzipSync } from "node:zlib";
import postgres from "postgres";
import jwt from "jsonwebtoken";

const DB_URL = process.env.TEST_DATABASE_URL ?? "";
if (!/test/i.test(new URL(DB_URL || "postgres://x/none").pathname)) {
  throw new Error("Defina TEST_DATABASE_URL com um banco cujo nome contenha 'test' (ele será apagado).");
}
const SA_SECRET = "super-admin-test";
const TMP = mkdtempSync(path.join(tmpdir(), "zs-excluir-"));
const UPLOADS = path.join(TMP, "uploads"), BACKUPS = path.join(TMP, "backups");
Object.assign(process.env, {
  NODE_ENV: "test", POSTGRES_URL: DB_URL, POSTGRES_SSL: "false",
  GOTRUE_URL: "http://gotrue.test", GOTRUE_JWT_SECRET: "test-secret-at-least-32-characters-long!!", GOTRUE_SERVICE_KEY: "service",
  RESEND_API_KEY: "re_test", SUPER_ADMIN_SECRET: SA_SECRET, SUPER_ADMIN_PASSWORD: "senha-do-sa", WHATSAPP_SEND_ENABLED: "false",
  UPLOADS_DIR: UPLOADS, TENANT_BACKUPS_DIR: BACKUPS, ASAAS_API_KEY: "chave-teste", ASAAS_BASE_URL: "http://asaas.test",
});

// ─── rede simulada: GoTrue e Asaas ──────────────────────────────────────────
const calls: string[] = [];
let gotrueDeleteFails = false;
let asaasMode: "active" | "inactive" | "down" = "inactive";
globalThis.fetch = (async (url: string, init: any = {}) => {
  const method = init.method ?? "GET";
  calls.push(`${method} ${url}`);
  const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
  if (url.startsWith("http://gotrue.test/admin/users")) {
    const id = url.split("/admin/users/")[1];
    if (method === "GET") return json(200, { id, email: `${id}@login.test`, user_metadata: { full_name: "x" } });
    if (method === "DELETE") return gotrueDeleteFails ? json(500, { msg: "fora do ar" }) : json(200, {});
    if (method === "POST") { const b = JSON.parse(init.body); return json(200, { id: b.id, email: b.email }); }
  }
  if (url.startsWith("http://asaas.test/subscriptions/")) {
    if (asaasMode === "down") return json(503, {});
    return json(200, { status: asaasMode === "active" ? "ACTIVE" : "INACTIVE" });
  }
  throw new Error(`rede desligada no teste: ${url}`);
}) as any;

const PREFIX = "/api/v1";
const sql = postgres(DB_URL, { max: 6, onnotice: () => {} });
let app: any;
let svc: typeof import("../src/modules/super-admin/admin-ops.service");
const SA = jwt.sign({ email: "sa@test", role: "super_admin" }, SA_SECRET, { expiresIn: "1h" });
const req = (method: string, url: string, payload?: any, tok: string | null = SA) => // null = sem token
  app.inject({ method, url: PREFIX + url, headers: tok ? { authorization: `Bearer ${tok}` } : {}, payload });
const data = (r: any) => r.json().data;

type T = { id: string; name: string; users: string[] };
let tables: string[] = [];

/** Conta com dados em várias tabelas (salão + Pilates + financeiro + logins + arquivos). */
async function seed(label: string): Promise<T> {
  const name = `Conta ${label} Ação`;
  const [t] = await sql`INSERT INTO tenants (name, slug, business_type) VALUES (${name}, ${label + "-" + Date.now()}, 'pilates') RETURNING id`;
  const users = [randomUUID(), randomUUID()];
  for (const [i, u] of users.entries()) await sql`INSERT INTO user_profiles (tenant_id, auth_user_id, full_name, role) VALUES (${t.id}, ${u}, ${"U" + i}, ${i ? "manager" : "owner"})`;
  await sql`INSERT INTO password_resets (user_id, token, expires_at) VALUES (${users[0]}, ${"tok-" + randomUUID()}, now() + interval '1 hour')`;
  const [c] = await sql`INSERT INTO clients (tenant_id, full_name) VALUES (${t.id}, 'Cliente') RETURNING id`;
  await sql`INSERT INTO student_profiles (tenant_id, client_id) VALUES (${t.id}, ${c.id})`;
  const [p] = await sql`INSERT INTO professionals (tenant_id, full_name) VALUES (${t.id}, 'Prof') RETURNING id`;
  const [s] = await sql`INSERT INTO services (tenant_id, name) VALUES (${t.id}, 'Serviço') RETURNING id`;
  const [a] = await sql`INSERT INTO appointments (tenant_id, client_id, professional_id, scheduled_at, ends_at) VALUES (${t.id}, ${c.id}, ${p.id}, now(), now() + interval '1 hour') RETURNING id`;
  await sql`INSERT INTO appointment_services (tenant_id, appointment_id, service_id) VALUES (${t.id}, ${a.id}, ${s.id})`;
  const [acc] = await sql`INSERT INTO financial_accounts (tenant_id, name, type) VALUES (${t.id}, 'Caixa', 'cash') RETURNING id`;
  const [pl] = await sql`INSERT INTO membership_plans (tenant_id, name, kind, price, classes_per_week, duration_months) VALUES (${t.id}, 'Mensal', 'frequency', 200, 2, 1) RETURNING id`;
  const [e] = await sql`INSERT INTO membership_enrollments (tenant_id, client_id, plan_id, start_date, price) VALUES (${t.id}, ${c.id}, ${pl.id}, current_date, 200) RETURNING id`;
  const [tx] = await sql`INSERT INTO financial_transactions (tenant_id, account_id, type, status, description, amount, due_date, client_id, enrollment_id, installment_no)
    VALUES (${t.id}, ${acc.id}, 'revenue', 'pending', 'Mensalidade', 200, current_date, ${c.id}, ${e.id}, 1) RETURNING id`;
  await sql`INSERT INTO commissions (tenant_id, professional_id, appointment_id, transaction_id, base_amount, commission_amt) VALUES (${t.id}, ${p.id}, ${a.id}, ${tx.id}, 100, 10)`;
  await sql`INSERT INTO leads (tenant_id, name, converted_to) VALUES (${t.id}, 'Lead', ${c.id})`;
  await sql`INSERT INTO audit_logs (tenant_id, table_name, action) VALUES (${t.id}, 'clients', 'create')`;
  await sql`INSERT INTO notifications (tenant_id, client_id, channel, message) VALUES (${t.id}, ${c.id}, 'whatsapp', 'oi')`;
  mkdirSync(path.join(UPLOADS, t.id, "fotos"), { recursive: true });
  writeFileSync(path.join(UPLOADS, t.id, "logo.png"), "png");
  writeFileSync(path.join(UPLOADS, t.id, "fotos", "a.jpg"), "jpg");
  return { id: t.id, name, users };
}

/** Linhas de cada tabela da conta (+ a própria conta e os pedidos de senha dos logins). */
async function snapshot(t: T) {
  const out: Record<string, number> = {};
  for (const tb of tables) out[tb] = Number((await sql.unsafe(`SELECT count(*)::int n FROM "${tb}" WHERE tenant_id = $1`, [t.id]))[0].n);
  out.tenants = Number((await sql`SELECT count(*)::int n FROM tenants WHERE id = ${t.id}`)[0].n);
  out.password_resets = Number((await sql`SELECT count(*)::int n FROM password_resets WHERE user_id = ANY(${t.users})`)[0].n);
  return out;
}

let A: T, B: T, C: T;
before(async () => {
  await sql.unsafe("DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public; DROP SCHEMA IF EXISTS drizzle CASCADE;");
  const { drizzle } = await import("drizzle-orm/postgres-js");
  const { migrate } = await import("drizzle-orm/postgres-js/migrator");
  await migrate(drizzle(sql), { migrationsFolder: new URL("../src/db/migrations", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1") });
  const Fastify = (await import("fastify")).default;
  const { installFeatureGuard } = await import("../src/middleware/feature-guard");
  const { API_MODULES } = await import("../src/api-modules");
  app = Fastify();
  installFeatureGuard(app, PREFIX);
  for (const mod of API_MODULES) await app.register(mod as any, { prefix: PREFIX });
  await app.ready();
  svc = await import("../src/modules/super-admin/admin-ops.service");
  tables = (await sql`SELECT table_name FROM information_schema.columns WHERE table_schema = 'public' AND column_name = 'tenant_id'`).map((r) => r.table_name);
  A = await seed("a"); B = await seed("b"); C = await seed("c");
});

after(async () => {
  await app?.close();
  await sql.end();
  const { closeDatabaseConnection } = await import("../src/db/connection");
  await closeDatabaseConnection();
  process.exit(0);
});

const preview = async (t: T) => data(await req("GET", `/super-admin/tenants/${t.id}/deletion-preview`));

test("prévia: só lê; contagens, logins, arquivos, sem bloqueios; só Super Admin", async () => {
  assert.equal((await req("GET", `/super-admin/tenants/${A.id}/deletion-preview`, undefined, null)).statusCode, 401);
  const before = await snapshot(A);
  const p = await preview(A);
  assert.equal(p.tenant.name, A.name);
  assert.equal(p.counts.clients, 1);
  assert.equal(p.counts.user_profiles, 2);
  assert.equal(p.counts.password_resets, 1);
  assert.equal(p.counts.tenants, 1);
  assert.equal(p.authUsers, 2);
  assert.deepEqual(p.uploads, { files: 2, bytes: 6 });
  assert.deepEqual(p.blocks, []);
  assert.match(p.previewHash, /^[0-9a-f]{32}$/);
  assert.deepEqual(await snapshot(A), before, "prévia não muda nada");
});

test("rota antiga DELETE /super-admin/tenants/:id está desativada (410) e não apaga nada", async () => {
  const before = await snapshot(A);
  const r = await req("DELETE", `/super-admin/tenants/${A.id}`);
  assert.deepEqual([r.statusCode, r.json().code], [410, "USE_NEW_DELETE"]);
  assert.deepEqual(await snapshot(A), before);
});

test("confirmação: nome errado, senha errada e prévia velha recusam; nada é apagado", async () => {
  svc.resetPasswordLocks();
  const p = await preview(A);
  const before = await snapshot(A);
  const nome = await req("POST", `/super-admin/tenants/${A.id}/delete`, { confirmName: A.name.toUpperCase(), password: "senha-do-sa", previewHash: p.previewHash });
  assert.deepEqual([nome.statusCode, nome.json().code], [400, "NAME_MISMATCH"]);
  const senha = await req("POST", `/super-admin/tenants/${A.id}/delete`, { confirmName: A.name, password: "errada", previewHash: p.previewHash });
  assert.deepEqual([senha.statusCode, senha.json().code], [403, "WRONG_PASSWORD"]);
  await sql`INSERT INTO clients (tenant_id, full_name) VALUES (${A.id}, 'Entrou depois da prévia')`;
  const velha = await req("POST", `/super-admin/tenants/${A.id}/delete`, { confirmName: A.name, password: "senha-do-sa", previewHash: p.previewHash });
  assert.deepEqual([velha.statusCode, velha.json().code], [409, "PREVIEW_CHANGED"]);
  await sql`DELETE FROM clients WHERE tenant_id = ${A.id} AND full_name = 'Entrou depois da prévia'`;
  assert.deepEqual(await snapshot(A), before);
  assert.equal(calls.filter((c) => c.startsWith("DELETE")).length, 0, "nenhum login apagado");
  svc.resetPasswordLocks();
});

test("bloqueios: conta protegida e assinatura ativa (ou Asaas fora do ar) recusam", async () => {
  await sql`UPDATE tenants SET is_protected = true WHERE id = ${C.id}`;
  let p = await preview(C);
  assert.deepEqual(p.blocks.map((b: any) => b.code), ["PROTECTED"]);
  let r = await req("POST", `/super-admin/tenants/${C.id}/delete`, { confirmName: C.name, password: "senha-do-sa", previewHash: p.previewHash });
  assert.deepEqual([r.statusCode, r.json().code], [409, "PROTECTED"]);
  await sql`UPDATE tenants SET is_protected = false, asaas_subscription_id = 'sub_123' WHERE id = ${C.id}`;
  asaasMode = "active";
  p = await preview(C);
  r = await req("POST", `/super-admin/tenants/${C.id}/delete`, { confirmName: C.name, password: "senha-do-sa", previewHash: p.previewHash });
  assert.deepEqual([r.statusCode, r.json().code], [409, "SUBSCRIPTION_ACTIVE"]);
  asaasMode = "down";
  assert.deepEqual((await preview(C)).blocks.map((b: any) => b.code), ["ASAAS_UNREACHABLE"]);
  asaasMode = "inactive";
  assert.deepEqual((await preview(C)).blocks, [], "assinatura cancelada no Asaas libera");
  await sql`UPDATE tenants SET asaas_subscription_id = NULL WHERE id = ${C.id}`;
  assert.ok((await snapshot(C)).tenants === 1);
});

test("falha no meio da transação: nada é apagado e a auditoria registra a falha", async () => {
  await sql.unsafe(`CREATE FUNCTION zs_falha() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'falha simulada'; END $$;
    CREATE TRIGGER zs_falha BEFORE DELETE ON leads FOR EACH ROW EXECUTE FUNCTION zs_falha();`);
  const before = await snapshot(C);
  const p = await preview(C);
  const r = await req("POST", `/super-admin/tenants/${C.id}/delete`, { confirmName: C.name, password: "senha-do-sa", previewHash: p.previewHash });
  await sql.unsafe("DROP TRIGGER zs_falha ON leads; DROP FUNCTION zs_falha();");
  assert.deepEqual([r.statusCode, r.json().code], [500, "DELETE_FAILED"], r.body);
  assert.deepEqual(await snapshot(C), before, "transação desfeita");
  assert.ok(existsSync(path.join(UPLOADS, C.id, "logo.png")), "arquivos intactos");
  const [op] = await sql`SELECT status, details FROM admin_operations WHERE target_tenant_id = ${C.id} ORDER BY started_at DESC LIMIT 1`;
  assert.deepEqual([op.status, op.details.step], ["failed", "transaction"]);
});

let backupDir = "";
let snapA: Record<string, number>;
test("excluir: apaga tudo da conta, outras contas intactas, backup conferível, auditoria sobrevive", async () => {
  snapA = await snapshot(A);
  const othersBefore = [await snapshot(B), await snapshot(C)];
  const p = await preview(A);
  calls.length = 0;
  const r = await req("POST", `/super-admin/tenants/${A.id}/delete`, { confirmName: A.name, password: "senha-do-sa", previewHash: p.previewHash });
  assert.equal(r.statusCode, 200, r.body);
  const d = data(r);
  assert.equal(d.complete, true);
  assert.deepEqual(d.cleanup.whatsapp, { ok: true, skipped: "sem WhatsApp" });
  backupDir = d.backupDir;

  const after = await snapshot(A);
  assert.deepEqual(Object.entries(after).filter(([, n]) => n > 0), [], "nada da conta sobrou");
  assert.deepEqual([await snapshot(B), await snapshot(C)], othersBefore, "outras contas com as mesmas contagens");
  for (const [t, n] of Object.entries(snapA)) assert.equal(d.deleted[t] ?? 0, n, `apagadas em ${t}`);

  assert.deepEqual(calls.filter((c) => c.startsWith("DELETE")).sort(), A.users.map((u) => `DELETE http://gotrue.test/admin/users/${u}`).sort(), "logins apagados no GoTrue");
  assert.ok(!existsSync(path.join(UPLOADS, A.id)), "pasta de arquivos apagada");
  assert.ok(existsSync(path.join(UPLOADS, B.id, "logo.png")), "arquivos das outras contas intactos");

  const files = readdirSync(backupDir).sort();
  assert.deepEqual(files, ["dados.json.gz", "gotrue-usuarios.json.gz", "manifest.json", "sha256sums", "uploads"]);
  for (const line of readFileSync(path.join(backupDir, "sha256sums"), "utf8").trim().split("\n")) {
    const [hash, name] = line.split(/\s+/);
    assert.equal(createHash("sha256").update(readFileSync(path.join(backupDir, name))).digest("hex"), hash, name);
  }
  const manifest = JSON.parse(readFileSync(path.join(backupDir, "manifest.json"), "utf8"));
  assert.deepEqual([manifest.tenant.id, manifest.counts.clients, manifest.authUsers.exported], [A.id, 1, 2]);
  const dados = JSON.parse(gunzipSync(readFileSync(path.join(backupDir, "dados.json.gz"))).toString());
  assert.equal(dados.tenants[0].name, A.name);
  assert.ok(existsSync(path.join(backupDir, "uploads", "fotos", "a.jpg")));

  const [op] = await sql`SELECT status, actor, target_tenant_name, counts, details FROM admin_operations WHERE target_tenant_id = ${A.id} AND status = 'done'`;
  assert.deepEqual([op.actor, op.target_tenant_name, op.counts.clients, op.details.backupDir], ["sa@test", A.name, 1, backupDir]);
});

test("restaurar a partir do backup: confere sem aplicar; aplica e volta com as mesmas contagens e logins", async () => {
  const { restoreFromBackup } = await import("../src/modules/super-admin/tenant-restore");
  const dry = await restoreFromBackup(backupDir, { apply: false });
  assert.deepEqual([dry.applied, (await snapshot(A)).tenants], [false, 0], "conferir não grava nada");
  calls.length = 0;
  const r = await restoreFromBackup(backupDir, { apply: true });
  assert.equal(r.logins, 2);
  assert.equal(calls.filter((c) => c.startsWith("POST http://gotrue.test/admin/users")).length, 2);
  assert.deepEqual(await snapshot(A), snapA, "conta restaurada com as mesmas contagens");
  assert.ok(existsSync(path.join(UPLOADS, A.id, "fotos", "a.jpg")), "arquivos de volta");
  await assert.rejects(restoreFromBackup(backupDir, { apply: true }), /ainda existe/);
});

test("limpeza externa que falha fica pendente; 'tentar de novo' conclui", async () => {
  gotrueDeleteFails = true;
  const p = await preview(B);
  const r = await req("POST", `/super-admin/tenants/${B.id}/delete`, { confirmName: B.name, password: "senha-do-sa", previewHash: p.previewHash });
  assert.equal(r.statusCode, 200, r.body);
  const d = data(r);
  assert.equal(d.complete, false);
  assert.deepEqual(d.cleanup.gotrue.failedUserIds.sort(), [...B.users].sort());
  assert.equal((await snapshot(B)).clients, 0, "o banco foi apagado mesmo assim");
  gotrueDeleteFails = false;
  const retry = await req("POST", `/super-admin/operations/${d.operationId}/retry-cleanup`);
  assert.equal(retry.statusCode, 200, retry.body);
  assert.equal(data(retry).complete, true);
  const [op] = await sql`SELECT status FROM admin_operations WHERE id = ${d.operationId}`;
  assert.equal(op.status, "done");
  assert.equal(data(await req("POST", `/super-admin/operations/${d.operationId}/retry-cleanup`)).complete, true, "repetir de novo não quebra");
});
