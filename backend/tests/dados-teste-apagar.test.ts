// Dados de teste (Super Admin): "Apagar dados de teste" — só as linhas do lote (anotadas + arrastadas pelas ligações),
// prévia com o que sai e o que está ligado a dados fora do lote; recusa (nada apagado) se algo arrastado estiver ligado
// a dado real; falha no meio não apaga nada; clique duplo no gerar e no apagar = um aceito e um 409.
// Uso: sh scripts/test-db.sh   (o banco de teste é APAGADO a cada execução)
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import jwt from "jsonwebtoken";
import { SignJWT } from "jose";

const DB_URL = process.env.TEST_DATABASE_URL ?? "";
if (!/test/i.test(new URL(DB_URL || "postgres://x/none").pathname)) {
  throw new Error("Defina TEST_DATABASE_URL com um banco cujo nome contenha 'test' (ele será apagado).");
}
const SECRET = "test-secret-at-least-32-characters-long!!";
const SA_SECRET = "super-admin-test";
Object.assign(process.env, {
  NODE_ENV: "test", POSTGRES_URL: DB_URL, POSTGRES_SSL: "false",
  GOTRUE_URL: "http://127.0.0.1:9", GOTRUE_JWT_SECRET: SECRET, GOTRUE_SERVICE_KEY: "x",
  RESEND_API_KEY: "re_test", SUPER_ADMIN_SECRET: SA_SECRET, WHATSAPP_SEND_ENABLED: "false",
  ASAAS_API_KEY: "chave-teste", ASAAS_BASE_URL: "http://asaas.test",
});
globalThis.fetch = (async (url: string) => { throw new Error(`rede desligada no teste: ${url}`); }) as any;

const PREFIX = "/api/v1";
const sql = postgres(DB_URL, { max: 6, onnotice: () => {} });
let app: any;
const SA = jwt.sign({ email: "sa@test", role: "super_admin" }, SA_SECRET, { expiresIn: "1h" });
const req = (method: string, url: string, payload?: any, tok: string | null = SA) =>
  app.inject({ method, url: PREFIX + url, headers: tok ? { authorization: `Bearer ${tok}` } : {}, payload });
const data = (r: any) => r.json().data;

type T = { id: string; token: string; realClient: string };
let SALON: T, PIL: T, OTHER: T;
let tables: string[] = [];

async function seed(label: string, businessType: string): Promise<T> {
  const [t] = await sql`INSERT INTO tenants (name, slug, business_type, plan_tier, trial_ends_at, is_test_account)
    VALUES (${"Conta " + label}, ${label + "-" + Date.now()}, ${businessType}, 'trial', now() + interval '20 days', true) RETURNING id`;
  const owner = randomUUID();
  await sql`INSERT INTO user_profiles (tenant_id, auth_user_id, full_name, role) VALUES (${t.id}, ${owner}, 'Dono', 'owner')`;
  const [c] = await sql`INSERT INTO clients (tenant_id, full_name, whatsapp) VALUES (${t.id}, 'Cliente Real', '(34) 99999-0000') RETURNING id`;
  const token = await new SignJWT({ role: "authenticated" }).setProtectedHeader({ alg: "HS256" }).setSubject(owner)
    .setAudience("authenticated").setExpirationTime("1h").sign(new TextEncoder().encode(SECRET));
  return { id: t.id, token, realClient: c.id };
}
/** Linhas da conta por tabela (sem o registro dos próprios lotes). */
async function counts(t: T) {
  const out: Record<string, number> = {};
  for (const tb of tables) {
    if (tb === "test_batches" || tb === "test_batch_items") continue;
    const n = Number((await sql.unsafe(`SELECT count(*)::int n FROM "${tb}" WHERE tenant_id = $1`, [t.id]))[0].n);
    if (n) out[tb] = n;
  }
  return out;
}
async function generate(t: T): Promise<string> {
  const r = await req("POST", `/super-admin/tenants/${t.id}/test-data`);
  assert.equal(r.statusCode, 201, r.body);
  return data(r).batchId;
}
const batchStatus = async (id: string) => (await sql`SELECT status FROM test_batches WHERE id = ${id}`)[0].status;
const lastOp = async (t: T) => (await sql`SELECT status, counts, details FROM admin_operations
  WHERE operation = 'test_delete' AND target_tenant_id = ${t.id} ORDER BY started_at DESC LIMIT 1`)[0];

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
  tables = (await sql`SELECT c.table_name FROM information_schema.columns c JOIN information_schema.tables t USING (table_schema, table_name)
    WHERE c.table_schema = 'public' AND c.column_name = 'tenant_id' AND t.table_type = 'BASE TABLE'`).map((r) => r.table_name);
  SALON = await seed("salao", "beauty_salon");
  PIL = await seed("pilates", "pilates");
  OTHER = await seed("outra", "pilates");
});

after(async () => {
  await app?.close();
  await sql.end();
  const { closeDatabaseConnection } = await import("../src/db/connection");
  await closeDatabaseConnection();
  process.exit(0);
});

test("salão: prévia mostra o que sai; apagar remove só o lote; 2º apagar = 409; só Super Admin", async () => {
  const before = await counts(SALON);
  const otherBefore = await counts(OTHER);
  const batch = await generate(SALON);

  const p = data(await req("GET", `/super-admin/tenants/${SALON.id}/test-data/${batch}/preview`));
  assert.equal(p.toDelete.clients, 5);
  assert.equal(p.toDelete.appointments, 8);
  assert.equal(p.toDelete.appointment_services, 8, "itens dos agendamentos saem por arrasto");
  assert.deepEqual([p.linkedOutside, p.blocks], [{}, []]);

  assert.equal((await req("DELETE", `/super-admin/tenants/${SALON.id}/test-data/${batch}`, undefined, SALON.token)).statusCode, 401, "login de empresa não serve");
  const r = await req("DELETE", `/super-admin/tenants/${SALON.id}/test-data/${batch}`);
  assert.equal(r.statusCode, 200, r.body);
  assert.equal(data(r).deleted.clients, 5);
  assert.deepEqual(await counts(SALON), before, "a conta voltou ao que era antes do lote");
  assert.equal((await sql`SELECT count(*)::int n FROM clients WHERE id = ${SALON.realClient}`)[0].n, 1, "cliente real intacto");
  assert.deepEqual(await counts(OTHER), otherBefore, "outra conta intacta");
  assert.equal(await batchStatus(batch), "deleted");
  const op = await lastOp(SALON);
  assert.deepEqual([op.status, op.counts.clients], ["done", 5]);

  const again = await req("DELETE", `/super-admin/tenants/${SALON.id}/test-data/${batch}`);
  assert.deepEqual([again.statusCode, again.json().code], [409, "BATCH_NOT_READY"]);
});

test("aluna real inscrita em aula do lote: prévia mostra a ligação; apagar recusado e nada removido", async () => {
  const before = await counts(PIL);
  const batch = await generate(PIL);
  const [sch] = await sql`SELECT s.id, s.instructor_id FROM class_schedules s JOIN test_batch_items i ON i.record_id = s.id AND i.batch_id = ${batch} LIMIT 1`;
  const [sess] = await sql`INSERT INTO class_sessions (tenant_id, schedule_id, session_date, starts_at, ends_at, instructor_id, capacity)
    VALUES (${PIL.id}, ${sch.id}, current_date + 1, now() + interval '1 day', now() + interval '1 day 1 hour', ${sch.instructor_id}, 6) RETURNING id`;
  const [bk] = await sql`INSERT INTO class_bookings (tenant_id, session_id, client_id, kind) VALUES (${PIL.id}, ${sess.id}, ${PIL.realClient}, 'credit') RETURNING id`;

  const p = data(await req("GET", `/super-admin/tenants/${PIL.id}/test-data/${batch}/preview`));
  assert.deepEqual(p.linkedOutside, { class_bookings: 1 });
  assert.deepEqual(p.blocks.map((b: any) => b.code), ["LINKED_TO_REAL_DATA"]);
  assert.ok(p.toDelete.class_bookings >= 1 && p.toDelete.membership_enrollments === 5);

  const mid = await counts(PIL);
  const r = await req("DELETE", `/super-admin/tenants/${PIL.id}/test-data/${batch}`);
  assert.deepEqual([r.statusCode, r.json().code], [409, "LINKED_TO_REAL_DATA"]);
  assert.deepEqual(r.json().data.linked, { class_bookings: 1 });
  assert.match(r.json().error, /class_bookings: 1/);
  assert.deepEqual(await counts(PIL), mid, "nada removido");
  assert.equal(await batchStatus(batch), "ready");
  assert.equal((await lastOp(PIL)).status, "failed");

  // sem a inscrição real, o apagar passa (a aula gerada pelo horário do lote sai junto)
  await sql`DELETE FROM class_bookings WHERE id = ${bk.id}`;
  const ok = await req("DELETE", `/super-admin/tenants/${PIL.id}/test-data/${batch}`);
  assert.equal(ok.statusCode, 200, ok.body);
  const after = await counts(PIL);
  assert.equal(after.class_settings, 1, "regras do studio (criadas no 1º uso da conta) são configuração: ficam");
  delete after.class_settings;
  assert.deepEqual(after, before, "mensalidades, fichas, aulas e recursos criados pelo lote saíram; o real ficou");
  assert.equal((await sql`SELECT count(*)::int n FROM clients WHERE id = ${PIL.realClient}`)[0].n, 1);
});

let otherBatch = "";
test("falha no meio do apagar: nada removido, lote continua pronto, auditoria registra", async () => {
  otherBatch = await generate(OTHER);
  const mid = await counts(OTHER);
  await sql.unsafe(`CREATE FUNCTION zs_falha() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'falha simulada'; END $$;
    CREATE TRIGGER zs_falha BEFORE DELETE ON class_schedules FOR EACH ROW EXECUTE FUNCTION zs_falha();`);
  const r = await req("DELETE", `/super-admin/tenants/${OTHER.id}/test-data/${otherBatch}`);
  await sql.unsafe("DROP TRIGGER zs_falha ON class_schedules; DROP FUNCTION zs_falha();");
  assert.deepEqual([r.statusCode, r.json().code], [500, "DELETE_FAILED"]);
  assert.deepEqual(await counts(OTHER), mid, "nada removido");
  assert.equal(await batchStatus(otherBatch), "ready");
  assert.equal((await lastOp(OTHER)).status, "failed");
});

test("clique duplo no apagar: um apaga, o outro recebe 409", async () => {
  const rs = await Promise.all([1, 2].map(() => req("DELETE", `/super-admin/tenants/${OTHER.id}/test-data/${otherBatch}`)));
  const st = rs.map((r: any) => r.statusCode).sort();
  assert.deepEqual(st, [200, 409], rs.map((r: any) => r.body).join(" | "));
  assert.equal(rs.find((r: any) => r.statusCode === 409).json().code, "BATCH_NOT_READY");
  assert.equal(await batchStatus(otherBatch), "deleted");
});

test("clique duplo no gerar: um gera, o outro recebe 409 BATCH_RUNNING; um lote só", async () => {
  const rs = await Promise.all([1, 2].map(() => req("POST", `/super-admin/tenants/${SALON.id}/test-data`)));
  const st = rs.map((r: any) => r.statusCode).sort();
  assert.deepEqual(st, [201, 409], rs.map((r: any) => r.body).join(" | "));
  assert.equal(rs.find((r: any) => r.statusCode === 409).json().code, "BATCH_RUNNING");
  const [{ n }] = await sql`SELECT count(*)::int n FROM test_batches WHERE tenant_id = ${SALON.id} AND status IN ('generating','ready')`;
  assert.equal(n, 1);
});
