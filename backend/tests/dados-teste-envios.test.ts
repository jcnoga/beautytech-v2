// Dados de teste: nenhum efeito externo. Contato fictício (DDD 00 / .invalid) e registro de teste (test_batch_items)
// nunca recebem WhatsApp nem e-mail: envio direto, fila do WhatsApp, lembretes, reativação, envio manual.
// O WhatsApp fica LIGADO neste arquivo (WHATSAPP_SEND_ENABLED=true) com a Evolution simulada: cada mensagem que
// sairia é registrada em `sent`, e o teste confere que nenhuma foi para contato ou registro de teste.
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
  GOTRUE_URL: "http://127.0.0.1:9", GOTRUE_JWT_SECRET: SECRET, GOTRUE_SERVICE_KEY: "x",
  RESEND_API_KEY: "re_test", SUPER_ADMIN_SECRET: "sa", WHATSAPP_SEND_ENABLED: "true",
  WHATSAPP_API_URL: "http://evolution.test", WHATSAPP_API_KEY: "chave",
});

// Evolution simulada: lista de instâncias e envio de texto; registra o número de cada envio.
const sent: string[] = [];
globalThis.fetch = (async (url: string, init: any = {}) => {
  const json = (b: unknown) => new Response(JSON.stringify(b), { status: 200, headers: { "content-type": "application/json" } });
  if (url.startsWith("http://evolution.test/message/sendText/")) { sent.push(JSON.parse(init.body).number); return json({ key: { id: "x" } }); }
  if (url.startsWith("http://evolution.test/")) return json([]);
  throw new Error(`rede desligada no teste: ${url}`);
}) as any;

const PREFIX = "/api/v1";
const sql = postgres(DB_URL, { max: 4, onnotice: () => {} });
let app: any;
let ddb: any;
let guard: typeof import("../src/modules/super-admin/test-data.guard");
let T: { id: string; token: string };
let real: string, fake: string, disguised: string; // cliente real; de teste com contato fictício; de teste com telefone REAL
const REAL_PHONE = "(34) 99999-1111", DISGUISED_PHONE = "(34) 98888-2222";

async function token(u: string) {
  return new SignJWT({ role: "authenticated" }).setProtectedHeader({ alg: "HS256" }).setSubject(u)
    .setAudience("authenticated").setExpirationTime("1h").sign(new TextEncoder().encode(SECRET));
}
const req = (method: string, url: string, payload?: any) =>
  app.inject({ method, url: PREFIX + url, headers: { authorization: `Bearer ${T.token}` }, payload });
const digits = (p: string) => p.replace(/\D/g, "");

before(async () => {
  await sql.unsafe("DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public; DROP SCHEMA IF EXISTS drizzle CASCADE;");
  const { drizzle } = await import("drizzle-orm/postgres-js");
  const { migrate } = await import("drizzle-orm/postgres-js/migrator");
  ddb = drizzle(sql);
  await migrate(ddb, { migrationsFolder: new URL("../src/db/migrations", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1") });
  const Fastify = (await import("fastify")).default;
  const { installFeatureGuard } = await import("../src/middleware/feature-guard");
  const { API_MODULES } = await import("../src/api-modules");
  app = Fastify();
  installFeatureGuard(app, PREFIX);
  for (const mod of API_MODULES) await app.register(mod as any, { prefix: PREFIX });
  await app.ready();
  guard = await import("../src/modules/super-admin/test-data.guard");

  const [t] = await sql`INSERT INTO tenants (name, slug, business_type, plan_tier, trial_ends_at, whatsapp_mode, whatsapp_instance, is_test_account)
    VALUES ('Salão Envios', ${"envios-" + Date.now()}, 'beauty_salon', 'trial', now() + interval '20 days', 'cloud', 'inst-envios', true) RETURNING id`;
  const owner = randomUUID();
  await sql`INSERT INTO user_profiles (tenant_id, auth_user_id, full_name, role) VALUES (${t.id}, ${owner}, 'Dono', 'owner')`;
  T = { id: t.id, token: await token(owner) };
  const client = async (name: string, phone: string, email: string | null) =>
    (await sql`INSERT INTO clients (tenant_id, full_name, whatsapp, email, segment) VALUES (${t.id}, ${name}, ${phone}, ${email}, 'at_risk') RETURNING id`)[0].id as string;
  real = await client("Real Cliente", REAL_PHONE, "real@exemplo.com");
  fake = await client("[TESTE] Ana", guard.fakePhone(1), guard.fakeEmail(1));
  disguised = await client("[TESTE] Bia", DISGUISED_PHONE, null); // alguém trocou o telefone do registro de teste por um real
  const [b] = await sql`INSERT INTO test_batches (tenant_id, status, created_by) VALUES (${t.id}, 'ready', 'sa@test') RETURNING id`;
  for (const id of [fake, disguised]) await sql`INSERT INTO test_batch_items (batch_id, tenant_id, table_name, record_id) VALUES (${b.id}, ${t.id}, 'clients', ${id})`;
});

after(async () => {
  await app?.close();
  await sql.end();
  const { closeDatabaseConnection } = await import("../src/db/connection");
  await closeDatabaseConnection();
  process.exit(0);
});

test("contato fictício: formato reconhecido; números e e-mails reais não", () => {
  assert.equal(guard.fakePhone(7), "(00) 90000-0007");
  assert.equal(guard.fakeEmail(7), "teste.07@zensalon-teste.invalid");
  for (const p of ["(00) 90000-0001", "00900000001", "5500900000001", "+55 00 90000-0001"]) assert.equal(guard.isFakePhone(p), true, p);
  for (const p of ["(34) 99999-1111", "5534999991111", "0055 34 99999-1111", "34999991111", "", null, "000"]) assert.equal(guard.isFakePhone(p), false, String(p));
  for (const e of ["teste.01@zensalon-teste.invalid", "X@Y.INVALID"]) assert.equal(guard.isFakeEmail(e), true, e);
  for (const e of ["real@exemplo.com", "invalid@exemplo.com", "a@invalid.com", "", null]) assert.equal(guard.isFakeEmail(e), false, String(e));
});

test("e-mail: cliente do Resend protegido não envia para .invalid; mistura envia só para os reais", async () => {
  const calls: any[] = [];
  const client = guard.guardResend({ emails: { send: async (p: any) => { calls.push(p); return { data: { id: "1" }, error: null }; } } });
  const skipped: any = await client.emails.send({ to: guard.fakeEmail(1), subject: "x" });
  assert.equal(calls.length, 0);
  assert.equal(skipped.skipped, "destinatário de dados de teste");
  await client.emails.send({ to: [guard.fakeEmail(1), "real@exemplo.com"], subject: "x" });
  await client.emails.send({ to: "real@exemplo.com", subject: "x" });
  assert.deepEqual(calls.map((c) => c.to), [["real@exemplo.com"], "real@exemplo.com"]);
});

test("WhatsApp direto: telefone fictício é recusado antes de qualquer chamada; real sai", async () => {
  const { sendTextMessage } = await import("../src/modules/whatsapp/whatsapp.service");
  sent.length = 0;
  await assert.rejects(sendTextMessage("5500900000001", "oi", T.id), (e: any) => e.name === "TestContactBlockedError");
  const r = await req("POST", "/whatsapp/send-text", { number: guard.fakePhone(2), text: "oi" });
  assert.deepEqual([r.statusCode, r.json().code], [422, "TEST_CONTACT"]);
  await sendTextMessage("5534999991111", "oi", T.id);
  assert.deepEqual(sent, ["5534999991111"]);
});

test("fila do WhatsApp: notificação de registro de teste não sai (nem com telefone real); a do cliente real sai", async () => {
  const { processWhatsAppQueue } = await import("../src/jobs/whatsapp-worker");
  sent.length = 0;
  for (const c of [real, fake, disguised]) await sql`INSERT INTO notifications (tenant_id, client_id, channel, message, status) VALUES (${T.id}, ${c}, 'whatsapp', 'Olá', 'pending')`;
  await processWhatsAppQueue();
  assert.deepEqual(sent.map(digits), ["55" + digits(REAL_PHONE)]);
  const st = Object.fromEntries((await sql`SELECT client_id, status FROM notifications WHERE tenant_id = ${T.id}`).map((r) => [r.client_id, r.status]));
  assert.deepEqual([st[real], st[fake], st[disguised]], ["sent", "failed", "failed"]);
});

test("lembretes e reativação: só o cliente real entra na fila", async () => {
  const { checkAppointmentReminders, checkReactivation } = await import("../src/jobs/scheduler");
  await sql`DELETE FROM notifications WHERE tenant_id = ${T.id}`;
  for (const [trigger, msg] of [["appointment_reminder_24h", "Lembrete {nome}"], ["client_reactivation", "Saudade, {nome}"]]) {
    await sql`INSERT INTO message_templates (tenant_id, name, trigger, message, is_active) VALUES (${T.id}, ${trigger}, ${trigger}, ${msg}, true)`;
  }
  for (const c of [real, fake, disguised]) {
    await sql`INSERT INTO appointments (tenant_id, client_id, scheduled_at, ends_at, status) VALUES (${T.id}, ${c}, now() + interval '24 hours', now() + interval '25 hours', 'confirmed')`;
  }
  await checkAppointmentReminders();
  await checkReactivation();
  const rows = await sql`SELECT client_id, message FROM notifications WHERE tenant_id = ${T.id} ORDER BY message`;
  assert.deepEqual(rows.map((r) => [r.client_id, r.message]), [[real, "Lembrete Real"], [real, "Saudade, Real"]]);
});

test("envio manual: registro de teste recusado (422); cliente real entra na fila", async () => {
  for (const c of [fake, disguised]) {
    const r = await req("POST", "/automations/notifications/send-manual", { clientId: c, message: "oi" });
    assert.deepEqual([r.statusCode, r.json().code], [422, "TEST_RECORD"]);
  }
  const ok = await req("POST", "/automations/notifications/send-manual", { clientId: real, message: "oi" });
  assert.equal(ok.statusCode, 200, ok.body);
});

test("confirmar agendamento: registro de teste não recebe (nem com telefone real); cliente real recebe", async () => {
  sent.length = 0;
  for (const c of [disguised, real]) {
    const [a] = await sql`INSERT INTO appointments (tenant_id, client_id, scheduled_at, ends_at, status) VALUES (${T.id}, ${c}, now() + interval '3 days', now() + interval '3 days 1 hour', 'pending') RETURNING id`;
    const r = await req("POST", `/appointments/${a.id}/confirm`);
    assert.equal(r.statusCode, 200, r.body);
  }
  assert.deepEqual(sent.map(digits), ["55" + digits(REAL_PHONE)]);
});

test("conferência final: nenhuma mensagem saiu para contato ou registro de teste", () => {
  for (const n of sent) {
    assert.equal(guard.isFakePhone(n), false, n);
    assert.notEqual(digits(n).slice(-11), digits(DISGUISED_PHONE));
  }
});
