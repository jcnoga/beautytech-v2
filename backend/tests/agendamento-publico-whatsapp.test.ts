// Agendamento pela página pública (09/10/2026): a confirmação por WhatsApp sai UMA vez (antes saíam 3),
// com a data do dia escolhido (Brasília, mesmo depois das 21h), também para quem tem e-mail.
// A Evolution é simulada: o fetch só conta as chamadas a /message/sendText.
// Uso: sh scripts/test-db.sh   (o banco de teste é APAGADO a cada execução)
import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import postgres from "postgres";

const DB_URL = process.env.TEST_DATABASE_URL ?? "";
if (!/test/i.test(new URL(DB_URL || "postgres://x/none").pathname)) {
  throw new Error("Defina TEST_DATABASE_URL com um banco cujo nome contenha 'test' (ele será apagado).");
}
Object.assign(process.env, {
  NODE_ENV: "test", POSTGRES_URL: DB_URL, POSTGRES_SSL: "false",
  GOTRUE_URL: "http://127.0.0.1:9", GOTRUE_JWT_SECRET: "test-secret-at-least-32-characters-long!!", GOTRUE_SERVICE_KEY: "x",
  RESEND_API_KEY: "re_test", SUPER_ADMIN_SECRET: "sa", WHATSAPP_SEND_ENABLED: "true",
});
const EVO = "http://evolution.teste";
let enviados: { url: string; body: any }[] = [];
globalThis.fetch = (async (url: any, init?: any) => {
  const u = String(url);
  if (u.startsWith(EVO + "/message/sendText/")) {
    enviados.push({ url: u, body: JSON.parse(init?.body ?? "{}") });
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  }
  throw new Error(`rede desligada no teste: ${u}`); // e-mail (Resend) não sai
}) as any;

const PREFIX = "/api/v1";
const DAY = "2030-01-03"; // quinta-feira
const sql = postgres(DB_URL, { max: 4, onnotice: () => {} });
let app: any;
let SLUG = "", P = "", S = "", C_EMAIL = "", C_SEM_EMAIL = "";
const agendar = (clientId: string, time: string) => app.inject({
  method: "POST", url: `${PREFIX}/public/appointments`,
  payload: { tenantSlug: SLUG, clientId, professionalId: P, serviceId: S, date: DAY, time },
});

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
  SLUG = "zap-" + Date.now();
  const [t] = await sql`INSERT INTO tenants (name, slug, business_type, plan_tier, trial_ends_at, whatsapp_mode, whatsapp_api_url, whatsapp_api_key, whatsapp_instance)
    VALUES ('Salão Zap', ${SLUG}, 'beauty_salon', 'trial', now() + interval '20 days', 'local', ${EVO}, 'k', 'inst-teste') RETURNING id`;
  P = (await sql`INSERT INTO professionals (tenant_id, full_name) VALUES (${t.id}, 'Marina') RETURNING id`)[0].id;
  S = (await sql`INSERT INTO services (tenant_id, name, duration_minutes, price) VALUES (${t.id}, 'Corte', 30, 50) RETURNING id`)[0].id;
  C_SEM_EMAIL = (await sql`INSERT INTO clients (tenant_id, full_name, whatsapp) VALUES (${t.id}, 'Ana', '(34) 99999-0001') RETURNING id`)[0].id;
  C_EMAIL = (await sql`INSERT INTO clients (tenant_id, full_name, whatsapp, email) VALUES (${t.id}, 'Bia', '34999990002', 'bia@exemplo.com') RETURNING id`)[0].id;
});

beforeEach(() => { enviados = []; });

after(async () => {
  await app?.close();
  await sql.end();
  const { closeDatabaseConnection } = await import("../src/db/connection");
  await closeDatabaseConnection();
  process.exit(0);
});

test("agendamento público: exatamente 1 WhatsApp, para o número com 55, com a data e a hora escolhidas", async () => {
  const r = await agendar(C_SEM_EMAIL, "10:00");
  assert.equal(r.statusCode, 201, r.body);
  assert.equal(enviados.length, 1, "uma confirmação só");
  assert.equal(enviados[0].url, `${EVO}/message/sendText/inst-teste`);
  assert.equal(enviados[0].body.number, "5534999990001");
  assert.match(enviados[0].body.text, /Ola Ana! Seu agendamento na Salão Zap/);
  assert.match(enviados[0].body.text, /Data: 03\/01\/2030\nHorario: 10:00/);
});

test("depois das 21h de Brasília a data continua a do dia escolhido (não a do dia seguinte em UTC)", async () => {
  const r = await agendar(C_SEM_EMAIL, "22:30");
  assert.equal(r.statusCode, 201, r.body);
  assert.equal(enviados.length, 1);
  assert.match(enviados[0].body.text, /Data: 03\/01\/2030\nHorario: 22:30/);
});

test("cliente com e-mail: o e-mail não impede o WhatsApp (e continua 1 só)", async () => {
  const r = await agendar(C_EMAIL, "15:00");
  assert.equal(r.statusCode, 201, r.body);
  assert.equal(enviados.length, 1);
  assert.equal(enviados[0].body.number, "5534999990002");
});

test("horário ocupado: nada é enviado", async () => {
  const r = await agendar(C_EMAIL, "10:00");
  assert.equal(r.statusCode, 409, r.body);
  assert.equal(enviados.length, 0);
});
