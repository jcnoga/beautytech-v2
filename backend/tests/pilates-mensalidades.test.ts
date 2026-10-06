// Pilates: mensalidades das matrículas no Financeiro (receitas pendentes ligadas por enrollment_id + installment_no).
// Calendário das parcelas, geração ao matricular, valor/fim/cancelamento só mexem nas pendentes futuras,
// "Gerar mensalidades" idempotente (inclusive com chamadas simultâneas), isolamento e bloqueio para outros nichos.
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
const sql = postgres(DB_URL, { max: 6, onnotice: () => {} });
let app: any;
let today: string;

type T = { id: string; token: string; monthly: string; pack: string };
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
  const [m] = await sql`INSERT INTO membership_plans (tenant_id, name, kind, price, classes_per_week, duration_months)
    VALUES (${t.id}, 'Trimestral 2x', 'frequency', 200, 2, 3) RETURNING id`;
  const [p] = await sql`INSERT INTO membership_plans (tenant_id, name, kind, price, total_classes, validity_days)
    VALUES (${t.id}, 'Pacote 8', 'package', 300, 8, 60) RETURNING id`;
  return { id: t.id, token: await token(owner), monthly: m.id, pack: p.id };
}
const req = (method: string, url: string, tok: string, payload?: any) =>
  app.inject({ method, url: PREFIX + url, headers: { authorization: `Bearer ${tok}` }, payload });
const data = (res: any) => res.json().data;
const plus = (n: number) => { const d = new Date(`${today}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

async function student(t: T, name: string) {
  const [c] = await sql`INSERT INTO clients (tenant_id, full_name) VALUES (${t.id}, ${name}) RETURNING id`;
  await sql`INSERT INTO student_profiles (tenant_id, client_id) VALUES (${t.id}, ${c.id})`;
  return c.id as string;
}
const parcels = (enrollmentId: string) => sql`SELECT installment_no AS no, status, amount::float AS amount,
    to_char(due_date, 'YYYY-MM-DD') AS due, description FROM financial_transactions
  WHERE enrollment_id = ${enrollmentId} ORDER BY installment_no`;

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
  [{ today }] = await sql`SELECT to_char((now() AT TIME ZONE 'America/Sao_Paulo')::date, 'YYYY-MM-DD') AS today`;
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

test("calendário: 1ª no início, demais no dia de vencimento; fim de mês, pausa, pacote e sem fim", async () => {
  const { installmentSchedule } = await import("../src/modules/group-classes/installments.service");
  const base = { kind: "frequency", pausedDays: 0, today: "2026-10-06" };
  assert.deepEqual(installmentSchedule({ ...base, start: "2026-01-15", end: "2026-04-14", dueDay: 10 }).map((i) => i.due),
    ["2026-01-15", "2026-02-10", "2026-03-10"]);
  // início no dia 31: vencimento padrão 28, competência no último dia de cada mês; 3 meses = 3 parcelas
  assert.deepEqual(installmentSchedule({ ...base, start: "2026-01-31", end: "2026-04-29", dueDay: null }),
    [{ no: 1, due: "2026-01-31", competence: "2026-01-31" }, { no: 2, due: "2026-02-28", competence: "2026-02-28" },
     { no: 3, due: "2026-03-28", competence: "2026-03-31" }]);
  // pausa de 10 dias estendeu o fim: os dias pausados não viram mês novo
  assert.equal(installmentSchedule({ ...base, start: "2026-01-15", end: "2026-04-24", dueDay: 10, pausedDays: 10 }).length, 3);
  assert.deepEqual(installmentSchedule({ ...base, kind: "package", start: "2026-03-02", end: "2026-04-30", dueDay: null }),
    [{ no: 1, due: "2026-03-02", competence: "2026-03-02" }]);
  // sem fim: períodos que começam até 1 mês depois de hoje
  assert.deepEqual(installmentSchedule({ ...base, start: "2026-09-01", end: null, dueDay: 5 }).map((i) => i.due),
    ["2026-09-01", "2026-10-05", "2026-11-05"]);
});

let e1: string;
test("matricular gera as parcelas pendentes (categoria Mensalidades, conta criada); pacote 1; valor 0 nenhuma", async () => {
  const c = await student(A, "Ana");
  const r = await req("POST", "/memberships/enrollments", A.token, { studentId: c, planId: A.monthly, startDate: plus(-45), endDate: plus(40) });
  assert.equal(r.statusCode, 201, r.body);
  e1 = data(r).id;
  assert.equal(data(r).installmentsCreated, 3);
  const list = await parcels(e1);
  assert.deepEqual(list.map((p) => [p.no, p.status, p.amount]), [[1, "pending", 200], [2, "pending", 200], [3, "pending", 200]]);
  assert.equal(list[0].due, plus(-45));
  assert.ok(list[1].due < today && list[2].due > today, "2ª já venceu, 3ª é futura");
  assert.match(list[0].description, /^Mensalidade \d{2}\/\d{4} - Trimestral 2x - Ana$/);
  const [{ cats, accs, client }] = await sql`SELECT
    (SELECT count(DISTINCT category_id)::int FROM financial_transactions WHERE tenant_id = ${A.id}) cats,
    (SELECT count(*)::int FROM financial_accounts WHERE tenant_id = ${A.id}) accs,
    (SELECT count(*)::int FROM financial_transactions WHERE enrollment_id = ${e1} AND client_id = ${c} AND type = 'revenue') client`;
  assert.deepEqual({ cats, accs, client }, { cats: 1, accs: 1, client: 3 });

  const p = await req("POST", "/memberships/enrollments", A.token, { studentId: c, planId: A.pack, startDate: plus(-2) });
  assert.deepEqual((await parcels(data(p).id)).map((x) => [x.no, x.due, x.amount, x.description]), [[1, plus(-2), 300, "Pacote 8 - Ana"]]);
  const z = await req("POST", "/memberships/enrollments", A.token, { studentId: c, planId: A.pack, startDate: today, price: 0 });
  assert.equal(data(z).installmentsCreated, 0);
  assert.equal((await parcels(data(z).id)).length, 0);
});

test("mudar o valor: só Admin/Gerente; só as pendentes futuras; paga e atrasada ficam como estão", async () => {
  await sql`UPDATE financial_transactions SET status = 'confirmed' WHERE enrollment_id = ${e1} AND installment_no = 1`;
  for (const role of ["receptionist", "professional", "financial"]) {
    const uid = randomUUID();
    await sql`INSERT INTO user_profiles (tenant_id, auth_user_id, full_name, role) VALUES (${A.id}, ${uid}, ${role}, ${role})`;
    const tok = await token(uid);
    const x = await req("PATCH", `/memberships/enrollments/${e1}`, tok, { price: 1 });
    assert.equal(x.statusCode, 403, `${role} não muda o valor`);
    assert.equal((await req("PATCH", `/memberships/enrollments/${e1}`, tok, { notes: "ok" })).statusCode, 200, `${role} edita o resto`);
  }
  assert.deepEqual((await parcels(e1)).map((p) => p.amount), [200, 200, 200]);
  const mid = randomUUID();
  await sql`INSERT INTO user_profiles (tenant_id, auth_user_id, full_name, role) VALUES (${A.id}, ${mid}, 'Gerente', 'manager')`;
  const r = await req("PATCH", `/memberships/enrollments/${e1}`, await token(mid), { price: 250 });
  assert.equal(r.statusCode, 200, r.body);
  assert.deepEqual((await parcels(e1)).map((p) => [p.no, p.status, p.amount]), [[1, "confirmed", 200], [2, "pending", 200], [3, "pending", 250]]);
});

test("fim antecipado cancela a futura que sobrou; prorrogar volta com ela (sem duplicar)", async () => {
  await req("PATCH", `/memberships/enrollments/${e1}`, A.token, { endDate: plus(5) });
  assert.deepEqual((await parcels(e1)).map((p) => p.status), ["confirmed", "pending", "cancelled"]);
  await req("PATCH", `/memberships/enrollments/${e1}`, A.token, { endDate: plus(40) });
  assert.deepEqual((await parcels(e1)).map((p) => [p.status, p.amount]), [["confirmed", 200], ["pending", 200], ["pending", 250]]);
});

test("cancelar: futuras canceladas, atrasada continua como dívida; reativar traz as futuras de volta", async () => {
  await req("PATCH", `/memberships/enrollments/${e1}`, A.token, { status: "cancelled" });
  assert.deepEqual((await parcels(e1)).map((p) => p.status), ["confirmed", "pending", "cancelled"]);
  await req("PATCH", `/memberships/enrollments/${e1}`, A.token, { notes: "só uma anotação" });
  assert.deepEqual((await parcels(e1)).map((p) => p.status), ["confirmed", "pending", "cancelled"], "anotação não mexe nas parcelas");
  await req("PATCH", `/memberships/enrollments/${e1}`, A.token, { status: "active" });
  assert.deepEqual((await parcels(e1)).map((p) => p.status), ["confirmed", "pending", "pending"]);
});

test("Gerar mensalidades: matrícula antiga sem parcelas e sem fim; apertar de novo não duplica", async () => {
  const c = await student(A, "Bia");
  const [old] = await sql`INSERT INTO membership_enrollments (tenant_id, client_id, plan_id, start_date, price)
    VALUES (${A.id}, ${c}, ${A.monthly}, ${plus(-70)}, 180) RETURNING id`;
  const r = await req("POST", "/memberships/enrollments/installments", A.token);
  assert.equal(r.statusCode, 200, r.body);
  assert.deepEqual(data(r), { created: 4, enrollments: 1 }, "-70, ~-40, ~-10 e ~+20 dias (até 1 mês depois de hoje)");
  assert.equal((await parcels(old.id)).length, 4);
  assert.deepEqual(data(await req("POST", "/memberships/enrollments/installments", A.token)), { created: 0, enrollments: 0 });
});

test("chamadas simultâneas não duplicam parcelas, categoria nem conta", async () => {
  const c = await student(B, "Cris");
  await sql`INSERT INTO membership_enrollments (tenant_id, client_id, plan_id, start_date, end_date, price)
    VALUES (${B.id}, ${c}, ${B.monthly}, ${plus(-10)}, ${plus(70)}, 200)`; // -10, ~+20, ~+50
  const res = await Promise.all(Array.from({ length: 5 }, () => req("POST", "/memberships/enrollments/installments", B.token)));
  assert.deepEqual(res.map((r) => r.statusCode), [200, 200, 200, 200, 200], res.map((r) => r.body).join(" | "));
  assert.equal(res.reduce((s, r) => s + data(r).created, 0), 3);
  const [{ n, cats, accs }] = await sql`SELECT
    (SELECT count(*)::int FROM financial_transactions WHERE tenant_id = ${B.id}) n,
    (SELECT count(*)::int FROM financial_categories WHERE tenant_id = ${B.id} AND name = 'Mensalidades') cats,
    (SELECT count(*)::int FROM financial_accounts WHERE tenant_id = ${B.id}) accs`;
  assert.deepEqual({ n, cats, accs }, { n: 3, cats: 1, accs: 1 });
});

test("isolamento e nicho: B não vê nem gera as de A; salão recebe 403", async () => {
  const [{ a }] = await sql`SELECT count(*)::int a FROM financial_transactions WHERE tenant_id = ${A.id}`;
  await req("POST", "/memberships/enrollments/installments", B.token);
  const [{ a2 }] = await sql`SELECT count(*)::int a2 FROM financial_transactions WHERE tenant_id = ${A.id}`;
  assert.equal(a2, a);
  const r = await req("PATCH", `/memberships/enrollments/${e1}`, B.token, { status: "cancelled" });
  assert.equal(r.statusCode, 404);
  assert.deepEqual((await parcels(e1)).map((p) => p.status), ["confirmed", "pending", "pending"]);
  const s = await req("POST", "/memberships/enrollments/installments", S.token);
  assert.equal(s.statusCode, 403);
  assert.equal(s.json().code, "FEATURE_NOT_ALLOWED");
});
