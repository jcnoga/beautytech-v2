// Excluir agendamento (DELETE /appointments/:id): só marca deleted_at, num comando só (id + conta + status permitido
// + ainda não apagado). Pendente, confirmado e cancelado: 204 e some da Agenda e do histórico público; concluído: 409;
// outra conta, já apagado ou id inválido: 404, sem tocar em nada.
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
  RESEND_API_KEY: "re_test", SUPER_ADMIN_SECRET: "sa", WHATSAPP_SEND_ENABLED: "false",
});
globalThis.fetch = (async (url: string) => { throw new Error(`rede desligada no teste: ${url}`); }) as any;

const PREFIX = "/api/v1";
const sql = postgres(DB_URL, { max: 4, onnotice: () => {} });
let app: any;
type T = { id: string; token: string; client: string; phone: string };
let A: T, B: T;

const token = (sub: string) => new SignJWT({ role: "authenticated" }).setProtectedHeader({ alg: "HS256" }).setSubject(sub)
  .setAudience("authenticated").setExpirationTime("1h").sign(new TextEncoder().encode(SECRET));
const req = (t: T, method: string, url: string) =>
  app.inject({ method, url: PREFIX + url, headers: { authorization: `Bearer ${t.token}` } });

async function seed(label: string, phone: string): Promise<T> {
  const [t] = await sql`INSERT INTO tenants (name, slug, business_type, plan_tier, trial_ends_at)
    VALUES (${"Conta " + label}, ${label + "-" + Date.now()}, 'beauty_salon', 'trial', now() + interval '20 days') RETURNING id`;
  const owner = randomUUID();
  await sql`INSERT INTO user_profiles (tenant_id, auth_user_id, full_name, role) VALUES (${t.id}, ${owner}, 'Dono', 'owner')`;
  const [c] = await sql`INSERT INTO clients (tenant_id, full_name, whatsapp) VALUES (${t.id}, 'Cliente', ${phone}) RETURNING id`;
  return { id: t.id, token: await token(owner), client: c.id, phone };
}
const appt = async (t: T, status: string) => (await sql`INSERT INTO appointments (tenant_id, client_id, status, scheduled_at, ends_at)
  VALUES (${t.id}, ${t.client}, ${status}, now() + interval '2 days', now() + interval '2 days 1 hour') RETURNING id`)[0].id as string;
const state = async (id: string) => (await sql`SELECT status, deleted_at IS NOT NULL AS apagado FROM appointments WHERE id = ${id}`)[0];
const listed = async (t: T) => (await req(t, "GET", "/appointments?limit=100")).json().data.map((x: any) => x.appointment.id);

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
  A = await seed("a", "(34) 99999-0001");
  B = await seed("b", "34999990002"); // só dígitos: a busca pública por WhatsApp só acha telefone gravado assim (anotado)
});

after(async () => {
  await app?.close();
  await sql.end();
  const { closeDatabaseConnection } = await import("../src/db/connection");
  await closeDatabaseConnection();
  process.exit(0);
});

test("pendente, confirmado e cancelado: 204, marca deleted_at e some da Agenda", async () => {
  for (const status of ["pending", "confirmed", "cancelled"]) {
    const id = await appt(A, status);
    assert.ok((await listed(A)).includes(id), `${status} aparece antes`);
    const r = await req(A, "DELETE", `/appointments/${id}`);
    assert.equal(r.statusCode, 204, `${status}: ${r.body}`);
    assert.deepEqual(await state(id), { status, apagado: true }, "só marca; o status não muda");
    assert.ok(!(await listed(A)).includes(id), `${status} some da Agenda`);
  }
});

test("concluído (e em atendimento, não compareceu): 409, nada muda", async () => {
  for (const status of ["completed", "in_progress", "no_show"]) {
    const id = await appt(A, status);
    const r = await req(A, "DELETE", `/appointments/${id}`);
    assert.deepEqual([r.statusCode, r.json().code], [409, "APPOINTMENT_NOT_DELETABLE"], status);
    assert.deepEqual(await state(id), { status, apagado: false });
  }
});

test("outra conta, já apagado ou id inválido: 404 sem tocar em nada", async () => {
  const id = await appt(A, "pending");
  const r = await req(B, "DELETE", `/appointments/${id}`);
  assert.deepEqual([r.statusCode, r.json().code], [404, "NOT_FOUND"], "outra conta");
  assert.deepEqual(await state(id), { status: "pending", apagado: false }, "o agendamento da conta A continua intacto");

  assert.equal((await req(A, "DELETE", `/appointments/${id}`)).statusCode, 204);
  const again = await req(A, "DELETE", `/appointments/${id}`);
  assert.deepEqual([again.statusCode, again.json().code], [404, "NOT_FOUND"], "já apagado");

  assert.equal((await req(A, "DELETE", `/appointments/${randomUUID()}`)).statusCode, 404, "não existe");
  assert.equal((await req(A, "DELETE", "/appointments/nao-e-um-id")).statusCode, 404, "id inválido");
});

test("histórico público por WhatsApp está desligado (410), com ou sem agendamento apagado", async () => {
  const r = await app.inject({ method: "GET", url: `${PREFIX}/public/my-appointments?whatsapp=${encodeURIComponent(B.phone)}` });
  assert.deepEqual([r.statusCode, r.json().code], [410, "UNAVAILABLE"]);
});
