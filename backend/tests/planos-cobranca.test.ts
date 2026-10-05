// Cobrança e plano gratuito: preço semestral/anual é POR MÊS (total = preço × meses) e o Básico pago
// não é tratado como gratuito (só o trial vencido sem assinatura é).
// Uso: sh scripts/test-db.sh   (o banco de teste é APAGADO a cada execução)
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { SignJWT } from "jose";

const DB_URL = process.env.TEST_DATABASE_URL ?? "";
if (!/test/i.test(new URL(DB_URL || "postgres://x/none").pathname)) {
  throw new Error("Defina TEST_DATABASE_URL com um banco cujo nome contenha 'test' (ele será apagado).");
}
const SECRET = "test-secret-at-least-32-characters-long!!";
Object.assign(process.env, {
  NODE_ENV: "test", POSTGRES_URL: DB_URL, POSTGRES_SSL: "false",
  GOTRUE_URL: "http://127.0.0.1:9", GOTRUE_JWT_SECRET: SECRET, GOTRUE_SERVICE_KEY: "nao-usado",
  RESEND_API_KEY: "re_test", SUPER_ADMIN_SECRET: "super-admin-test", WHATSAPP_SEND_ENABLED: "false",
});
globalThis.fetch = (async () => { throw new Error("rede desligada no teste"); }) as any;

const PREFIX = "/api/v1";
const sql = postgres(DB_URL, { max: 2, onnotice: () => {} });
let app: any;

async function token(authUserId: string) {
  return new SignJWT({ role: "authenticated" }).setProtectedHeader({ alg: "HS256" })
    .setSubject(authUserId).setAudience("authenticated").setExpirationTime("1h").sign(new TextEncoder().encode(SECRET));
}
async function seed(label: string, planTier: string, trialEndsAt: Date) {
  // Sem limite próprio da conta (vazio = segue o plano; migration 0007), para valer o limite do plano.
  const [t] = await sql`INSERT INTO tenants (name, slug, plan_tier, trial_ends_at)
    VALUES (${"Conta " + label}, ${label + "-" + Date.now()}, ${planTier}, ${trialEndsAt}) RETURNING id`;
  const owner = randomUUID();
  await sql`INSERT INTO user_profiles (tenant_id, auth_user_id, full_name, role) VALUES (${t.id}, ${owner}, 'Dono', 'owner')`;
  return { id: t.id as string, token: await token(owner) };
}
const call = (method: string, url: string, tok: string, body?: unknown) =>
  app.inject({ method, url: PREFIX + url, headers: { authorization: `Bearer ${tok}` }, payload: body as any });
const data = (res: any) => res.json().data;
const DAY = 86_400_000;

before(async () => {
  await sql.unsafe("DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public; DROP SCHEMA IF EXISTS drizzle CASCADE;");
  const { drizzle } = await import("drizzle-orm/postgres-js");
  const { migrate } = await import("drizzle-orm/postgres-js/migrator");
  await migrate(drizzle(sql), { migrationsFolder: new URL("../src/db/migrations", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1") });
  const Fastify = (await import("fastify")).default;
  const m = await import("../src/modules/all-modules");
  app = Fastify();
  for (const mod of [m.clientsModule, m.superAdminModule]) await app.register(mod as any, { prefix: PREFIX });
  await app.ready();
});

after(async () => {
  await app?.close();
  await sql.end();
  const { closeDatabaseConnection } = await import("../src/db/connection");
  await closeDatabaseConnection();
  process.exit(0);
});

test("cobrança: preço semestral/anual é POR MÊS (total = preço × meses)", async () => {
  const { calcPlanAmount } = await import("../src/modules/billing/billing.service");
  const plans = { pro: { monthlyPrice: 100, semiannualPrice: 90, annualPrice: 80 }, basic: { monthlyPrice: 50, semiannualPrice: null, annualPrice: null } };
  assert.equal(calcPlanAmount("pro", "monthly", plans), 100);
  assert.equal(calcPlanAmount("pro", "semiannual", plans), 540, "90 × 6, não 90");
  assert.equal(calcPlanAmount("pro", "annual", plans), 960, "80 × 12, não 80");
  assert.equal(calcPlanAmount("basic", "semiannual", plans), 270, "sem preço do período: mensal com 10% de desconto");
  assert.equal(calcPlanAmount("basic", "annual", plans), 480, "sem preço do período: mensal com 20% de desconto");
});

test("Básico pago não é gratuito: sem limite de clientes do gratuito e com todos os recursos", async () => {
  const t = await seed("basico-pago", "basic", new Date(Date.now() - 30 * DAY));
  await sql`INSERT INTO clients (tenant_id, full_name) SELECT ${t.id}, 'C' || g FROM generate_series(1, 40) g`;
  const novo = await call("POST", "/clients", t.token, { fullName: "41" });
  assert.ok(novo.statusCode < 300, novo.body);
  const info = data(await call("GET", "/plan-info", t.token));
  assert.equal(info.isFree, false);
  assert.equal(info.features.whatsapp, true);
  assert.equal(info.maxAppointmentsMonth, -1);
});

test("trial vencido continua gratuito; trial em dia não", async () => {
  const vencido = await seed("trial-vencido", "trial", new Date(Date.now() - DAY));
  await sql`INSERT INTO clients (tenant_id, full_name) SELECT ${vencido.id}, 'C' || g FROM generate_series(1, 30) g`;
  assert.equal((await call("POST", "/clients", vencido.token, { fullName: "31" })).statusCode, 403, "limite de 30 do gratuito");
  const info = data(await call("GET", "/plan-info", vencido.token));
  assert.equal(info.isFree, true);
  assert.equal(info.features.whatsapp, false);
  const emDia = await seed("trial-em-dia", "trial", new Date(Date.now() + 10 * DAY));
  assert.equal(data(await call("GET", "/plan-info", emDia.token)).isFree, false);
});
