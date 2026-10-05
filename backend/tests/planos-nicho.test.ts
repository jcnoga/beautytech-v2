// Planos da assinatura por nicho: ordem de leitura (nicho → geral → código), Trial da conta nova,
// limites de clientes/profissionais (só bloqueia NOVOS cadastros) e Super Admin.
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
const SA_SECRET = "super-admin-test";
Object.assign(process.env, {
  NODE_ENV: "test", POSTGRES_URL: DB_URL, POSTGRES_SSL: "false",
  GOTRUE_URL: "http://127.0.0.1:9", GOTRUE_JWT_SECRET: SECRET, GOTRUE_SERVICE_KEY: "nao-usado",
  RESEND_API_KEY: "re_test", SUPER_ADMIN_SECRET: SA_SECRET, WHATSAPP_SEND_ENABLED: "false",
});
globalThis.fetch = (async () => { throw new Error("rede desligada no teste"); }) as any;

const PREFIX = "/api/v1";
const sql = postgres(DB_URL, { max: 2, onnotice: () => {} });
let app: any;
let svc: typeof import("../src/modules/billing/plan-limits.service");
let sa: string;

async function token(authUserId: string) {
  return new SignJWT({ role: "authenticated" }).setProtectedHeader({ alg: "HS256" })
    .setSubject(authUserId).setAudience("authenticated").setExpirationTime("1h").sign(new TextEncoder().encode(SECRET));
}
/** Conta de teste. overrides: colunas de tenants (ex.: max_clients). */
async function seed(label: string, businessType: string, planTier: string, overrides: Record<string, unknown> = {}) {
  const trialEnds = new Date(Date.now() + 10 * 86_400_000);
  const [t] = await sql`INSERT INTO tenants (name, slug, business_type, plan_tier, trial_ends_at)
    VALUES (${"Conta " + label}, ${label + "-" + Date.now()}, ${businessType}, ${planTier}, ${trialEnds}) RETURNING id`;
  if (Object.keys(overrides).length) await sql`UPDATE tenants SET ${sql(overrides)} WHERE id = ${t.id}`;
  const owner = randomUUID();
  await sql`INSERT INTO user_profiles (tenant_id, auth_user_id, full_name, role) VALUES (${t.id}, ${owner}, 'Dono', 'owner')`;
  return { id: t.id as string, token: await token(owner) };
}
const call = (method: string, url: string, tok: string, body?: unknown) =>
  app.inject({ method, url: PREFIX + url, headers: { authorization: `Bearer ${tok}` }, payload: body as any });
const data = (res: any) => res.json().data;
const setSetting = (key: string, value: unknown) =>
  sql`INSERT INTO plan_settings (key, value) VALUES (${key}, ${sql.json(value as any)}) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`;

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
  svc = await import("../src/modules/billing/plan-limits.service");
  const jwt = (await import("jsonwebtoken")).default;
  sa = jwt.sign({ role: "super_admin" }, SA_SECRET, { expiresIn: "10m" });
});

after(async () => {
  await app?.close();
  await sql.end();
  const { closeDatabaseConnection } = await import("../src/db/connection");
  await closeDatabaseConnection();
  process.exit(0);
});

// ─── ordem de leitura (função única) ────────────────────────────────────────
test("leitura: valor do nicho vence o geral, que vence o padrão do código", () => {
  const s = new Map<string, unknown>([
    ["niche.pilates.trial.days", 45],
    ["trial_days", "30"],
    ["plan_pro_max_users", "\"7\""],
  ]);
  assert.deepEqual(svc.resolvePlanSetting(s, "pilates", "trial", "days"), { value: 45, source: "niche" });
  assert.deepEqual(svc.resolvePlanSetting(s, "barbershop", "trial", "days"), { value: 30, source: "general" });
  assert.deepEqual(svc.resolvePlanSetting(s, "barbershop", "pro", "max_professionals"), { value: 7, source: "general" }, "texto com aspas");
  assert.deepEqual(svc.resolvePlanSetting(s, "barbershop", "trial", "max_professionals"), { value: 2, source: "code" });
  assert.deepEqual(svc.resolvePlanSetting(s, "barbershop", "trial", "max_clients"), { value: 50, source: "code" });
  assert.deepEqual(svc.resolvePlanSetting(s, "pilates", "pro", "max_clients"), { value: null, source: "code" }, "pago sem limite = ilimitado");
  const vazio = new Map<string, unknown>([["niche.pilates.trial.days", ""], ["trial_days", null]]);
  assert.deepEqual(svc.resolvePlanSetting(vazio, "pilates", "trial", "days"), { value: 60, source: "code" }, "vazio = não definido");
});

test("plano que vale para os limites", () => {
  const now = new Date("2026-10-05T12:00:00Z");
  const future = new Date("2026-11-01T00:00:00Z"), past = new Date("2026-10-01T00:00:00Z");
  assert.equal(svc.limitPlanOf({ planTier: "trial", trialEndsAt: future }, now), "trial");
  assert.equal(svc.limitPlanOf({ planTier: "trial", trialEndsAt: past }, now), "free");
  assert.equal(svc.limitPlanOf({ planTier: "free", trialEndsAt: future }, now), "trial");
  assert.equal(svc.limitPlanOf({ planTier: "free", trialEndsAt: null }, now), "free");
  assert.equal(svc.limitPlanOf({ planTier: "pro", trialEndsAt: past }, now), "pro");
  assert.equal(svc.limitPlanOf({ planTier: "enterprise", trialEndsAt: null }, now), "super");
});

test("conta nova: Trial com os dias do nicho (ou geral, ou 60)", async () => {
  const now = new Date("2026-10-05T12:00:00Z");
  const padrao = await svc.newTenantPlan("pilates", now);
  assert.equal(padrao.planTier, "trial");
  assert.equal(padrao.trialDays, 60);
  assert.equal(padrao.trialEndsAt.toISOString(), "2026-12-04T12:00:00.000Z");
  await setSetting("trial_days", 30);
  assert.equal((await svc.newTenantPlan("barbershop", now)).trialDays, 30, "geral");
  await setSetting("niche.barbershop.trial.days", 45);
  assert.equal((await svc.newTenantPlan("barbershop", now)).trialDays, 45, "nicho");
  assert.equal((await svc.newTenantPlan("", now)).trialDays, 30, "sem nicho = salão, sem valor de nicho");
  await sql`DELETE FROM plan_settings`;
});

// ─── limites: só bloqueia NOVOS cadastros ───────────────────────────────────
test("acima do limite: quem já existe continua listado e editável; só o cadastro novo é recusado", async () => {
  const t = await seed("cheia", "beauty_salon", "pro", { max_clients: 2, max_professionals: 1 });
  await sql`INSERT INTO clients (tenant_id, full_name) VALUES (${t.id}, 'C1'), (${t.id}, 'C2'), (${t.id}, 'C3')`;
  await sql`INSERT INTO professionals (tenant_id, full_name) VALUES (${t.id}, 'P1'), (${t.id}, 'P2')`;

  const novo = await call("POST", "/clients", t.token, { fullName: "C4" });
  assert.equal(novo.statusCode, 403, novo.body);
  assert.equal(novo.json().code, "PLAN_LIMIT_CLIENTS");
  assert.match(novo.json().error, /até 2 clientes/);
  const prof = await call("POST", "/professionals", t.token, { fullName: "P3" });
  assert.equal(prof.statusCode, 403);
  assert.equal(prof.json().code, "PLAN_LIMIT_PROFESSIONALS");

  const lista = await call("GET", "/clients", t.token);
  assert.equal(lista.statusCode, 200);
  assert.equal(data(lista).length, 3, "nada escondido");
  const c1 = data(lista).find((c: any) => c.fullName === "C1");
  assert.equal((await call("GET", `/clients/${c1.id}`, t.token)).statusCode, 200);
  assert.equal((await call("PATCH", `/clients/${c1.id}`, t.token, { notes: "ok" })).statusCode, 200, "edição liberada");
  assert.equal(data(await call("GET", "/professionals", t.token)).length, 2);
  const [{ n }] = await sql`SELECT count(*)::int n FROM clients WHERE tenant_id = ${t.id}`;
  assert.equal(n, 3, "nada apagado");
  assert.equal((await call("GET", "/auth/me", t.token)).statusCode, 200, "acesso normal");
});

test("Pilates: limite de alunos e instrutores com 403 PLAN_LIMIT e mensagem clara", async () => {
  const t = await seed("studio", "pilates", "pro", { max_clients: 1, max_professionals: 1 });
  assert.equal((await call("POST", "/class-students", t.token, { fullName: "A1" })).statusCode, 201);
  const a2 = await call("POST", "/class-students", t.token, { fullName: "A2" });
  assert.equal(a2.statusCode, 403);
  assert.equal(a2.json().code, "PLAN_LIMIT");
  assert.match(a2.json().error, /até 1 alunos/);
  assert.equal((await call("POST", "/class-instructors", t.token, { fullName: "I1" })).statusCode, 201);
  const i2 = await call("POST", "/class-instructors", t.token, { fullName: "I2" });
  assert.equal(i2.statusCode, 403);
  assert.equal(i2.json().code, "PLAN_LIMIT");
  assert.equal(data(await call("GET", "/class-students", t.token)).length, 1);
});

test("profissional apagado ou inativo não conta no limite", async () => {
  const t = await seed("inativos", "beauty_salon", "pro", { max_professionals: 1 });
  await sql`INSERT INTO professionals (tenant_id, full_name, is_active) VALUES (${t.id}, 'Inativo', false)`;
  await sql`INSERT INTO professionals (tenant_id, full_name, deleted_at) VALUES (${t.id}, 'Apagado', now())`;
  const r = await call("POST", "/professionals", t.token, { fullName: "Ativo" });
  assert.ok(r.statusCode < 300, r.body);
});

// ─── Super Admin ────────────────────────────────────────────────────────────
test("Super Admin: lê os 5 planos do nicho com a origem e grava/apaga valores", async () => {
  await sql`DELETE FROM plan_settings`;
  await setSetting("plan_pro_monthly", "59.9");
  const r = await call("GET", "/super-admin/plan-settings/niche/pilates", sa);
  assert.equal(r.statusCode, 200);
  assert.deepEqual(Object.keys(data(r)), ["trial", "free", "basic", "pro", "super"]);
  assert.deepEqual(data(r).trial.days, { value: 60, source: "code" });
  assert.deepEqual(data(r).pro.monthly, { value: 59.9, source: "general" });
  assert.deepEqual(data(r).pro.max_clients, { value: null, source: "code" });

  const put = await call("PUT", "/super-admin/plan-settings/niche/pilates", sa, { values: { "trial.days": 45, "pro.monthly": "109,90", "pro.max_clients": 200 } });
  assert.equal(put.statusCode, 200, put.body);
  assert.deepEqual(data(put).trial.days, { value: 45, source: "niche" });
  assert.deepEqual(data(put).pro.monthly, { value: 109.9, source: "niche" });
  assert.deepEqual(data(put).pro.max_clients, { value: 200, source: "niche" });
  const salao = data(await call("GET", "/super-admin/plan-settings/niche/beauty_salon", sa));
  assert.equal(salao.trial.days.value, 60, "outro nicho não muda");

  const limpa = await call("PUT", "/super-admin/plan-settings/niche/pilates", sa, { values: { "pro.max_clients": "", "pro.monthly": null } });
  assert.deepEqual(data(limpa).pro.max_clients, { value: null, source: "code" }, "vazio = ilimitado");
  assert.deepEqual(data(limpa).pro.monthly, { value: 59.9, source: "general" });
  await sql`DELETE FROM plan_settings`;
});

test("Super Admin: valida campo, valor e nicho; exige login de Super Admin", async () => {
  const put = (values: any, bt = "pilates", tok = sa) => call("PUT", `/super-admin/plan-settings/niche/${bt}`, tok, { values });
  assert.equal((await put({ "trial.monthly": 10 })).statusCode, 400, "trial não tem preço");
  assert.equal((await put({ "gold.days": 10 })).statusCode, 400);
  assert.equal((await put({ "trial.days": 0 })).statusCode, 400);
  assert.equal((await put({ "trial.days": 400 })).statusCode, 400);
  assert.equal((await put({ "pro.max_clients": -1 })).statusCode, 400);
  assert.equal((await put({ "pro.max_professionals": 1.5 })).statusCode, 400);
  assert.equal((await put({ "pro.monthly": "abc" })).statusCode, 400);
  assert.equal((await put({ "trial.days": 30 }, "padaria")).statusCode, 400);
  assert.equal((await put({ "trial.days": 30 }, "pilates", "x")).statusCode, 401);
  const [{ n }] = await sql`SELECT count(*)::int n FROM plan_settings WHERE key LIKE 'niche.%'`;
  assert.equal(n, 0, "nada gravado nos casos inválidos");
});

// ─── limite da conta vazio = segue o plano (migration 0007) ─────────────────
test("migration 0007: limites da conta podem ficar vazios e a conta nova nasce sem limite próprio", async () => {
  const cols = await sql`SELECT column_name, is_nullable, column_default FROM information_schema.columns
    WHERE table_name = 'tenants' AND column_name IN ('max_clients', 'max_professionals') ORDER BY column_name`;
  assert.deepEqual(cols.map((c: any) => [c.column_name, c.is_nullable, c.column_default]),
    [["max_clients", "YES", null], ["max_professionals", "YES", null]]);
  const t = await seed("nova", "pilates", "trial");
  const [row] = await sql`SELECT max_clients, max_professionals FROM tenants WHERE id = ${t.id}`;
  assert.deepEqual({ ...row }, { max_clients: null, max_professionals: null });
});

test("sem limite próprio: vale o plano do nicho (Trial do Pilates configurado no Super Admin)", async () => {
  await sql`DELETE FROM plan_settings`;
  await call("PUT", "/super-admin/plan-settings/niche/pilates", sa, { values: { "trial.max_clients": 2, "trial.max_professionals": 1 } });
  const p = await seed("trial-pilates", "pilates", "trial");
  assert.equal((await call("POST", "/class-students", p.token, { fullName: "A1" })).statusCode, 201);
  assert.equal((await call("POST", "/class-students", p.token, { fullName: "A2" })).statusCode, 201);
  const a3 = await call("POST", "/class-students", p.token, { fullName: "A3" });
  assert.equal(a3.statusCode, 403);
  assert.equal(a3.json().code, "PLAN_LIMIT");
  assert.equal((await call("POST", "/class-instructors", p.token, { fullName: "I1" })).statusCode, 201);
  assert.equal((await call("POST", "/class-instructors", p.token, { fullName: "I2" })).statusCode, 403);

  const s = await seed("trial-salao", "beauty_salon", "trial");
  await sql`INSERT INTO professionals (tenant_id, full_name) VALUES (${s.id}, 'P1')`;
  assert.ok((await call("POST", "/professionals", s.token, { fullName: "P2" })).statusCode < 300, "salão: trial padrão = 2");
  assert.equal((await call("POST", "/professionals", s.token, { fullName: "P3" })).statusCode, 403);

  const plan = data(await call("GET", "/plan-info", p.token));
  assert.equal(plan.limitPlan, "trial");
  assert.equal(plan.maxClients, 2);
  assert.equal(plan.features.whatsapp, true, "trial tudo incluso");
  await sql`DELETE FROM plan_settings`;
});

test("plano pago com máximo de clientes vazio = ilimitado; limite próprio da conta vence o plano", async () => {
  const t = await seed("pro-livre", "beauty_salon", "pro");
  await sql`INSERT INTO clients (tenant_id, full_name) SELECT ${t.id}, 'C' || g FROM generate_series(1, 120) g`;
  assert.equal((await call("POST", "/clients", t.token, { fullName: "Mais um" })).statusCode < 300, true);
  assert.equal(data(await call("GET", "/plan-info", t.token)).maxClients, null);
  await sql`UPDATE tenants SET max_clients = 121 WHERE id = ${t.id}`;
  assert.equal((await call("POST", "/clients", t.token, { fullName: "Passou" })).statusCode, 403);
});

test("trial vencido vira gratuito, com os limites do gratuito", async () => {
  const t = await seed("vencida", "barbershop", "trial");
  await sql`UPDATE tenants SET trial_ends_at = now() - interval '1 day' WHERE id = ${t.id}`;
  await sql`INSERT INTO clients (tenant_id, full_name) SELECT ${t.id}, 'C' || g FROM generate_series(1, 30) g`;
  const r = await call("POST", "/clients", t.token, { fullName: "31" });
  assert.equal(r.statusCode, 403, "gratuito padrão = 30 clientes");
  const info = data(await call("GET", "/plan-info", t.token));
  assert.equal(info.limitPlan, "free");
  assert.equal(info.features.whatsapp, false);
  assert.equal(data(await call("GET", "/clients", t.token)).length > 0, true, "clientes continuam visíveis");
});

// ─── preços por nicho: página de preços e checkout ──────────────────────────
test("cobrança: preço semestral/anual do Super Admin é POR MÊS (total = preço × meses)", async () => {
  const { calcPlanAmount } = await import("../src/modules/billing/billing.service");
  const plans = { pro: { monthlyPrice: 100, semiannualPrice: 90, annualPrice: 80 }, basic: { monthlyPrice: 50, semiannualPrice: null, annualPrice: null } };
  assert.equal(calcPlanAmount("pro", "monthly", plans), 100);
  assert.equal(calcPlanAmount("pro", "semiannual", plans), 540);
  assert.equal(calcPlanAmount("pro", "annual", plans), 960);
  assert.equal(calcPlanAmount("basic", "semiannual", plans), 270, "sem preço do período: mensal com 10% de desconto");
  assert.equal(calcPlanAmount("basic", "annual", plans), 480, "sem preço do período: mensal com 20% de desconto");
});

test("página de preços: /billing/plans devolve os preços do nicho pedido", async () => {
  await sql`DELETE FROM plan_settings`;
  await setSetting("plan_pro_monthly", "59.9");
  await call("PUT", "/super-admin/plan-settings/niche/pilates", sa, { values: { "pro.monthly": 109.9, "pro.max_professionals": 3 } });
  const pil = (await app.inject({ method: "GET", url: PREFIX + "/billing/plans?businessType=pilates" })).json().data;
  assert.equal(pil.pro.monthlyPrice, 109.9);
  assert.equal(pil.pro.professionals, 3);
  assert.equal(pil.pro.clients, null, "clientes ilimitados");
  const salao = (await app.inject({ method: "GET", url: PREFIX + "/billing/plans" })).json().data;
  assert.equal(salao.pro.monthlyPrice, 59.9, "sem nicho: salão (geral)");
  const pub = (await app.inject({ method: "GET", url: PREFIX + "/public/plan-settings" })).json().data;
  assert.equal(pub.plan_pro_monthly, "59.9", "página inicial pública: salão");
  assert.equal(pub.trial_days, "60");
});

test("checkout: cobra o preço do nicho da conta (Asaas simulado, sem rede)", async () => {
  await sql`DELETE FROM plan_settings`;
  await setSetting("plan_pro_semiannual", "53.9");
  await call("PUT", "/super-admin/plan-settings/niche/pilates", sa, { values: { "pro.monthly": 109.9, "pro.semiannual": 99.9 } });
  const t = await seed("checkout", "pilates", "trial");
  await sql`UPDATE tenants SET email = 'studio@teste.local', cpf_cnpj = '12345678909', asaas_customer_id = 'cus_teste' WHERE id = ${t.id}`;
  const calls: { method: string; url: string; body: any }[] = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async (url: any, init: any) => {
    calls.push({ method: init?.method, url: String(url), body: init?.body ? JSON.parse(init.body) : null });
    const body = String(url).endsWith("/payments") ? { id: "pay_teste", invoiceUrl: "https://exemplo.invalid/fatura" } : {};
    return new Response(JSON.stringify(body), { status: 200 });
  }) as any;
  let card: any;
  try { card = await call("POST", "/billing/checkout-card", t.token, { tier: "pro", period: "semiannual" }); }
  finally { globalThis.fetch = realFetch; }
  assert.equal(card.statusCode, 200, card.body);
  assert.equal(data(card).value, 599.4, "99,90 por mês × 6 (preço semestral do Pilates)");
  const pay = calls.find((c) => c.method === "POST" && c.url.endsWith("/payments"));
  assert.equal(pay?.body.value, 599.4, "valor enviado ao Asaas");
  assert.match(pay?.body.description, /Plano Pro/);
  await sql`DELETE FROM plan_settings`;
});

test("Básico pago não é tratado como gratuito (limites, recursos e menu)", async () => {
  const t = await seed("basico-pago", "beauty_salon", "basic");
  await sql`UPDATE tenants SET trial_ends_at = now() - interval '30 days' WHERE id = ${t.id}`;
  await sql`INSERT INTO clients (tenant_id, full_name) SELECT ${t.id}, 'C' || g FROM generate_series(1, 40) g`;
  assert.ok((await call("POST", "/clients", t.token, { fullName: "41" })).statusCode < 300, "sem o limite de 30 do gratuito");
  const info = data(await call("GET", "/plan-info", t.token));
  assert.equal(info.isFree, false);
  assert.equal(info.limitPlan, "basic");
  assert.equal(info.features.whatsapp, true);
  assert.equal(info.maxAppointmentsMonth, -1);
  const vencido = await seed("trial-vencido", "beauty_salon", "trial");
  await sql`UPDATE tenants SET trial_ends_at = now() - interval '1 day' WHERE id = ${vencido.id}`;
  assert.equal(data(await call("GET", "/plan-info", vencido.token)).isFree, true, "trial vencido continua gratuito");
});

test("migration 0008: conta com o padrão antigo de 1 profissional passa a seguir o plano", async () => {
  // A conversão dos dados é conferida no teste de ida e volta; aqui, que o limite vazio segue o Trial (2).
  const t = await seed("ex-padrao", "beauty_salon", "trial", { max_professionals: null });
  await sql`INSERT INTO professionals (tenant_id, full_name) VALUES (${t.id}, 'P1')`;
  assert.ok((await call("POST", "/professionals", t.token, { fullName: "P2" })).statusCode < 300);
});
