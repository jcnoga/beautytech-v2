// Pilates: painel do studio (GET /classes/dashboard) — alunos ativos, aulas de hoje (com ocupação),
// geração de aulas idempotente com chamadas simultâneas, isolamento entre studios e bloqueio para outros nichos.
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
const sql = postgres(DB_URL, { max: 4, onnotice: () => {} });
let app: any;
const TODAY = sql`(now() AT TIME ZONE 'America/Sao_Paulo')::date`;

type T = { id: string; token: string; instructor: string; plan: string };
let A: T, B: T, S: T;

async function token(authUserId: string) {
  return new SignJWT({ role: "authenticated" }).setProtectedHeader({ alg: "HS256" })
    .setSubject(authUserId).setAudience("authenticated").setExpirationTime("1h").sign(new TextEncoder().encode(SECRET));
}
async function seed(label: string, businessType: string): Promise<T> {
  const [t] = await sql`INSERT INTO tenants (name, slug, business_type, plan_tier)
    VALUES (${"Studio " + label}, ${label + "-" + Date.now()}, ${businessType}, 'pro') RETURNING id`;
  const owner = randomUUID();
  await sql`INSERT INTO user_profiles (tenant_id, auth_user_id, full_name, role) VALUES (${t.id}, ${owner}, 'Dono', 'owner')`;
  const [i] = await sql`INSERT INTO professionals (tenant_id, full_name) VALUES (${t.id}, 'Instrutora') RETURNING id`;
  const [p] = await sql`INSERT INTO membership_plans (tenant_id, name, kind, price, total_classes, validity_days)
    VALUES (${t.id}, 'Pacote 8', 'package', 300, 8, 60) RETURNING id`;
  return { id: t.id, token: await token(owner), instructor: i.id, plan: p.id };
}
const call = (url: string, tok: string) => app.inject({ method: "GET", url: PREFIX + url, headers: { authorization: `Bearer ${tok}` } });
const data = (res: any) => res.json().data;

async function student(t: T, name: string, deleted = false) {
  const [c] = await sql`INSERT INTO clients (tenant_id, full_name, deleted_at) VALUES (${t.id}, ${name}, ${deleted ? sql`now()` : null}) RETURNING id`;
  return c.id as string;
}
/** Matrícula com início/fim relativos a hoje (dias; null = sem fim). */
async function enroll(t: T, clientId: string, status: string, startOffset: number, endOffset: number | null) {
  const [e] = await sql`INSERT INTO membership_enrollments (tenant_id, client_id, plan_id, start_date, end_date, price, status)
    VALUES (${t.id}, ${clientId}, ${t.plan}, ${TODAY} + ${startOffset}::int, ${endOffset === null ? null : sql`${TODAY} + ${endOffset}::int`}, 300, ${status})
    RETURNING id`;
  return e.id as string;
}
async function sessionToday(t: T, capacity: number, opts: { scheduleId?: string; status?: string } = {}) {
  const [s] = await sql`INSERT INTO class_sessions (tenant_id, schedule_id, session_date, starts_at, ends_at, instructor_id, capacity, status)
    VALUES (${t.id}, ${opts.scheduleId ?? null}, ${TODAY}, now() + interval '1 hour', now() + interval '2 hours', ${t.instructor}, ${capacity}, ${opts.status ?? "scheduled"})
    RETURNING id`;
  return s.id as string;
}
const book = (t: T, sessionId: string, clientId: string, status: string) =>
  sql`INSERT INTO class_bookings (tenant_id, session_id, client_id, kind, status) VALUES (${t.id}, ${sessionId}, ${clientId}, 'credit', ${status})`;

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
  A = await seed("a", "pilates");
  B = await seed("b", "pilates");
  S = await seed("s", "beauty_salon");
});

after(async () => {
  await app?.close();
  await sql.end();
  const { closeDatabaseConnection } = await import("../src/db/connection");
  await closeDatabaseConnection();
  process.exit(0);
});

test("nicho: salão recebe 403; Pilates recebe o painel vazio", async () => {
  const s = await call("/classes/dashboard", S.token);
  assert.equal(s.statusCode, 403);
  assert.equal(s.json().code, "FEATURE_NOT_ALLOWED");
  const a = await call("/classes/dashboard", A.token);
  assert.equal(a.statusCode, 200, a.body);
  assert.deepEqual({ ...data(a), date: undefined }, { date: undefined, activeStudents: 0, today: { classes: 0, students: 0, capacity: 0 } });
  assert.match(data(a).date, /^\d{4}-\d{2}-\d{2}$/);
});

let c1: string, c2: string, c3: string;
test("alunos ativos: matrícula ativa valendo hoje, cada aluno uma vez", async () => {
  c1 = await student(A, "Ana");       await enroll(A, c1, "active", -10, 20);           // conta
  c2 = await student(A, "Bia");       await enroll(A, c2, "active", 0, null);           // conta (começa hoje, sem fim)
                                      await enroll(A, c2, "active", -5, 5);             // 2ª matrícula: não conta de novo
  c3 = await student(A, "Cris");      await enroll(A, c3, "ended", -30, -1);            // encerrada
  const d = await student(A, "Duda"); await enroll(A, d, "cancelled", -5, 25);          // cancelada
  const e = await student(A, "Eva");  await enroll(A, e, "active", 1, 30);              // começa amanhã
  const f = await student(A, "Fê");   await enroll(A, f, "active", -40, -1);            // período já acabou
  const g = await student(A, "Gil", true); await enroll(A, g, "active", -5, 25);        // aluno apagado
  const p = await student(A, "Pausada"); await enroll(A, p, "paused", -5, 25);          // pausada (situação ≠ ativa)
  const hb = await student(B, "Da outra"); await enroll(B, hb, "active", -5, 25);       // outro studio
  assert.equal(data(await call("/classes/dashboard", A.token)).activeStudents, 2);
  assert.equal(data(await call("/classes/dashboard", B.token)).activeStudents, 1, "isolamento");
});

test("aulas hoje: só as não canceladas, com alunos (inscrições ativas + fixos) e vagas", async () => {
  const s1 = await sessionToday(A, 5);
  await book(A, s1, c1, "booked");
  await book(A, s1, c2, "present");
  await book(A, s1, c3, "cancelled");                  // cancelou: não ocupa vaga
  const [sch] = await sql`INSERT INTO class_schedules (tenant_id, instructor_id, day_of_week, start_time, duration_minutes, capacity, is_active)
    VALUES (${A.id}, ${A.instructor}, 0, '07:00', 50, 4, false) RETURNING id`;   // inativa: ensureSessions não gera
  const s2 = await sessionToday(A, 4, { scheduleId: sch.id });
  const [enr] = await sql`SELECT id FROM membership_enrollments WHERE client_id = ${c1} LIMIT 1`;
  await sql`INSERT INTO class_enrollment_slots (tenant_id, enrollment_id, schedule_id) VALUES (${A.id}, ${enr.id}, ${sch.id})`; // fixo: ocupa
  await sessionToday(A, 6, { status: "cancelled" }); // aula cancelada: fora
  await sessionToday(B, 8);                          // outro studio: fora
  const r = data(await call("/classes/dashboard", A.token)).today;
  assert.deepEqual(r, { classes: 2, students: 3, capacity: 9 });
  const [{ n }] = await sql`SELECT count(*)::int n FROM class_bookings WHERE session_id = ${s2}`;
  assert.ok(n <= 1, "fixo materializado no máximo uma vez");
  assert.deepEqual(data(await call("/classes/dashboard", B.token)).today, { classes: 1, students: 0, capacity: 8 }, "isolamento");
});

test("geração de aulas idempotente: 5 chamadas simultâneas não duplicam aulas nem inscrições fixas", async () => {
  const [{ dow }] = await sql`SELECT EXTRACT(DOW FROM ${TODAY} + 1)::int AS dow`;
  const [sch] = await sql`INSERT INTO class_schedules (tenant_id, instructor_id, day_of_week, start_time, duration_minutes, capacity)
    VALUES (${A.id}, ${A.instructor}, ${dow}, '10:00', 50, 6) RETURNING id`;
  const [enr] = await sql`SELECT id FROM membership_enrollments WHERE client_id = ${c2} AND end_date IS NULL`;
  await sql`INSERT INTO class_enrollment_slots (tenant_id, enrollment_id, schedule_id) VALUES (${A.id}, ${enr.id}, ${sch.id})`;
  const results = await Promise.all(Array.from({ length: 5 }, () => call("/classes/dashboard", A.token)));
  assert.deepEqual(results.map((r) => r.statusCode), [200, 200, 200, 200, 200], results.map((r) => r.body).join(" | "));
  const [{ n, dias }] = await sql`SELECT count(*)::int n, count(DISTINCT session_date)::int dias FROM class_sessions WHERE schedule_id = ${sch.id}`;
  assert.equal(n, 4, "amanhã e mais 3 semanas dentro da janela de 4 semanas");
  assert.equal(dias, 4, "uma aula por data");
  const [{ b }] = await sql`SELECT count(*)::int b FROM class_bookings bk JOIN class_sessions ss ON ss.id = bk.session_id WHERE ss.schedule_id = ${sch.id}`;
  assert.equal(b, 4, "uma inscrição fixa por aula");
  await call("/classes/dashboard", A.token);
  const [{ n2 }] = await sql`SELECT count(*)::int n2 FROM class_sessions WHERE schedule_id = ${sch.id}`;
  assert.equal(n2, 4, "chamar de novo não muda nada");
});
