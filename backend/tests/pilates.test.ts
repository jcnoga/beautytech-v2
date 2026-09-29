// Pilates, Fase 2: alunos, instrutores, planos, matrículas e modalidades.
// Funcionamento + isolamento entre empresas (duas empresas Pilates e um salão).
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
const SA_SECRET = "super-admin-test";
Object.assign(process.env, {
  NODE_ENV: "test", POSTGRES_URL: DB_URL, POSTGRES_SSL: "false",
  GOTRUE_URL: "http://127.0.0.1:9", GOTRUE_JWT_SECRET: SECRET, GOTRUE_SERVICE_KEY: "nao-usado",
  RESEND_API_KEY: "re_test", SUPER_ADMIN_SECRET: SA_SECRET, WHATSAPP_SEND_ENABLED: "false",
});
globalThis.fetch = (async () => { throw new Error("rede desligada no teste"); }) as any;

const PREFIX = "/api/v1";
const sql = postgres(DB_URL, { max: 2, onnotice: () => {} });
let app: any;

type T = { id: string; token: string; reception: string; client: string; service: string };
let A: T, B: T, S: T;

async function token(authUserId: string) {
  return new SignJWT({ role: "authenticated" }).setProtectedHeader({ alg: "HS256" })
    .setSubject(authUserId).setAudience("authenticated").setExpirationTime("1h").sign(new TextEncoder().encode(SECRET));
}
async function seed(label: string, businessType: string): Promise<T> {
  const [t] = await sql`INSERT INTO tenants (name, slug, business_type, plan_tier)
    VALUES (${"Studio " + label}, ${label + "-" + Date.now()}, ${businessType}, 'pro') RETURNING id`;
  const owner = randomUUID(), recep = randomUUID();
  await sql`INSERT INTO user_profiles (tenant_id, auth_user_id, full_name, role) VALUES (${t.id}, ${owner}, 'Dono', 'owner')`;
  await sql`INSERT INTO user_profiles (tenant_id, auth_user_id, full_name, role) VALUES (${t.id}, ${recep}, 'Recepcao', 'receptionist')`;
  const [c] = await sql`INSERT INTO clients (tenant_id, full_name) VALUES (${t.id}, 'Cliente sem perfil') RETURNING id`;
  const [s] = await sql`INSERT INTO services (tenant_id, name) VALUES (${t.id}, 'Mat Pilates') RETURNING id`;
  return { id: t.id, token: await token(owner), reception: await token(recep), client: c.id, service: s.id };
}

const call = (method: string, url: string, tok: string, body?: unknown) =>
  app.inject({ method, url: PREFIX + url, headers: { authorization: `Bearer ${tok}` }, payload: body as any });
const data = (res: any) => res.json().data;

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

// ─── instrutores ────────────────────────────────────────────────────────────
let instA: string, instB: string;
test("instrutores: cadastro com registro profissional, edição e horários", async () => {
  const res = await call("POST", "/pilates/instructors", A.token,
    { fullName: "Fernanda", specialties: ["Reformer"], professionalRegistration: "CREF 012345-G/SP", commissionPct: 30, tenantId: B.id });
  assert.equal(res.statusCode, 201, res.body);
  instA = data(res).id;
  assert.equal(data(res).professionalRegistration, "CREF 012345-G/SP");
  const [row] = await sql`SELECT tenant_id FROM professionals WHERE id = ${instA}`;
  assert.equal(row.tenant_id, A.id, "tenantId do corpo é ignorado");
  instB = data(await call("POST", "/pilates/instructors", B.token, { fullName: "Rafael" })).id;

  const upd = await call("PATCH", `/pilates/instructors/${instA}`, A.token, { phone: "34999990000", isActive: true });
  assert.equal(upd.statusCode, 200);
  assert.equal(data(upd).phone, "34999990000");

  const put = await call("PUT", `/pilates/instructors/${instA}/schedules`, A.token, [
    { dayOfWeek: 1, isWorking: true, startTime: "07:00", endTime: "12:00" },
    { dayOfWeek: 3, isWorking: true, startTime: "07:00", endTime: "12:00" },
  ]);
  assert.equal(put.statusCode, 200, put.body);
  const sch = data(await call("GET", `/pilates/instructors/${instA}/schedules`, A.token));
  assert.deepEqual(sch.map((r: any) => r.dayOfWeek), [1, 3]);
  const bad = await call("PUT", `/pilates/instructors/${instA}/schedules`, A.token, [{ dayOfWeek: 1, isWorking: true, startTime: "12:00", endTime: "07:00" }]);
  assert.equal(bad.statusCode, 400, "início depois do fim");
});

test("instrutores: recepção não cadastra; outra empresa não enxerga nem altera", async () => {
  assert.equal((await call("POST", "/pilates/instructors", A.reception, { fullName: "X" })).statusCode, 403);
  assert.equal((await call("PATCH", `/pilates/instructors/${instB}`, A.token, { fullName: "Invadido" })).statusCode, 404);
  assert.equal((await call("GET", `/pilates/instructors/${instB}/schedules`, A.token)).statusCode, 404);
  const lista = data(await call("GET", "/pilates/instructors", A.token));
  assert.ok(lista.every((i: any) => i.id !== instB));
});

// ─── alunos ─────────────────────────────────────────────────────────────────
let alunoA: string, alunoB: string;
test("alunos: cadastro reaproveita clients e grava os dados de Pilates", async () => {
  const res = await call("POST", "/pilates/students", A.token, {
    fullName: "Maria Silva", whatsapp: "34999991111", goal: "Postura", level: "intermediate", startDate: "2026-10-01",
    weeklyFrequency: 2, status: "active", instructorId: instA, emergencyContactName: "João", emergencyContactPhone: "34988887777",
    initialAssessmentDate: "2026-09-30", declaredRestrictions: "Cirurgia no joelho em 2024", notes: "Prefere manhã",
    segment: "vip", tenantId: B.id,
  });
  assert.equal(res.statusCode, 201, res.body);
  const a = data(res);
  alunoA = a.id;
  assert.equal(a.level, "intermediate");
  assert.equal(a.instructorName, "Fernanda");
  assert.equal(a.declaredRestrictions, "Cirurgia no joelho em 2024");
  const [c] = await sql`SELECT tenant_id, segment FROM clients WHERE id = ${alunoA}`;
  assert.equal(c.tenant_id, A.id, "o aluno é um registro de clients da própria empresa");
  assert.equal(c.segment, "new", "campo de salão (segment) não é gravável pela rota de Pilates");
  alunoB = data(await call("POST", "/pilates/students", B.token, { fullName: "Aluno B", instructorId: instB }));
  alunoB = (alunoB as any).id;
  const insts = data(await call("GET", "/pilates/instructors", A.token));
  assert.equal(insts.find((i: any) => i.id === instA).studentsCount, 1, "alunos ativos do instrutor (só da própria empresa)");
});

test("alunos: validação de nível/status e instrutor de outra empresa", async () => {
  assert.equal((await call("POST", "/pilates/students", A.token, { fullName: "X", level: "expert" })).statusCode, 400);
  assert.equal((await call("POST", "/pilates/students", A.token, { fullName: "X", status: "vip" })).statusCode, 400);
  assert.equal((await call("POST", "/pilates/students", A.token, { fullName: "X", instructorId: instB })).statusCode, 404);
  assert.equal((await call("POST", "/pilates/students", A.token, { fullName: "" })).statusCode, 400);
});

test("alunos: edição, lista, filtro e isolamento", async () => {
  const upd = await call("PATCH", `/pilates/students/${alunoA}`, A.token, { status: "paused", phone: "3433334444" });
  assert.equal(upd.statusCode, 200, upd.body);
  assert.equal(data(upd).status, "paused");
  assert.equal(data(upd).phone, "3433334444");
  assert.equal((await call("PATCH", `/pilates/students/${alunoA}`, A.token, { instructorId: instB })).statusCode, 404);

  const pausados = data(await call("GET", "/pilates/students?status=paused", A.token));
  assert.deepEqual(pausados.map((s: any) => s.id), [alunoA]);
  const todos = data(await call("GET", "/pilates/students", A.token));
  const semFicha = todos.find((s: any) => s.id === A.client);
  assert.ok(semFicha, "cliente do studio sem ficha aparece na lista (mesmo cadastro)");
  assert.equal(semFicha.hasProfile, false);
  assert.equal(todos.find((s: any) => s.id === alunoA).hasProfile, true);
  assert.deepEqual(data(await call("GET", "/pilates/students?status=incomplete", A.token)).map((s: any) => s.id), [A.client]);
  assert.ok(todos.every((s: any) => s.id !== alunoB));

  assert.equal((await call("GET", `/pilates/students/${alunoB}`, A.token)).statusCode, 404);
  assert.equal((await call("PATCH", `/pilates/students/${alunoB}`, A.token, { fullName: "Invadido" })).statusCode, 404);
  assert.equal((await call("GET", "/pilates/students/nao-e-uuid", A.token)).statusCode, 404);
  const [b] = await sql`SELECT full_name FROM clients WHERE id = ${alunoB}`;
  assert.equal(b.full_name, "Aluno B");
});

// ─── modalidades ────────────────────────────────────────────────────────────
let modA: string;
test("modalidades: cadastro, edição e isolamento", async () => {
  const res = await call("POST", "/pilates/modalities", A.token, { name: "Reformer", durationMinutes: 50, price: 90 });
  assert.equal(res.statusCode, 201, res.body);
  modA = data(res).id;
  assert.equal((await call("PATCH", `/pilates/modalities/${modA}`, A.token, { isActive: false })).statusCode, 200);
  assert.equal((await call("PATCH", `/pilates/modalities/${B.service}`, A.token, { name: "X" })).statusCode, 404);
  const lista = data(await call("GET", "/pilates/modalities", A.token));
  assert.ok(lista.some((m: any) => m.id === modA) && lista.every((m: any) => m.id !== B.service));
  assert.equal((await call("POST", "/pilates/modalities", A.reception, { name: "X" })).statusCode, 403);
});

// ─── planos ─────────────────────────────────────────────────────────────────
let planoMensal: string, pacote10: string, experimental: string, planoB: string;
test("planos: regras de frequência x pacote (C1)", async () => {
  assert.equal((await call("POST", "/pilates/plans", A.token, { name: "X", kind: "frequency", price: 100 })).statusCode, 400, "frequência sem aulas/semana");
  assert.equal((await call("POST", "/pilates/plans", A.token, { name: "X", kind: "package", totalClasses: 10 })).statusCode, 400, "pacote sem validade");
  assert.equal((await call("POST", "/pilates/plans", A.token, { name: "X", kind: "frequency", classesPerWeek: 1, durationMonths: 1, isTrial: true })).statusCode, 400, "experimental não é frequência");
  assert.equal((await call("POST", "/pilates/plans", A.token, { name: "X", kind: "outro" })).statusCode, 400);

  const m = await call("POST", "/pilates/plans", A.token, { name: "Pilates 2x por semana", kind: "frequency", classesPerWeek: 2, durationMonths: 1, price: 280, modalityId: A.service, totalClasses: 99 });
  assert.equal(m.statusCode, 201, m.body);
  planoMensal = data(m).id;
  assert.equal(data(m).totalClasses, null, "campo de pacote é zerado em plano por frequência");
  pacote10 = data(await call("POST", "/pilates/plans", A.token, { name: "10 aulas", kind: "package", totalClasses: 10, validityDays: 60, price: 450 })).id;
  experimental = data(await call("POST", "/pilates/plans", A.token, { name: "Aula experimental", kind: "package", totalClasses: 1, validityDays: 7, price: 0, isTrial: true })).id;
  planoB = data(await call("POST", "/pilates/plans", B.token, { name: "Plano B", kind: "package", totalClasses: 5, validityDays: 30 })).id;
  assert.equal((await call("POST", "/pilates/plans", A.token, { name: "X", kind: "package", totalClasses: 5, validityDays: 30, modalityId: B.service })).statusCode, 404);
});

test("planos: edição valida o registro final; recepção não edita; isolamento", async () => {
  assert.equal((await call("PATCH", `/pilates/plans/${pacote10}`, A.token, { kind: "frequency" })).statusCode, 400, "virar frequência sem aulas/semana");
  const ok = await call("PATCH", `/pilates/plans/${pacote10}`, A.token, { price: 480 });
  assert.equal(ok.statusCode, 200);
  assert.equal(data(ok).price, "480.00");
  assert.equal((await call("PATCH", `/pilates/plans/${pacote10}`, A.reception, { price: 1 })).statusCode, 403);
  assert.equal((await call("PATCH", `/pilates/plans/${planoB}`, A.token, { price: 1 })).statusCode, 404);
  const lista = data(await call("GET", "/pilates/plans", A.token));
  assert.deepEqual(lista.map((p: any) => p.name).sort(), ["10 aulas", "Aula experimental", "Pilates 2x por semana"]);
});

// ─── matrículas ─────────────────────────────────────────────────────────────
test("matrículas: várias ativas por aluno, cada uma com seus dados", async () => {
  const m = await call("POST", "/pilates/enrollments", A.reception, { studentId: alunoA, planId: planoMensal, startDate: "2026-10-15" });
  assert.equal(m.statusCode, 201, m.body);
  assert.equal(data(m).endDate, "2026-11-14", "vigência de 1 mês");
  assert.equal(data(m).dueDay, 15);
  assert.equal(data(m).price, "280.00", "preço do plano no momento da matrícula");
  const p = await call("POST", "/pilates/enrollments", A.token, { studentId: alunoA, planId: pacote10, startDate: "2026-10-15", price: 400 });
  assert.equal(p.statusCode, 201, p.body);
  assert.equal(data(p).endDate, "2026-12-13", "validade de 60 dias contando o início");
  assert.equal(data(p).dueDay, null);
  assert.equal(data(p).price, "400.00");

  const lista = data(await call("GET", `/pilates/enrollments?studentId=${alunoA}`, A.token));
  assert.equal(lista.length, 2);
  assert.ok(lista.every((e: any) => e.status === "active"));
  const aluno = data(await call("GET", `/pilates/students/${alunoA}`, A.token));
  assert.equal(aluno.activeEnrollments, 2);

  const upd = await call("PATCH", `/pilates/enrollments/${data(p).id}`, A.token, { status: "cancelled", notes: "Desistiu" });
  assert.equal(upd.statusCode, 200);
  assert.equal(data(upd).status, "cancelled");
  assert.equal((await call("PATCH", `/pilates/enrollments/${data(p).id}`, A.token, { endDate: "2026-01-01" })).statusCode, 400, "fim antes do início");
});

test("matrículas: plano inativo, aluno/plano de outra empresa e isolamento", async () => {
  await call("PATCH", `/pilates/plans/${experimental}`, A.token, { status: "inactive" });
  assert.equal((await call("POST", "/pilates/enrollments", A.token, { studentId: alunoA, planId: experimental, startDate: "2026-10-01" })).statusCode, 400);
  assert.equal((await call("POST", "/pilates/enrollments", A.token, { studentId: alunoB, planId: pacote10, startDate: "2026-10-01" })).statusCode, 404);
  assert.equal((await call("POST", "/pilates/enrollments", A.token, { studentId: alunoA, planId: planoB, startDate: "2026-10-01" })).statusCode, 404);
  const incompleta = await call("POST", "/pilates/enrollments", A.token, { studentId: A.client, planId: pacote10, startDate: "2026-10-01" });
  assert.equal(incompleta.statusCode, 400, "matrícula exige a ficha de Pilates");
  assert.equal(incompleta.json().code, "INCOMPLETE_PROFILE");
  const eB = data(await call("POST", "/pilates/enrollments", B.token, { studentId: alunoB, planId: planoB, startDate: "2026-10-01" }));
  assert.equal((await call("PATCH", `/pilates/enrollments/${eB.id}`, A.token, { status: "cancelled" })).statusCode, 404);
  assert.deepEqual(data(await call("GET", `/pilates/enrollments?studentId=${alunoB}`, A.token)), []);
});

test("ficha incompleta: salvar cria a ficha no mesmo cadastro, sem duplicar", async () => {
  const antes = (await sql`SELECT count(*)::int AS n FROM clients WHERE tenant_id = ${A.id}`)[0].n;
  const res = await call("PATCH", `/pilates/students/${A.client}`, A.token, { level: "beginner", goal: "Postura" });
  assert.equal(res.statusCode, 200, res.body);
  assert.equal(data(res).hasProfile, true);
  assert.equal(data(res).goal, "Postura");
  const depois = (await sql`SELECT count(*)::int AS n FROM clients WHERE tenant_id = ${A.id}`)[0].n;
  assert.equal(depois, antes, "não cria outro cliente");
  const [p] = await sql`SELECT count(*)::int AS n FROM pilates_student_profiles WHERE client_id = ${A.client}`;
  assert.equal(p.n, 1);
  const m = await call("POST", "/pilates/enrollments", A.token, { studentId: A.client, planId: pacote10, startDate: "2026-10-01" });
  assert.equal(m.statusCode, 201, "com a ficha completa, matricula normalmente");
});

// ─── nichos e Super Admin ───────────────────────────────────────────────────
test("salão não usa nenhuma rota do Pilates; Pilates não usa rotas de salão", async () => {
  for (const url of ["/pilates/students", "/pilates/instructors", "/pilates/plans", "/pilates/enrollments", "/pilates/modalities"]) {
    const res = await call("GET", url, S.token);
    assert.equal(res.statusCode, 403, `${url}: ${res.statusCode}`);
    assert.equal(res.json().code, "FEATURE_NOT_ALLOWED");
  }
  for (const url of ["/clients", "/professionals", "/services", "/appointments"]) {
    assert.equal((await call("GET", url, A.token)).json().code, "FEATURE_NOT_ALLOWED", url);
  }
});

test("Pilates usa o termo LGPD existente (C8)", async () => {
  const res = await call("POST", "/consent-forms", A.token, { clientId: alunoA, type: "lgpd", content: "Autorizo" });
  assert.ok(res.statusCode < 300, res.body);
  await call("POST", `/consent-forms/${data(res).id}/sign`, A.token, { signedByName: "Maria Silva" });
  const lista = data(await call("GET", `/consent-forms/${alunoA}`, A.token));
  assert.equal(lista.length, 1, "GET do termo devolve o registro (antes voltava sempre vazio)");
  assert.equal(lista[0].is_signed, true);
  assert.deepEqual(data(await call("GET", `/consent-forms/${alunoA}`, B.token)), [], "outra empresa não vê o termo");
});

test("Super Admin: filtro e contagem por nicho", async () => {
  const jwt = (await import("jsonwebtoken")).default;
  const sa = jwt.sign({ role: "super_admin" }, SA_SECRET, { expiresIn: "10m" });
  const lista = await call("GET", "/super-admin/tenants?businessType=pilates", sa);
  assert.equal(lista.statusCode, 200);
  const ids = lista.json().data.map((t: any) => t.id);
  assert.ok(ids.includes(A.id) && ids.includes(B.id) && !ids.includes(S.id));
  const a = lista.json().data.find((t: any) => t.id === A.id);
  assert.ok(a.clientsCount >= 2, "utilização: alunos/clientes da empresa");
  const stats = await call("GET", "/super-admin/stats", sa);
  assert.equal(stats.json().data.byBusinessType.pilates.total, 2);
  assert.equal(stats.json().data.byBusinessType.beauty_salon.total, 1);
});
