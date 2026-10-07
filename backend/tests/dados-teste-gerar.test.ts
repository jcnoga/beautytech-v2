// Dados de teste (Super Admin): "Gerar dados de teste" — só em conta de teste, nunca com assinatura ativa, dentro dos
// limites do plano (senão recusa sem criar nada), criado pelas rotas do app com contatos fictícios, tudo registrado
// no lote; falha no meio desfaz tudo; registros reais e outras contas intactos; conta com lote não assina plano.
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
let asaasActive = false;
const calls: string[] = [];
globalThis.fetch = (async (url: string) => {
  calls.push(url);
  if (url.startsWith("http://asaas.test/subscriptions/")) {
    return new Response(JSON.stringify({ status: asaasActive ? "ACTIVE" : "INACTIVE" }), { status: 200, headers: { "content-type": "application/json" } });
  }
  throw new Error(`rede desligada no teste: ${url}`);
}) as any;

const PREFIX = "/api/v1";
const sql = postgres(DB_URL, { max: 6, onnotice: () => {} });
let app: any;
let guard: typeof import("../src/modules/super-admin/test-data.guard");
const SA = jwt.sign({ email: "sa@test", role: "super_admin" }, SA_SECRET, { expiresIn: "1h" });
const req = (method: string, url: string, payload?: any, tok: string | null = SA) =>
  app.inject({ method, url: PREFIX + url, headers: tok ? { authorization: `Bearer ${tok}` } : {}, payload });
const data = (r: any) => r.json().data;

type T = { id: string; token: string; realClient: string };
let SALON: T, PIL: T, PLAIN: T, OTHER: T;
let tables: string[] = [];

async function seed(label: string, businessType: string, isTest: boolean): Promise<T> {
  const [t] = await sql`INSERT INTO tenants (name, slug, business_type, plan_tier, trial_ends_at, is_test_account)
    VALUES (${"Conta " + label}, ${label + "-" + Date.now()}, ${businessType}, 'trial', now() + interval '20 days', ${isTest}) RETURNING id`;
  const owner = randomUUID();
  await sql`INSERT INTO user_profiles (tenant_id, auth_user_id, full_name, role) VALUES (${t.id}, ${owner}, 'Dono', 'owner')`;
  const [c] = await sql`INSERT INTO clients (tenant_id, full_name, whatsapp) VALUES (${t.id}, 'Cliente Real', '(34) 99999-0000') RETURNING id`;
  const token = await new SignJWT({ role: "authenticated" }).setProtectedHeader({ alg: "HS256" }).setSubject(owner)
    .setAudience("authenticated").setExpirationTime("1h").sign(new TextEncoder().encode(SECRET));
  return { id: t.id, token, realClient: c.id };
}
async function counts(t: T) {
  const out: Record<string, number> = {};
  for (const tb of tables) {
    const n = Number((await sql.unsafe(`SELECT count(*)::int n FROM "${tb}" WHERE tenant_id = $1`, [t.id]))[0].n);
    if (n) out[tb] = n;
  }
  return out;
}

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
  guard = await import("../src/modules/super-admin/test-data.guard");
  tables = (await sql`SELECT c.table_name FROM information_schema.columns c JOIN information_schema.tables t USING (table_schema, table_name)
    WHERE c.table_schema = 'public' AND c.column_name = 'tenant_id' AND t.table_type = 'BASE TABLE'`).map((r) => r.table_name);
  SALON = await seed("salao", "beauty_salon", true);
  PIL = await seed("pilates", "pilates", true);
  PLAIN = await seed("comum", "beauty_salon", false);
  OTHER = await seed("outra", "pilates", true);
});

after(async () => {
  await app?.close();
  await sql.end();
  const { closeDatabaseConnection } = await import("../src/db/connection");
  await closeDatabaseConnection();
  process.exit(0);
});

test("conta que não é de teste: recusa (409) sem criar nada; só Super Admin", async () => {
  const before = await counts(PLAIN);
  const r = await req("POST", `/super-admin/tenants/${PLAIN.id}/test-data`);
  assert.deepEqual([r.statusCode, r.json().code], [409, "NOT_TEST_ACCOUNT"]);
  assert.deepEqual(await counts(PLAIN), before);
  assert.equal((await req("POST", `/super-admin/tenants/${SALON.id}/test-data`, undefined, SALON.token)).statusCode, 401, "login de empresa não serve");
  const g = await req("GET", `/super-admin/tenants/${PLAIN.id}/test-data`);
  assert.deepEqual(data(g).blocks.map((b: any) => b.code), ["NOT_TEST_ACCOUNT"]);
});

let salonBatch = "";
test("salão: gera pelas rotas do app, tudo no lote, contatos fictícios, nomes com [TESTE]", async () => {
  const otherBefore = await counts(OTHER);
  const r = await req("POST", `/super-admin/tenants/${SALON.id}/test-data`);
  assert.equal(r.statusCode, 201, r.body);
  const d = data(r);
  salonBatch = d.batchId;
  assert.deepEqual(d.counts, { professionals: 2, services: 3, clients: 5, appointments: 8, financial_transactions: 4, financial_accounts: 1 });
  const [{ n }] = await sql`SELECT count(*)::int n FROM test_batch_items WHERE batch_id = ${salonBatch}`;
  assert.equal(n, 23, "um item por registro criado");
  const cl = await sql`SELECT c.full_name, c.whatsapp, c.email FROM clients c JOIN test_batch_items i ON i.record_id = c.id AND i.batch_id = ${salonBatch}`;
  assert.equal(cl.length, 5);
  for (const c of cl) {
    assert.match(c.full_name, /^\[TESTE\] /);
    assert.equal(guard.isFakePhone(c.whatsapp), true, c.whatsapp);
    assert.equal(guard.isFakeEmail(c.email), true, c.email);
  }
  const [{ svcItems }] = await sql`SELECT count(*)::int "svcItems" FROM appointment_services s JOIN test_batch_items i ON i.record_id = s.appointment_id AND i.batch_id = ${salonBatch}`;
  assert.equal(svcItems, 8, "itens dos agendamentos criados pela rota");
  const [b] = await sql`SELECT status FROM test_batches WHERE id = ${salonBatch}`;
  assert.equal(b.status, "ready");
  const [op] = await sql`SELECT status, counts, actor FROM admin_operations WHERE operation = 'test_generate' AND target_tenant_id = ${SALON.id}`;
  assert.deepEqual([op.status, op.counts.clients, op.actor], ["done", 5, "sa@test"]);
  assert.deepEqual(await counts(OTHER), otherBefore, "outra conta intacta");
  assert.equal((await sql`SELECT count(*)::int n FROM clients WHERE id = ${SALON.realClient}`)[0].n, 1, "cliente real intacto");
  assert.deepEqual(calls.filter((u) => !u.startsWith("http://asaas.test")), [], "nenhuma chamada externa");
});

test("Pilates: alunos, instrutoras, planos, matrículas com mensalidades, grade e interessados", async () => {
  const r = await req("POST", `/super-admin/tenants/${PIL.id}/test-data`);
  assert.equal(r.statusCode, 201, r.body);
  const d = data(r);
  assert.deepEqual(d.counts, { professionals: 2, membership_plans: 2, clients: 6, membership_enrollments: 5, class_schedules: 3, leads: 3 });
  const [{ parcelas }] = await sql`SELECT count(*)::int parcelas FROM financial_transactions f JOIN test_batch_items i ON i.record_id = f.enrollment_id AND i.batch_id = ${d.batchId}`;
  assert.ok(parcelas >= 5, `mensalidades geradas pelas matrículas: ${parcelas}`);
  const [{ fichas }] = await sql`SELECT count(*)::int fichas FROM student_profiles p JOIN test_batch_items i ON i.record_id = p.client_id AND i.batch_id = ${d.batchId}`;
  assert.equal(fichas, 6);
  const leads = await sql`SELECT l.name, l.whatsapp, l.status FROM leads l JOIN test_batch_items i ON i.record_id = l.id AND i.batch_id = ${d.batchId} ORDER BY l.name`;
  assert.deepEqual(leads.map((l) => [l.status, guard.isFakePhone(l.whatsapp)]), [["trial", true], ["interested", true], ["interested", true]]);
});

test("limites do plano: se não couber, recusa antes e não cria nada", async () => {
  await sql`UPDATE tenants SET max_clients = 8 WHERE id = ${SALON.id}`; // tem 1 real + 5 de teste; mais 5 não cabem
  const before = await counts(SALON);
  const g = data(await req("GET", `/super-admin/tenants/${SALON.id}/test-data`));
  assert.deepEqual(g.blocks.map((b: any) => b.code), ["PLAN_LIMIT"]);
  const r = await req("POST", `/super-admin/tenants/${SALON.id}/test-data`);
  assert.deepEqual([r.statusCode, r.json().code], [409, "PLAN_LIMIT"]);
  assert.match(r.json().error, /clientes: tem 6, o lote cria 5, o plano permite 8/);
  assert.deepEqual(await counts(SALON), before, "nada criado (nem lote)");
  await sql`UPDATE tenants SET max_clients = NULL WHERE id = ${SALON.id}`;
});

test("assinatura ativa no Asaas: recusa; conta com lote de teste não consegue assinar plano", async () => {
  await sql`UPDATE tenants SET asaas_subscription_id = 'sub_1' WHERE id = ${OTHER.id}`;
  asaasActive = true;
  const r = await req("POST", `/super-admin/tenants/${OTHER.id}/test-data`);
  assert.deepEqual([r.statusCode, r.json().code], [409, "SUBSCRIPTION_ACTIVE"]);
  asaasActive = false;
  await sql`UPDATE tenants SET asaas_subscription_id = NULL WHERE id = ${OTHER.id}`;

  for (const url of ["/billing/subscribe", "/billing/checkout-pix", "/billing/checkout-card"]) {
    const s = await app.inject({ method: "POST", url: PREFIX + url, headers: { authorization: `Bearer ${SALON.token}` }, payload: { tier: "pro", period: "monthly" } });
    assert.deepEqual([s.statusCode, s.json().code], [409, "TEST_DATA_ACTIVE"], url);
  }
});

test("falha no meio da geração: tudo desfeito, lote 'failed', auditoria registra; reais intactos", async () => {
  const before = await counts(OTHER);
  await sql.unsafe(`CREATE FUNCTION zs_falha() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'falha simulada'; END $$;
    CREATE TRIGGER zs_falha BEFORE INSERT ON class_schedules FOR EACH ROW EXECUTE FUNCTION zs_falha();`);
  const r = await req("POST", `/super-admin/tenants/${OTHER.id}/test-data`);
  await sql.unsafe("DROP TRIGGER zs_falha ON class_schedules; DROP FUNCTION zs_falha();");
  assert.ok(r.statusCode >= 400, r.body);
  assert.equal(r.json().code, "GENERATION_FAILED");
  const after = await counts(OTHER);
  delete after.test_batches;
  assert.deepEqual(after, before, "nenhum registro do lote ficou (nem mensalidades, nem fichas)");
  const [b] = await sql`SELECT status FROM test_batches WHERE tenant_id = ${OTHER.id}`;
  assert.equal(b.status, "failed");
  const [op] = await sql`SELECT status FROM admin_operations WHERE operation = 'test_generate' AND target_tenant_id = ${OTHER.id} ORDER BY started_at DESC LIMIT 1`;
  assert.equal(op.status, "failed");
});
