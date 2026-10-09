// Agendamento pela página pública (09/10/2026): a confirmação por WhatsApp sai UMA vez (antes saíam 3),
// com a data do dia escolhido (Brasília, mesmo depois das 21h), também para quem tem e-mail.
// Pedido pendente diz "Recebemos seu pedido", não "confirmado" (WhatsApp e e-mail).
// Evolution e Resend simulados: o fetch registra as chamadas a /message/sendText e a api.resend.com/emails.
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
let emails: any[] = [];
let resend: "ok" | "erro" | "rede" = "ok";
const json = (b: any, status = 200) => new Response(JSON.stringify(b), { status, headers: { "Content-Type": "application/json" } });
globalThis.fetch = (async (url: any, init?: any) => {
  const u = String(url);
  if (u.startsWith(EVO + "/message/sendText/")) {
    enviados.push({ url: u, body: JSON.parse(init?.body ?? "{}") });
    return json({ ok: true });
  }
  if (u.startsWith("https://api.resend.com/emails")) {
    emails.push(JSON.parse(init?.body ?? "{}"));
    if (resend === "erro") return json({ statusCode: 422, name: "validation_error", message: "Invalid `to` field" }, 422);
    if (resend === "rede") throw new Error("getaddrinfo ENOTFOUND api.resend.com");
    return json({ id: "email-teste" });
  }
  throw new Error(`rede desligada no teste: ${u}`);
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

beforeEach(() => { enviados = []; emails = []; resend = "ok"; });
const registroEmail = (apptId: string) =>
  sql`SELECT channel, status, error_msg, sent_at IS NOT NULL AS tem_envio, client_id, subject FROM notifications
      WHERE reference_id = ${apptId} AND channel = 'email'`;

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
  assert.equal(enviados[0].body.text,
    "Olá Ana! Recebemos seu pedido de agendamento para 03/01/2030 às 10:00.\n" +
    "Serviço: Corte\nProfissional: Marina\n" +
    "Assim que confirmarmos o horário, avisaremos por aqui.\n— Salão Zap",
    "agendamento público entra pendente: pedido recebido, não 'confirmado'");
});

test("texto: confirmado mantém 'confirmado'; nenhum dos dois fala em 'salão' fora da assinatura", async () => {
  const { bookingMessage } = await import("../src/modules/appointments/appointments.routes");
  const base = { clientName: "Ana", date: "03/01/2030", time: "10:00", serviceName: "Corte", professionalName: "Marina", tenantName: "Barbearia Zenon" };
  const ok = bookingMessage({ ...base, pending: false });
  assert.match(ok, /^Olá Ana! Seu agendamento para 03\/01\/2030 às 10:00 está confirmado\./);
  assert.match(ok, /\n— Barbearia Zenon$/);
  for (const m of [ok, bookingMessage({ ...base, pending: true })]) {
    assert.ok(!/sal[aã]o/i.test(m.replace(/\n— .*$/, "")), m);
    assert.ok(!/\bOla\b/.test(m), m);
  }
});

test("depois das 21h de Brasília a data continua a do dia escolhido (não a do dia seguinte em UTC)", async () => {
  const r = await agendar(C_SEM_EMAIL, "22:30");
  assert.equal(r.statusCode, 201, r.body);
  assert.equal(enviados.length, 1);
  assert.match(enviados[0].body.text, /para 03\/01\/2030 às 22:30\./);
});

test("cliente com e-mail: o e-mail não impede o WhatsApp (e continua 1 só)", async () => {
  const r = await agendar(C_EMAIL, "15:00");
  assert.equal(r.statusCode, 201, r.body);
  assert.equal(enviados.length, 1);
  assert.equal(enviados[0].body.number, "5534999990002");
  assert.equal(emails.length, 1);
  assert.equal(emails[0].subject, "Pedido de agendamento recebido - Salão Zap");
  assert.match(emails[0].html, /Recebemos seu pedido de agendamento/);
  assert.ok(!/Confirmado/i.test(emails[0].html), "e-mail do pedido pendente não diz 'confirmado'");
});

test("e-mail enviado: registrado em notifications como sent", async () => {
  const r = await agendar(C_EMAIL, "08:00");
  assert.equal(r.statusCode, 201, r.body);
  const rows = await registroEmail(r.json().data.id);
  assert.equal(rows.length, 1);
  assert.deepEqual({ ...rows[0] }, { channel: "email", status: "sent", error_msg: null, tem_envio: true, client_id: C_EMAIL,
    subject: "Pedido de agendamento recebido - Salão Zap" });
});

for (const [modo, motivo] of [["erro", /validation_error: Invalid `to` field/], ["rede", /application_error: Unable to fetch data/]] as const) {
  test(`e-mail falha (${modo}): registrado como failed com o motivo, nunca "sent"; o WhatsApp sai mesmo assim`, async () => {
    resend = modo;
    const hora = modo === "erro" ? "08:30" : "09:00";
    const r = await agendar(C_EMAIL, hora);
    assert.equal(r.statusCode, 201, r.body);
    assert.equal(emails.length, 1, "tentou o e-mail");
    assert.equal(enviados.length, 1, "WhatsApp saiu");
    const rows = await registroEmail(r.json().data.id);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].status, "failed");
    assert.equal(rows[0].tem_envio, false);
    assert.match(rows[0].error_msg, motivo);
  });
}

test("e-mail de dados de teste (.invalid): nada sai e nada é registrado como enviado", async () => {
  const c = (await sql`INSERT INTO clients (tenant_id, full_name, whatsapp, email)
    SELECT tenant_id, 'Teste', '34999990003', 'x@exemplo.invalid' FROM clients WHERE id = ${C_EMAIL} RETURNING id`)[0].id;
  const r = await agendar(c, "09:30");
  assert.equal(r.statusCode, 201, r.body);
  assert.equal(emails.length, 0);
  assert.equal((await registroEmail(r.json().data.id)).length, 0);
});

test("horário ocupado: nada é enviado", async () => {
  const r = await agendar(C_EMAIL, "10:00");
  assert.equal(r.statusCode, 409, r.body);
  assert.equal(enviados.length, 0);
});
