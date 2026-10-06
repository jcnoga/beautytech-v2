// plan_settings gravado como número (não mais texto JSON): conversão do valor, rotas do Super Admin (por nicho e geral),
// script de conserto dos valores antigos (scripts/consertar-plan-settings.sql, com os valores reais da produção de 06/10)
// e leitores (preços, limites, página pública) iguais antes e depois.
// Uso: sh scripts/test-db.sh   (o banco de teste é APAGADO a cada execução)
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import postgres from "postgres";
import jwt from "jsonwebtoken";

const DB_URL = process.env.TEST_DATABASE_URL ?? "";
if (!/test/i.test(new URL(DB_URL || "postgres://x/none").pathname)) {
  throw new Error("Defina TEST_DATABASE_URL com um banco cujo nome contenha 'test' (ele será apagado).");
}
const SA_SECRET = "super-admin-test";
Object.assign(process.env, {
  NODE_ENV: "test", POSTGRES_URL: DB_URL, POSTGRES_SSL: "false",
  GOTRUE_URL: "http://127.0.0.1:9", GOTRUE_JWT_SECRET: "test-secret-at-least-32-characters-long!!", GOTRUE_SERVICE_KEY: "x",
  RESEND_API_KEY: "re_test", SUPER_ADMIN_SECRET: SA_SECRET, WHATSAPP_SEND_ENABLED: "false",
});
globalThis.fetch = (async () => { throw new Error("rede desligada no teste"); }) as any;

const PREFIX = "/api/v1";
const sql = postgres(DB_URL, { max: 4, onnotice: () => {} });
let app: any;
const SA = jwt.sign({ email: "sa@test", role: "super_admin" }, SA_SECRET, { expiresIn: "1h" });
const req = (method: string, url: string, payload?: any, tok: string | null = SA) =>
  app.inject({ method, url: PREFIX + url, headers: tok ? { authorization: `Bearer ${tok}` } : {}, payload });
const typeOf = async (key: string) => (await sql`SELECT jsonb_typeof(value) t, value FROM plan_settings WHERE key = ${key}`)[0];

// Valores exatamente como estão na produção em 06/10/2026 (value::text), inclusive as camadas do ai_monthly_budget_brl.
const PROD: [string, string][] = [
  ["ai_monthly_budget_brl", String.raw`"\"\\\"\\\\\\\"\\\\\\\\\\\\\\\"0\\\\\\\\\\\\\\\"\\\\\\\"\\\"\""`],
  ["free_max_clients", `"20"`], ["trial_days", `"30"`], ["plan_basic_monthly", `"29.9"`], ["plan_basic_semiannual", `"26.9"`],
  ["plan_basic_annual", `"23.9"`], ["plan_basic_max_users", `"1"`], ["plan_pro_monthly", `"49.9"`], ["plan_pro_max_users", `"3"`],
  ["niche.pilates.trial.days", `"30"`], ["niche.pilates.trial.max_clients", `"50"`], ["niche.pilates.basic.monthly", `"29.9"`],
  ["niche.beauty_salon.trial.max_clients", `"20"`], ["whatsapp_send_start_hour", `8`], ["whatsapp_send_end_hour", `"18"`],
  ["texto_de_verdade", `"abc"`],
];
async function loadProdValues() {
  await sql`DELETE FROM plan_settings`;
  for (const [k, v] of PROD) await sql.unsafe(`INSERT INTO plan_settings (key, value) VALUES ($1, $2::text::jsonb)`, [k, v]);
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
});

after(async () => {
  await app?.close();
  await sql.end();
  const { closeDatabaseConnection } = await import("../src/db/connection");
  await closeDatabaseConnection();
  process.exit(0);
});

test("settingValueToStore: número vira número (sem camadas de aspas); texto e objeto ficam", async () => {
  const { settingValueToStore: f } = await import("../src/modules/billing/plan-limits.service");
  assert.equal(f(30), 30);
  assert.equal(f("30"), 30);
  assert.equal(f(" 29.9 "), 29.9);
  assert.equal(f("29,9"), 29.9);
  assert.equal(f(`"\\"0\\""`), 0);
  assert.equal(f(JSON.parse(PROD[0][1])), 0, "valor real com várias camadas");
  assert.equal(f("abc"), "abc");
  assert.equal(f(`"abc"`), "abc");
  assert.deepEqual(f({ a: 1 }), { a: 1 });
});

test("gravação pelo Super Admin (por nicho e geral) guarda NÚMERO no jsonb", async () => {
  await sql`DELETE FROM plan_settings`;
  const r = await req("PUT", "/super-admin/plan-settings/niche/pilates", { values: { "trial.days": 45, "basic.monthly": "39.9" } });
  assert.equal(r.statusCode, 200, r.body);
  assert.deepEqual({ ...(await typeOf("niche.pilates.trial.days")) }, { t: "number", value: 45 });
  assert.deepEqual({ ...(await typeOf("niche.pilates.basic.monthly")) }, { t: "number", value: 39.9 });

  await loadProdValues();
  for (const [k, v] of [["trial_days", "30"], ["free_max_clients", 25], ["ai_monthly_budget_brl", JSON.parse(PROD[0][1])]] as const) {
    const p = await req("PATCH", `/super-admin/plan-settings/${k}`, { value: v });
    assert.equal(p.statusCode, 200, p.body);
    assert.equal((await typeOf(k)).t, "number", k);
  }
  assert.deepEqual([(await typeOf("trial_days")).value, (await typeOf("free_max_clients")).value, (await typeOf("ai_monthly_budget_brl")).value], [30, 25, 0]);
  // salvar de novo o que a tela mostra não acumula camadas
  await req("PATCH", "/super-admin/plan-settings/trial_days", { value: "30" });
  assert.deepEqual({ ...(await typeOf("trial_days")) }, { t: "number", value: 30 });
  assert.equal((await req("PATCH", "/super-admin/plan-settings/trial_days", { value: 1 }, null)).statusCode, 401);
});

test("script de conserto: valores da produção viram números; texto de verdade fica; rodar de novo não muda nada", async () => {
  await loadProdValues();
  const planosAntes = (await req("GET", "/billing/plans?businessType=pilates", undefined, null)).json().data;
  const publicoAntes = (await req("GET", "/public/plan-settings", undefined, null)).json().data;
  const script = readFileSync(new URL("../scripts/consertar-plan-settings.sql", import.meta.url), "utf8");
  // uma conexão só, como o psql na VPS (o script tem BEGIN/COMMIT)
  const runScript = async () => { const one = postgres(DB_URL, { max: 1, onnotice: () => {} }); try { await one.unsafe(script); } finally { await one.end(); } };
  await runScript();
  const rows = await sql`SELECT key, jsonb_typeof(value) t, value FROM plan_settings ORDER BY key`;
  const by = Object.fromEntries(rows.map((r) => [r.key, r]));
  for (const [k] of PROD.filter(([k]) => k !== "texto_de_verdade")) assert.equal(by[k].t, "number", k);
  assert.deepEqual([by.trial_days.value, by.plan_basic_monthly.value, by.ai_monthly_budget_brl.value, by.whatsapp_send_start_hour.value, by["niche.pilates.trial.max_clients"].value],
    [30, 29.9, 0, 8, 50]);
  assert.deepEqual([by.texto_de_verdade.t, by.texto_de_verdade.value], ["string", "abc"]);

  assert.deepEqual((await req("GET", "/billing/plans?businessType=pilates", undefined, null)).json().data, planosAntes, "preços e limites iguais");
  const publico = (await req("GET", "/public/plan-settings", undefined, null)).json().data;
  assert.deepEqual(publico, publicoAntes, "página pública igual (continua em texto)");
  assert.ok(Object.values(publico).every((v) => typeof v === "string"));

  const antes2 = await sql`SELECT key, value, updated_at FROM plan_settings ORDER BY key`;
  await runScript();
  assert.deepEqual(await sql`SELECT key, value, updated_at FROM plan_settings ORDER BY key`, antes2, "rodar de novo não muda nada");
});
