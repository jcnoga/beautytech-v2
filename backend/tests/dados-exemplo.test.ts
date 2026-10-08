// Dados de exemplo do cadastro: cada registro anotado num lote 'example' na criação; contatos fictícios; não impede
// assinar nem aparece no Super Admin; "Remover dados de exemplo" (só o dono) apaga só o lote, recusa se houver ligação
// com dado real e NUNCA apaga a conta, logins, configurações nem contas/categorias do Financeiro.
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
let svc: typeof import("../src/modules/example-data/example-data.service");
let guard: typeof import("../src/modules/super-admin/test-data.guard");
const SA = jwt.sign({ email: "sa@test", role: "super_admin" }, SA_SECRET, { expiresIn: "1h" });
const req = (method: string, url: string, tok: string, payload?: any) =>
  app.inject({ method, url: PREFIX + url, headers: { authorization: `Bearer ${tok}` }, payload });
const data = (r: any) => r.json().data;

type T = { id: string; owner: string; staff: string; realClient: string; protectedIds: Record<string, string> };
let SALON: T, CLINIC: T;
let tables: string[] = [];

const token = (sub: string) => new SignJWT({ role: "authenticated" }).setProtectedHeader({ alg: "HS256" }).setSubject(sub)
  .setAudience("authenticated").setExpirationTime("1h").sign(new TextEncoder().encode(SECRET));

async function seed(label: string, businessType: string): Promise<T> {
  const [t] = await sql`INSERT INTO tenants (name, slug, business_type, plan_tier, trial_ends_at)
    VALUES (${"Conta " + label}, ${label + "-" + Date.now()}, ${businessType}, 'trial', now() + interval '20 days') RETURNING id`;
  const ownerId = randomUUID(), staffId = randomUUID();
  const [up] = await sql`INSERT INTO user_profiles (tenant_id, auth_user_id, full_name, role) VALUES (${t.id}, ${ownerId}, 'Dono', 'owner') RETURNING id`;
  await sql`INSERT INTO user_profiles (tenant_id, auth_user_id, full_name, role) VALUES (${t.id}, ${staffId}, 'Recepção', 'receptionist')`;
  const [c] = await sql`INSERT INTO clients (tenant_id, full_name, whatsapp) VALUES (${t.id}, 'Cliente Real', '(34) 99999-0000') RETURNING id`;
  const [acc] = await sql`INSERT INTO financial_accounts (tenant_id, name, is_default) VALUES (${t.id}, 'Caixa', true) RETURNING id`;
  const [cat] = await sql`INSERT INTO financial_categories (tenant_id, name, type) VALUES (${t.id}, 'Serviços', 'revenue') RETURNING id`;
  const [cs] = await sql`INSERT INTO class_settings (tenant_id) VALUES (${t.id}) RETURNING id`;
  return { id: t.id, owner: await token(ownerId), staff: await token(staffId), realClient: c.id,
    protectedIds: { tenants: t.id, user_profiles: up.id, financial_accounts: acc.id, financial_categories: cat.id, class_settings: cs.id } };
}
async function counts(t: T) {
  const out: Record<string, number> = {};
  for (const tb of tables) {
    if (tb === "test_batches" || tb === "test_batch_items") continue;
    const n = Number((await sql.unsafe(`SELECT count(*)::int n FROM "${tb}" WHERE tenant_id = $1`, [t.id]))[0].n);
    if (n) out[tb] = n;
  }
  return out;
}
const exampleBatch = async (t: T) => (await sql`SELECT id, status, counts FROM test_batches WHERE tenant_id = ${t.id} AND kind = 'example' ORDER BY created_at DESC LIMIT 1`)[0];

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
  svc = await import("../src/modules/example-data/example-data.service");
  guard = await import("../src/modules/super-admin/test-data.guard");
  tables = (await sql`SELECT c.table_name FROM information_schema.columns c JOIN information_schema.tables t USING (table_schema, table_name)
    WHERE c.table_schema = 'public' AND c.column_name = 'tenant_id' AND t.table_type = 'BASE TABLE'`).map((r) => r.table_name);
  SALON = await seed("salao", "beauty_salon");
  CLINIC = await seed("clinica", "aesthetics_clinic");
});

after(async () => {
  await app?.close();
  await sql.end();
  const { closeDatabaseConnection } = await import("../src/db/connection");
  await closeDatabaseConnection();
  process.exit(0);
});

let salonBefore: Record<string, number> = {};
test("cadastro: cada registro de exemplo anotado no lote 'example'; contatos fictícios; uma vez só", async () => {
  salonBefore = await counts(SALON);
  const r = await svc.seedExampleData(SALON.id, "system:cadastro");
  assert.equal(r.counts.clients, 5);
  assert.equal(r.counts.appointments, 6);
  const b = await exampleBatch(SALON);
  assert.equal(b.status, "ready");
  const [{ n }] = await sql`SELECT count(*)::int n FROM test_batch_items WHERE batch_id = ${b.id}`;
  assert.equal(n, Object.values(r.counts).reduce((a, x) => a + x, 0), "um item por registro criado");
  const after = await counts(SALON);
  for (const [tb, k] of Object.entries(r.counts)) assert.equal((after[tb] ?? 0) - (salonBefore[tb] ?? 0), k, tb);
  const cls = await sql`SELECT c.whatsapp, c.email FROM clients c JOIN test_batch_items i ON i.record_id = c.id AND i.batch_id = ${b.id}`;
  for (const c of cls) assert.ok(guard.isFakePhone(c.whatsapp) && guard.isFakeEmail(c.email), `${c.whatsapp} ${c.email}`);
  const lds = await sql`SELECT l.whatsapp FROM leads l JOIN test_batch_items i ON i.record_id = l.id AND i.batch_id = ${b.id}`;
  assert.equal(lds.length, 3);
  for (const l of lds) assert.ok(guard.isFakePhone(l.whatsapp), l.whatsapp);
  const [{ protegidas }] = await sql`SELECT count(*)::int protegidas FROM test_batch_items WHERE batch_id = ${b.id}
    AND table_name IN ('tenants','user_profiles','class_settings','message_templates','financial_accounts','financial_categories')`;
  assert.equal(protegidas, 0, "conta, logins, configurações e Financeiro não entram no lote");
  await assert.rejects(svc.seedExampleData(SALON.id, "x"), (e: any) => e.code === "EXAMPLE_EXISTS");
});

test("exemplo não impede assinar e não aparece nos dados de teste do Super Admin", async () => {
  const s = await req("POST", "/billing/subscribe", SALON.owner, { tier: "pro", period: "monthly" });
  assert.notEqual(s.json().code, "TEST_DATA_ACTIVE", s.body);
  const g = data(await req("GET", `/super-admin/tenants/${SALON.id}/test-data`, SA));
  assert.deepEqual(g.batches, []);
});

test("prévia (só o dono): o que sai; recepção recebe 403", async () => {
  assert.equal((await req("GET", "/demo/examples", SALON.staff)).statusCode, 403);
  assert.equal((await req("DELETE", "/demo/examples", SALON.staff)).statusCode, 403);
  const p = data(await req("GET", "/demo/examples", SALON.owner));
  assert.equal(p.exists, true);
  assert.equal(p.toDelete.clients, 5);
  assert.equal(p.toDelete.appointments, 6);
  assert.deepEqual(p.linkedOutside, {});
  for (const t of ["tenants", "user_profiles", "class_settings", "message_templates", "financial_accounts", "financial_categories"]) {
    assert.equal(p.toDelete[t], undefined, t);
  }
});

test("agendamento de cliente real com profissional de exemplo: remover recusado, nada apagado", async () => {
  const b = await exampleBatch(SALON);
  const [prof] = await sql`SELECT p.id FROM professionals p JOIN test_batch_items i ON i.record_id = p.id AND i.batch_id = ${b.id} LIMIT 1`;
  const [ap] = await sql`INSERT INTO appointments (tenant_id, client_id, professional_id, status, scheduled_at, ends_at, duration_minutes)
    VALUES (${SALON.id}, ${SALON.realClient}, ${prof.id}, 'confirmed', now() + interval '2 days', now() + interval '2 days 1 hour', 60) RETURNING id`;
  const p = data(await req("GET", "/demo/examples", SALON.owner));
  assert.deepEqual(p.linkedOutside, { appointments: 1 });
  // o agendamento real sairia por arrasto (toDelete), mas não é exemplo: a tela bloqueada mostra só "examples"
  assert.equal(p.toDelete.appointments, 7);
  assert.equal(p.examples.appointments, 6);
  assert.equal(p.examples.clients, 5);
  const mid = await counts(SALON);
  const r = await req("DELETE", "/demo/examples", SALON.owner);
  assert.deepEqual([r.statusCode, r.json().code], [409, "LINKED_TO_REAL_DATA"]);
  assert.deepEqual(r.json().data.linked, { appointments: 1 });
  assert.deepEqual(await counts(SALON), mid, "nada apagado");
  await sql`DELETE FROM appointments WHERE id = ${ap.id}`;
});

test("agendamento criado à mão com cliente E profissional de exemplo: é dado real, remover recusado, nada apagado", async () => {
  const b = await exampleBatch(SALON);
  const [cl] = await sql`SELECT c.id FROM clients c JOIN test_batch_items i ON i.record_id = c.id AND i.batch_id = ${b.id} LIMIT 1`;
  const [prof] = await sql`SELECT p.id FROM professionals p JOIN test_batch_items i ON i.record_id = p.id AND i.batch_id = ${b.id} LIMIT 1`;
  const [ap] = await sql`INSERT INTO appointments (tenant_id, client_id, professional_id, status, scheduled_at, ends_at, duration_minutes)
    VALUES (${SALON.id}, ${cl.id}, ${prof.id}, 'confirmed', now() + interval '3 days', now() + interval '3 days 1 hour', 60) RETURNING id`;
  const p = data(await req("GET", "/demo/examples", SALON.owner));
  assert.deepEqual(p.linkedOutside, { appointments: 1 }, "não aponta para fora, mas não é do lote: conta como real");
  const mid = await counts(SALON);
  const r = await req("DELETE", "/demo/examples", SALON.owner);
  assert.deepEqual([r.statusCode, r.json().code], [409, "LINKED_TO_REAL_DATA"]);
  assert.match(r.json().error, /Há dados reais ligados aos dados de exemplo \(appointments: 1\)\. Nada foi apagado\./);
  assert.deepEqual(await counts(SALON), mid, "nada apagado, nem em cascata");
  await sql`DELETE FROM appointments WHERE id = ${ap.id}`;
});

test("histórico automático (aviso enviado a cliente de exemplo) não impede a remoção", async () => {
  const b = await exampleBatch(SALON);
  const [cl] = await sql`SELECT c.id FROM clients c JOIN test_batch_items i ON i.record_id = c.id AND i.batch_id = ${b.id} LIMIT 1`;
  await sql`INSERT INTO notifications (tenant_id, client_id, channel, message, status) VALUES (${SALON.id}, ${cl.id}, 'whatsapp', 'Lembrete', 'failed')`;
  const p = data(await req("GET", "/demo/examples", SALON.owner));
  assert.deepEqual(p.linkedOutside, {});
  assert.equal(p.toDelete.notifications, 1, "o aviso sai junto");
});

test("agendamento à mão com cliente de exemplo: CANCELADO continua impedindo; APAGADO no app libera e sai junto", async () => {
  const b = await exampleBatch(SALON);
  const [cl] = await sql`SELECT c.id FROM clients c JOIN test_batch_items i ON i.record_id = c.id AND i.batch_id = ${b.id} LIMIT 1`;
  const [prof] = await sql`SELECT p.id FROM professionals p JOIN test_batch_items i ON i.record_id = p.id AND i.batch_id = ${b.id} LIMIT 1`;
  const [svcRow] = await sql`SELECT s.id FROM services s JOIN test_batch_items i ON i.record_id = s.id AND i.batch_id = ${b.id} LIMIT 1`;
  const [ap] = await sql`INSERT INTO appointments (tenant_id, client_id, professional_id, status, scheduled_at, ends_at, duration_minutes)
    VALUES (${SALON.id}, ${cl.id}, ${prof.id}, 'confirmed', now() + interval '5 days', now() + interval '5 days 1 hour', 60) RETURNING id`;
  await sql`INSERT INTO appointment_services (appointment_id, service_id, price, tenant_id) VALUES (${ap.id}, ${svcRow.id}, 50, ${SALON.id})`;

  // cancelar pelo app (status 'cancelled'): continua sendo dado real
  assert.equal((await req("POST", `/appointments/${ap.id}/cancel`, SALON.owner, { reason: "teste" })).statusCode, 200);
  let p = data(await req("GET", "/demo/examples", SALON.owner));
  assert.deepEqual(p.linkedOutside, { appointments: 1, appointment_services: 1 }, "cancelado impede");
  assert.deepEqual([(await req("DELETE", "/demo/examples", SALON.owner)).statusCode], [409]);

  // apagar pelo app (só marca deleted_at): não impede mais; o agendamento e o item dele sairão junto
  assert.equal((await req("DELETE", `/appointments/${ap.id}`, SALON.owner)).statusCode, 204);
  const [{ marcado }] = await sql`SELECT deleted_at IS NOT NULL AS marcado FROM appointments WHERE id = ${ap.id}`;
  assert.equal(marcado, true, "o app só marca como apagado; o registro continua no banco");
  p = data(await req("GET", "/demo/examples", SALON.owner));
  assert.deepEqual(p.linkedOutside, {}, "apagado libera");
  assert.equal(p.toDelete.appointments, 7, "os 6 do exemplo + o apagado");
  // (a remoção em si é feita no teste seguinte, que confere que a conta volta ao que era antes do exemplo)
});

test("remover: só o exemplo sai; conta, logins, configurações e Financeiro ficam, mesmo se anotados no lote", async () => {
  const b = await exampleBatch(SALON);
  // anotação indevida das tabelas protegidas (não acontece no cadastro): mesmo assim nunca saem
  for (const [table, id] of Object.entries(SALON.protectedIds)) {
    await sql`INSERT INTO test_batch_items (batch_id, tenant_id, table_name, record_id, kind) VALUES (${b.id}, ${SALON.id}, ${table}, ${id}, 'derived')`;
  }
  const [tpl] = await sql`SELECT id FROM message_templates WHERE tenant_id = ${SALON.id} LIMIT 1`;
  await sql`INSERT INTO test_batch_items (batch_id, tenant_id, table_name, record_id, kind) VALUES (${b.id}, ${SALON.id}, 'message_templates', ${tpl.id}, 'derived')`;
  const templates = (await counts(SALON)).message_templates;

  const r = await req("DELETE", "/demo/examples", SALON.owner);
  assert.equal(r.statusCode, 200, r.body);
  assert.equal(data(r).deleted.clients, 5);
  const after = await counts(SALON);
  assert.equal(after.message_templates, templates, "modelos de mensagem (configuração) ficam");
  delete after.message_templates;
  assert.deepEqual(after, salonBefore, "a conta voltou ao que era antes do exemplo");
  for (const [table, id] of Object.entries(SALON.protectedIds)) {
    assert.equal((await sql.unsafe(`SELECT count(*)::int n FROM "${table}" WHERE id = $1`, [id]))[0].n, 1, `${table} intacta`);
  }
  assert.equal((await sql`SELECT count(*)::int n FROM clients WHERE id = ${SALON.realClient}`)[0].n, 1, "cliente real intacto");
  assert.equal((await exampleBatch(SALON)).status, "deleted");
  assert.equal(data(await req("GET", "/demo/examples", SALON.owner)).exists, false);
  const again = await req("DELETE", "/demo/examples", SALON.owner);
  assert.deepEqual([again.statusCode, again.json().code], [409, "NO_EXAMPLE"]);
});

test("clínica: fichas, protocolos, sessões e pacotes de tratamento entram no lote e saem juntos", async () => {
  const before = await counts(CLINIC);
  const r = await svc.seedExampleData(CLINIC.id, "system:cadastro");
  for (const t of ["client_records", "protocols", "protocol_sessions", "treatment_packages", "package_sessions"]) assert.ok(r.counts[t] > 0, t);
  const d = await req("DELETE", "/demo/examples", CLINIC.owner);
  assert.equal(d.statusCode, 200, d.body);
  const after = await counts(CLINIC);
  delete after.message_templates;
  assert.deepEqual(after, before);
});
