// Recepção Automática (09/10/2026): contato novo recebe o nome do WhatsApp (pushName) no {nome}; cliente cadastrado
// continua com o nome do cadastro; sem nome utilizável, o {nome} some sem deixar buraco ("Oi! Seja ...").
// Evolution simulada: o fetch registra o texto de cada /message/sendText.
// Uso: sh scripts/test-db.sh   (o banco de teste é APAGADO a cada execução)
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import postgres from "postgres";
import { firstNameFrom, fillAutoReply, phoneVariants, NEW_CONTACT_DEFAULTS, NEW_CONTACT_OLD_DEFAULTS } from "../src/modules/auto-reply/auto-reply.text";

const DB_URL = process.env.TEST_DATABASE_URL ?? "";
if (!/test/i.test(new URL(DB_URL || "postgres://x/none").pathname)) {
  throw new Error("Defina TEST_DATABASE_URL com um banco cujo nome contenha 'test' (ele será apagado).");
}
Object.assign(process.env, {
  NODE_ENV: "test", POSTGRES_URL: DB_URL, POSTGRES_SSL: "false",
  GOTRUE_URL: "http://127.0.0.1:9", GOTRUE_JWT_SECRET: "test-secret-at-least-32-characters-long!!", GOTRUE_SERVICE_KEY: "x",
  RESEND_API_KEY: "re_test", SUPER_ADMIN_SECRET: "sa", WHATSAPP_SEND_ENABLED: "true", FRONTEND_URL: "https://site.teste",
});
const EVO = "http://evolution.teste";
const enviados: { number: string; text: string }[] = [];
globalThis.fetch = (async (url: any, init?: any) => {
  const u = String(url);
  if (u.startsWith(EVO + "/message/sendText/")) {
    enviados.push(JSON.parse(init?.body ?? "{}"));
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  }
  throw new Error(`rede desligada no teste: ${u}`);
}) as any;

const PREFIX = "/api/v1";
const INST = "inst-recepcao";
const sql = postgres(DB_URL, { max: 4, onnotice: () => {} });
let app: any;
let SLUG = "";

/** Manda uma mensagem recebida pelo webhook da Evolution e espera a resposta automática (ou 1,5 s sem nada). */
async function recebe(phone: string, pushName?: string) {
  const antes = enviados.length;
  const r = await app.inject({
    method: "POST", url: `${PREFIX}/webhooks/evolution/${INST}`,
    payload: { event: "messages.upsert", instance: INST, data: { key: { remoteJid: `${phone}@s.whatsapp.net`, fromMe: false }, pushName, message: { conversation: "oi" } } },
  });
  assert.equal(r.statusCode, 200);
  for (let i = 0; i < 30 && enviados.length === antes; i++) await new Promise((res) => setTimeout(res, 50));
  return enviados.slice(antes);
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
  SLUG = "recepcao-" + Date.now();
  const [t] = await sql`INSERT INTO tenants (name, slug, business_type, plan_tier, trial_ends_at, whatsapp_mode, whatsapp_api_url, whatsapp_api_key, whatsapp_instance)
    VALUES ('Salão Recepção', ${SLUG}, 'beauty_salon', 'trial', now() + interval '20 days', 'local', ${EVO}, 'k', ${INST}) RETURNING id`;
  await sql`INSERT INTO auto_reply_settings (tenant_id, is_enabled, reply_delay_min_seconds, reply_delay_max_seconds) VALUES (${t.id}, true, 0, 0)`;
  // Uma mensagem ativa por público, para o texto ser previsível.
  await sql`INSERT INTO auto_reply_messages (tenant_id, audience, message) VALUES
    (${t.id}, 'new_contact', ${NEW_CONTACT_DEFAULTS[9]}),
    (${t.id}, 'existing_client', 'Olá {nome}! Que bom te ver por aqui de novo. Quer agendar seu próximo horário? {link}')`;
  await sql`INSERT INTO clients (tenant_id, full_name, whatsapp) VALUES (${t.id}, 'Carla Mendes', '(34) 99999-0005')`;
});

after(async () => {
  await sql.end();
  const { closeDatabaseConnection } = await import("../src/db/connection");
  await closeDatabaseConnection();
  process.exit(0);
});

test("firstNameFrom: primeira palavra, só letras, inicial maiúscula; inválido = vazio", () => {
  assert.equal(firstNameFrom("Maria Souza"), "Maria");
  assert.equal(firstNameFrom("  joão  "), "João");
  assert.equal(firstNameFrom("ANA PAULA"), "Ana");
  assert.equal(firstNameFrom("~Bia🌸"), "Bia");
  assert.equal(firstNameFrom("McDonald"), "McDonald", "mistura de maiúsculas fica como está");
  assert.equal(firstNameFrom("Anne-Marie"), "Anne-Marie");
  assert.equal(firstNameFrom("Ana123"), "Ana", "números só na ponta saem");
  for (const ruim of ["", "   ", null, undefined, "🌸🌸", "~", "5534999990001", "A", "R2D2", "x".repeat(21)])
    assert.equal(firstNameFrom(ruim), "", String(ruim));
});

test("fillAutoReply: com nome; sem nome o {nome} some sem deixar buraco", () => {
  const L = "https://l";
  assert.equal(fillAutoReply("Oi, {nome}! Seja bem-vindo(a). {link}", "Maria", L), "Oi, Maria! Seja bem-vindo(a). https://l");
  assert.equal(fillAutoReply("Oi, {nome}! Seja bem-vindo(a). {link}", "", L), "Oi! Seja bem-vindo(a). https://l");
  assert.equal(fillAutoReply("Olá {nome}! Que bom. {link}", "", L), "Olá! Que bom. https://l");
  assert.equal(fillAutoReply("Oi {nome}, tudo bem? {link}", "", L), "Oi, tudo bem? https://l");
  assert.equal(fillAutoReply("Oi, {nome}, tudo certo? {link}", "", L), "Oi, tudo certo? https://l");
  assert.equal(fillAutoReply("{nome}, seu horário: {link}", "", L), "seu horário: https://l");
  // Os 10 padrões novos, sem nome, ficam iguais aos antigos (ninguém recebe texto pior do que antes).
  NEW_CONTACT_DEFAULTS.forEach((m, i) => assert.equal(fillAutoReply(m, "", "{link}"), NEW_CONTACT_OLD_DEFAULTS[i], m));
});

test("webhook: contato novo recebe o nome do WhatsApp", async () => {
  const [m] = await recebe("5534999990001", "Maria Souza 💇");
  assert.equal(m?.number, "5534999990001");
  assert.equal(m?.text, `Oi, Maria! Seja bem-vindo(a) ao nosso salão. Agende seu horário por aqui: https://site.teste/agendar/${SLUG}/booking`);
});

test("webhook: sem nome utilizável (emoji, vazio, ausente) sai sem o nome e sem buraco", async () => {
  for (const [phone, push] of [["5534999990002", "🌸🌸"], ["5534999990003", ""], ["5534999990004", undefined]] as const) {
    const [m] = await recebe(phone, push);
    assert.equal(m?.text, `Oi! Seja bem-vindo(a) ao nosso salão. Agende seu horário por aqui: https://site.teste/agendar/${SLUG}/booking`, String(push));
  }
});

test("webhook: cliente cadastrado usa o nome do cadastro, não o do WhatsApp", async () => {
  const [m] = await recebe("5534999990005", "Apelido Qualquer");
  assert.match(m?.text ?? "", /^Olá Carla! Que bom te ver por aqui de novo\./);
});

test("phoneVariants: com e sem 55, com e sem o 9", () => {
  assert.deepEqual(phoneVariants("5534999990005").sort(), ["34999990005", "3499990005", "5534999990005", "553499990005"].sort());
  assert.deepEqual(phoneVariants("553499990005").sort(), ["3499990005", "34999990005", "553499990005", "5534999990005"].sort());
  assert.deepEqual(phoneVariants("(34) 3333-4444").sort(), ["3433334444", "34933334444", "553433334444", "5534933334444"].sort());
  assert.deepEqual(phoneVariants(""), []);
});

test("webhook: cliente cadastrado com o 9 é reconhecido quando o WhatsApp manda o número sem o 9", async () => {
  const [m] = await recebe("553499990005", "Outro Apelido");
  assert.equal(m?.number, "553499990005", "responde no número que escreveu");
  assert.match(m?.text ?? "", /^Olá Carla! /);
});

test("webhook: mensagem enviada por nós (fromMe) não gera resposta", async () => {
  const antes = enviados.length;
  await app.inject({
    method: "POST", url: `${PREFIX}/webhooks/evolution/${INST}`,
    payload: { event: "messages.upsert", data: { key: { remoteJid: "5534999990006@s.whatsapp.net", fromMe: true }, pushName: "Eu" } },
  });
  await new Promise((res) => setTimeout(res, 300));
  assert.equal(enviados.length, antes);
});
