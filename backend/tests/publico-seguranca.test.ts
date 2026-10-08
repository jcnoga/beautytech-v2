// Rotas públicas (sem login), segurança de 08/10/2026:
// - "Meus agendamentos" por WhatsApp desligado (410);
// - cadastro de cliente da página de agendamento responde só o id (UUID) e se já existia; não devolve nome/e-mail;
//   não altera cadastro existente;
// - no máximo 10 tentativas por minuto por IP nas rotas públicas que gravam, e por telefone no cadastro.
// Uso: sh scripts/test-db.sh   (o banco de teste é APAGADO a cada execução)
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import postgres from "postgres";

const DB_URL = process.env.TEST_DATABASE_URL ?? "";
if (!/test/i.test(new URL(DB_URL || "postgres://x/none").pathname)) {
  throw new Error("Defina TEST_DATABASE_URL com um banco cujo nome contenha 'test' (ele será apagado).");
}
Object.assign(process.env, {
  NODE_ENV: "test", POSTGRES_URL: DB_URL, POSTGRES_SSL: "false",
  GOTRUE_URL: "http://127.0.0.1:9", GOTRUE_JWT_SECRET: "test-secret-at-least-32-characters-long!!", GOTRUE_SERVICE_KEY: "x",
  RESEND_API_KEY: "re_test", SUPER_ADMIN_SECRET: "sa", WHATSAPP_SEND_ENABLED: "false",
});
globalThis.fetch = (async (url: string) => { throw new Error(`rede desligada no teste: ${url}`); }) as any;

const PREFIX = "/api/v1";
const sql = postgres(DB_URL, { max: 4, onnotice: () => {} });
let app: any;
let SLUG = "", TID = "";
let ipSeq = 0;
const nextIp = () => `10.0.${Math.floor(++ipSeq / 250)}.${ipSeq % 250 + 1}`;
const register = (body: any, ip = nextIp()) =>
  app.inject({ method: "POST", url: `${PREFIX}/public/clients/register`, payload: { tenantSlug: SLUG, ...body }, remoteAddress: ip });

before(async () => {
  await sql.unsafe("DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public; DROP SCHEMA IF EXISTS drizzle CASCADE;");
  const { drizzle } = await import("drizzle-orm/postgres-js");
  const { migrate } = await import("drizzle-orm/postgres-js/migrator");
  await migrate(drizzle(sql), { migrationsFolder: new URL("../src/db/migrations", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1") });
  const Fastify = (await import("fastify")).default;
  const rateLimit = (await import("@fastify/rate-limit")).default;
  const { installFeatureGuard } = await import("../src/middleware/feature-guard");
  const { API_MODULES } = await import("../src/api-modules");
  app = Fastify();
  await app.register(rateLimit, { max: 1000, timeWindow: "1 minute" }); // como no server.ts (geral alto)
  installFeatureGuard(app, PREFIX);
  for (const mod of API_MODULES) await app.register(mod as any, { prefix: PREFIX });
  await app.ready();
  SLUG = "pub-" + Date.now();
  TID = (await sql`INSERT INTO tenants (name, slug, business_type, plan_tier, trial_ends_at)
    VALUES ('Salão Público', ${SLUG}, 'beauty_salon', 'trial', now() + interval '20 days') RETURNING id`)[0].id;
  await sql`INSERT INTO clients (tenant_id, full_name, whatsapp, email) VALUES (${TID}, 'Maria Real', '34999990001', 'maria@exemplo.com')`;
});

after(async () => {
  await app?.close();
  await sql.end();
  const { closeDatabaseConnection } = await import("../src/db/connection");
  await closeDatabaseConnection();
  process.exit(0);
});

test("Meus agendamentos por WhatsApp: desligado (410)", async () => {
  const r = await app.inject({ method: "GET", url: `${PREFIX}/public/my-appointments?whatsapp=34999990001` });
  assert.deepEqual([r.statusCode, r.json().code], [410, "UNAVAILABLE"]);
  assert.equal(r.json().data, undefined);
});

test("cadastro: cliente existente devolve só o id (UUID); nada de nome/e-mail; não altera o cadastro", async () => {
  await sql`UPDATE clients SET email = NULL WHERE tenant_id = ${TID}`;
  const r = await register({ fullName: "Outro Nome", whatsapp: "34999990001", email: "invasor@exemplo.com" });
  assert.equal(r.statusCode, 200, r.body);
  const d = r.json().data;
  assert.deepEqual(Object.keys(d).sort(), ["id", "isExisting"]);
  assert.equal(d.isExisting, true);
  assert.match(d.id, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/, "UUID, não sequencial");
  assert.ok(!r.body.includes("Maria") && !r.body.includes("@"), "nem nome nem e-mail na resposta");
  const [c] = await sql`SELECT full_name, email FROM clients WHERE id = ${d.id}`;
  assert.deepEqual(c, { full_name: "Maria Real", email: null }, "cadastro existente não muda");
});

test("cadastro: cliente novo devolve só o id e isExisting=false", async () => {
  const r = await register({ fullName: "Nova Cliente", whatsapp: "34999990002", email: "nova@exemplo.com" });
  assert.equal(r.statusCode, 201, r.body);
  assert.deepEqual(Object.keys(r.json().data).sort(), ["id", "isExisting"]);
  assert.equal(r.json().data.isExisting, false);
});

test("limite por IP: 10 por minuto nas rotas públicas que gravam; o 11º recebe 429", async () => {
  const ip = "10.9.9.9";
  const codes: number[] = [];
  for (let i = 0; i < 11; i++) codes.push((await register({ fullName: "X", whatsapp: `3488800${String(i).padStart(4, "0")}` }, ip)).statusCode);
  assert.ok(codes.slice(0, 10).every((c) => c === 201 || c === 200), codes.join(","));
  assert.equal(codes[10], 429);
  const appt = await app.inject({ method: "POST", url: `${PREFIX}/public/appointments`, payload: {}, remoteAddress: "10.8.8.8" });
  assert.equal(appt.statusCode, 400, "agendamento público também está sob o limite (aqui só valida o corpo)");
  let last = 0;
  for (let i = 0; i < 11; i++) last = (await app.inject({ method: "POST", url: `${PREFIX}/public/appointments`, payload: {}, remoteAddress: "10.8.8.8" })).statusCode;
  assert.equal(last, 429);
});

test("limite por telefone: o mesmo número de IPs diferentes, 11ª vez no minuto → 429", async () => {
  const codes: number[] = [];
  for (let i = 0; i < 11; i++) codes.push((await register({ fullName: "Y", whatsapp: "(34) 97777-0000" })).statusCode);
  assert.equal(codes.filter((c) => c === 429).length, 1, codes.join(","));
  assert.equal(codes[10], 429);
  const other = await register({ fullName: "Z", whatsapp: "34977770001" });
  assert.notEqual(other.statusCode, 429, "outro número não é afetado");
});
