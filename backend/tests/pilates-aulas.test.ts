// Pilates, Fase 3 (3a, backend): regras configuráveis, grade, aulas, travas de vaga, horário fixo,
// consumo (frequência × pacote), reposição, pausa, presença, cancelamentos e isolamento.
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
  RESEND_API_KEY: "re_test", SUPER_ADMIN_SECRET: "sa", WHATSAPP_SEND_ENABLED: "false",
});
globalThis.fetch = (async () => { throw new Error("rede desligada no teste"); }) as any;

const PREFIX = "/api/v1";
const sql = postgres(DB_URL, { max: 4, onnotice: () => {} });
let app: any;

type Tenant = { id: string; owner: string; recep: string; prof1: string; prof2: string; fin: string; prof1ProfileId: string };
let P: Tenant, Q: Tenant;
let I1: string, I2: string, I3: string;          // instrutores do studio P
let MOD: string;                                  // modalidade
let FREQ: string, PKG: string, TRIAL: string;     // planos
let TODAY: string;

async function tok(authUserId: string) {
  return new SignJWT({ role: "authenticated" }).setProtectedHeader({ alg: "HS256" })
    .setSubject(authUserId).setAudience("authenticated").setExpirationTime("1h").sign(new TextEncoder().encode(SECRET));
}
async function seedTenant(label: string, businessType = "pilates"): Promise<Tenant> {
  const [t] = await sql`INSERT INTO tenants (name, slug, business_type, plan_tier, max_professionals, max_clients)
    VALUES (${label}, ${label + "-" + Date.now()}, ${businessType}, 'pro', 20, 10000) RETURNING id`;
  const u: Record<string, string> = {};
  let prof1ProfileId = "";
  for (const [k, role] of [["owner", "owner"], ["recep", "receptionist"], ["prof1", "professional"], ["prof2", "professional"], ["fin", "financial"]]) {
    const auth = randomUUID();
    const [p] = await sql`INSERT INTO user_profiles (tenant_id, auth_user_id, full_name, role) VALUES (${t.id}, ${auth}, ${k}, ${role}) RETURNING id`;
    if (k === "prof1") prof1ProfileId = p.id;
    u[k] = await tok(auth);
  }
  return { id: t.id, owner: u.owner, recep: u.recep, prof1: u.prof1, prof2: u.prof2, fin: u.fin, prof1ProfileId };
}
const call = (method: string, url: string, token: string, body?: unknown) =>
  app.inject({ method, url: PREFIX + url, headers: { authorization: `Bearer ${token}` }, payload: body as any });
const data = (r: any) => r.json().data;
const ok = (r: any, status = 200) => { assert.equal(r.statusCode, status, r.body); return r.json().data; };
const code = (r: any) => r.json().code;

async function student(name: string, t = P) { return ok(await call("POST", "/class-students", t.owner, { fullName: name }), 201).id as string; }
async function enroll(studentId: string, planId: string, startDate = TODAY, t = P) {
  return ok(await call("POST", "/memberships/enrollments", t.owner, { studentId, planId, startDate }), 201).id as string;
}
/** Aula avulsa direto no banco, a N minutos de agora (negativo = já começou). */
async function adhoc(minutes: number, capacity = 4, instructor = I1, tenant = P.id, duration = 50) {
  const [s] = await sql`INSERT INTO class_sessions (tenant_id, session_date, starts_at, ends_at, instructor_id, capacity, class_type)
    VALUES (${tenant}, ((now() + make_interval(mins => ${minutes})) AT TIME ZONE 'America/Sao_Paulo')::date,
      now() + make_interval(mins => ${minutes}), now() + make_interval(mins => ${minutes + duration}), ${instructor}, ${capacity}, 'group') RETURNING id`;
  return s.id as string;
}
/** Inscrição direto no banco (para aulas que já começaram). */
async function rawBooking(sessionId: string, clientId: string, enrollmentId: string | null, kind: string) {
  const [b] = await sql`INSERT INTO class_bookings (tenant_id, session_id, client_id, enrollment_id, kind) VALUES (${P.id}, ${sessionId}, ${clientId}, ${enrollmentId}, ${kind}) RETURNING id`;
  return b.id as string;
}
/** O Log de ações é gravado sem esperar (fire-and-forget): aguarda o registro aparecer. */
async function waitLog(where: (s: typeof sql) => any) {
  for (let i = 0; i < 40; i++) { const [r] = await where(sql); if (r) return r; await new Promise((ok) => setTimeout(ok, 50)); }
  throw new Error("registro do Log de ações não apareceu");
}
/** audit_logs guarda old/new como JSON (às vezes volta como texto). */
const j = (v: any) => (typeof v === "string" ? JSON.parse(v) : v);
const usage = async (enrollmentId: string, studentId: string) =>
  data(await call("GET", `/memberships/enrollments?studentId=${studentId}`, P.owner)).find((e: any) => e.id === enrollmentId).usage;
const makeups = async (studentId: string) => data(await call("GET", `/classes/makeups?studentId=${studentId}`, P.owner));
/** Dia da semana (0-6) de hoje + N dias, em Brasília. */
async function dowIn(days: number) { const [r] = await sql`SELECT EXTRACT(DOW FROM (now() AT TIME ZONE 'America/Sao_Paulo')::date + ${days}::int)::int AS d`; return r.d as number; }
async function sessionsOf(scheduleId: string) {
  return (await sql`SELECT id, to_char(session_date, 'YYYY-MM-DD') AS d FROM class_sessions WHERE schedule_id = ${scheduleId} ORDER BY session_date`) as any[];
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
  P = await seedTenant("studio-p");
  Q = await seedTenant("studio-q");
  const [t] = await sql`SELECT to_char((now() AT TIME ZONE 'America/Sao_Paulo')::date, 'YYYY-MM-DD') AS d`;
  TODAY = t.d;
  I1 = ok(await call("POST", "/class-instructors", P.owner, { fullName: "Fernanda" }), 201).id;
  I2 = ok(await call("POST", "/class-instructors", P.owner, { fullName: "Rafael" }), 201).id;
  I3 = ok(await call("POST", "/class-instructors", P.owner, { fullName: "Bruna" }), 201).id;
  MOD = ok(await call("POST", "/classes/modalities", P.owner, { name: "Reformer" }), 201).id;
  FREQ = ok(await call("POST", "/memberships/plans", P.owner, { name: "2x", kind: "frequency", classesPerWeek: 2, durationMonths: 3, price: 300 }), 201).id;
  PKG = ok(await call("POST", "/memberships/plans", P.owner, { name: "10 aulas", kind: "package", totalClasses: 10, validityDays: 60, price: 450 }), 201).id;
  TRIAL = ok(await call("POST", "/memberships/plans", P.owner, { name: "Experimental", kind: "package", totalClasses: 1, validityDays: 7, price: 0, isTrial: true }), 201).id;
});

after(async () => {
  await app?.close();
  await sql.end();
  const { closeDatabaseConnection } = await import("../src/db/connection");
  await closeDatabaseConnection();
  process.exit(0);
});

// ─── regras ─────────────────────────────────────────────────────────────────
test("regras: padrões do studio criados na hora, editáveis e no Log (antigo → novo)", async () => {
  const s = ok(await call("GET", "/classes/settings", P.owner));
  assert.equal(s.cancelMinHours, 12); assert.equal(s.makeupValidityDays, 30); assert.equal(s.makeupMaxPerMonth, 2);
  assert.equal(s.unexcusedAbsenceConsumesCredit, true); assert.equal(s.unexcusedAbsenceGeneratesMakeup, false);
  assert.equal(s.excusedAbsenceGeneratesMakeup, true); assert.equal(s.studioCancelActionPackage, "refund_credit");
  assert.equal(s.studioCancelActionFrequency, "generate_makeup"); assert.equal(s.pauseMaxDays, 30);
  assert.equal(s.instructorAttendanceScope, "own"); assert.equal(s.instructorEditWindowHours, 24);
  assert.equal(s.allowIndividualSlot, true); assert.equal(s.individualSlotCapacity, 1);

  assert.equal((await call("PATCH", "/classes/settings", P.owner, { cancelMinHours: 500 })).statusCode, 400);
  assert.equal((await call("PATCH", "/classes/settings", P.recep, { cancelMinHours: 6 })).statusCode, 403, "recepção não muda regra");
  ok(await call("PATCH", "/classes/settings", P.owner, { cancelMinHours: 6 }));
  const log = await waitLog((q) => q`SELECT old_data, new_data FROM audit_logs WHERE tenant_id = ${P.id} AND action = 'classes.settings.updated' ORDER BY created_at DESC LIMIT 1`);
  assert.deepEqual(j(log.old_data), { cancelMinHours: 12 });
  assert.deepEqual(j(log.new_data), { cancelMinHours: 6 });
  ok(await call("PATCH", "/classes/settings", P.owner, { cancelMinHours: 12 }));
});

test("/auth/me informa o perfil e se pode gerenciar (a aba de regras depende disso)", async () => {
  const me = async (token: string) => ok(await call("GET", "/auth/me", token));
  assert.deepEqual([(await me(P.owner)).role, (await me(P.owner)).canManage], ["owner", true]);
  for (const token of [P.recep, P.prof1, P.fin]) assert.equal((await me(token)).canManage, false);
});

test("regras: exceção por plano (vazio = padrão do studio) e Log da exceção", async () => {
  const { effectiveRules } = await import("../src/modules/group-classes/rules");
  const studio = { cancel_min_hours: 12, cancel_deadline_enabled: true, studio_cancel_action_package: "refund_credit", studio_cancel_action_frequency: "generate_makeup" } as any;
  const r1 = effectiveRules(studio, { kind: "package", cancel_min_hours: null });
  assert.equal(r1.cancelMinHours, 12); assert.equal(r1.studioCancelAction, "refund_credit"); assert.deepEqual(r1.fromPlan, []);
  const r2 = effectiveRules(studio, { kind: "frequency", cancel_min_hours: 2, studio_cancel_action: "refund_credit" });
  assert.equal(r2.cancelMinHours, 2); assert.equal(r2.studioCancelAction, "refund_credit");
  assert.deepEqual(r2.fromPlan.sort(), ["cancelMinHours", "studioCancelAction"]);

  const plano = ok(await call("POST", "/memberships/plans", P.owner, { name: "Flex", kind: "package", totalClasses: 5, validityDays: 30, cancelMinHours: 2 }), 201);
  assert.equal(plano.cancelMinHours, 2);
  const limpo = ok(await call("PATCH", `/memberships/plans/${plano.id}`, P.owner, { cancelMinHours: null }));
  assert.equal(limpo.cancelMinHours, null, "null volta a usar o padrão do studio");
  const log = await waitLog((q) => q`SELECT old_data, new_data FROM audit_logs WHERE record_id = ${plano.id} AND action = 'classes.plan.updated' ORDER BY created_at DESC LIMIT 1`);
  assert.deepEqual(j(log.old_data), { cancelMinHours: 2 });
  assert.deepEqual(j(log.new_data), { cancelMinHours: null });
});

// ─── grade e geração ────────────────────────────────────────────────────────
test("grade: gera as aulas das próximas 4 semanas, sem duplicar, no fuso de Brasília", async () => {
  const dow = await dowIn(2);
  const s = ok(await call("POST", "/classes/schedules", P.owner, { instructorId: I1, modalityId: MOD, dayOfWeek: dow, startTime: "07:15", capacity: 3 }), 201);
  const first = await sessionsOf(s.id);
  assert.equal(first.length, 4, "4 semanas");
  await call("GET", `/classes/sessions?from=${TODAY}&to=2099-01-01`, P.owner);
  await call("GET", `/classes/sessions?from=${TODAY}&to=2099-01-01`, P.owner);
  assert.equal((await sessionsOf(s.id)).length, 4, "gerar de novo não duplica");
  const [r] = await sql`SELECT to_char(starts_at AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI') AS local, to_char(starts_at AT TIME ZONE 'UTC', 'HH24:MI') AS utc,
    duration_minutes FROM class_sessions ss JOIN class_schedules s ON s.id = ss.schedule_id WHERE ss.schedule_id = ${s.id} LIMIT 1`;
  assert.equal(r.local, "07:15");
  assert.equal(r.utc, "10:15", "Brasília (sem horário de verão) = UTC-3 pelo fuso, não por constante");
  const [dur] = await sql`SELECT extract(epoch FROM ends_at - starts_at)::int AS s FROM class_sessions WHERE schedule_id = ${s.id} LIMIT 1`;
  assert.equal(dur.s, 50 * 60, "duração padrão do studio");
  assert.equal(code(await call("POST", "/classes/schedules", P.owner, { instructorId: I1, dayOfWeek: dow, startTime: "07:30" })), "INSTRUCTOR_CONFLICT");
});

test("fuso: aula às 23:50 de hoje aparece em 'Aulas de hoje' (em UTC já é amanhã)", async () => {
  const r = ok(await call("POST", "/classes/sessions", P.owner, { date: TODAY, startTime: "23:50", instructorId: I3, classType: "assessment" }), 201);
  const [s] = await sql`SELECT to_char(starts_at AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI') AS utc, to_char(session_date, 'YYYY-MM-DD') AS d FROM class_sessions WHERE id = ${r.id}`;
  assert.equal(s.d, TODAY);
  assert.ok(s.utc > `${TODAY} 23:59`, `em UTC é o dia seguinte (${s.utc})`);
  const hoje = ok(await call("GET", "/classes/sessions/today", P.owner));
  assert.ok(hoje.today.some((x: any) => x.id === r.id), "aula das 23:50 está em hoje");
});

// ─── vagas e travas (C4) ────────────────────────────────────────────────────
test("C4: 10 inscrições simultâneas numa aula de 4 vagas → exatamente 4 aceitas", async () => {
  const sessionId = await adhoc(48 * 60, 4, I2);
  const alunos: [string, string][] = [];
  for (let i = 0; i < 10; i++) { const s = await student(`Concorrente ${i}`); alunos.push([s, await enroll(s, PKG)]); }
  const res = await Promise.all(alunos.map(([s, e]) => call("POST", "/classes/bookings", P.recep, { sessionId, studentId: s, enrollmentId: e })));
  const codes = res.map((r: any) => r.statusCode).sort();
  assert.deepEqual(codes, [201, 201, 201, 201, 409, 409, 409, 409, 409, 409]);
  assert.ok(res.filter((r: any) => r.statusCode === 409).every((r: any) => code(r) === "CLASS_FULL"));
  const [n] = await sql`SELECT count(*)::int AS n FROM class_bookings WHERE session_id = ${sessionId}`;
  assert.equal(n.n, 4);
});

test("C4: pacote e horário fixo ao mesmo tempo na última vaga → só um é aceito", async () => {
  for (let rodada = 0; rodada < 3; rodada++) {
    const dow = await dowIn(3);
    const sch = ok(await call("POST", "/classes/schedules", P.owner, { instructorId: I3, dayOfWeek: dow, startTime: `1${rodada}:00`, capacity: 1 }), 201).id;
    const [sess] = await sessionsOf(sch);
    const sp = await student(`Pacote ${rodada}`), ep = await enroll(sp, PKG);
    const sf = await student(`Fixo ${rodada}`), ef = await enroll(sf, FREQ);
    const [a, b] = await Promise.all([
      call("POST", "/classes/bookings", P.recep, { sessionId: sess.id, studentId: sp, enrollmentId: ep }),
      call("POST", "/classes/slots", P.recep, { enrollmentId: ef, scheduleId: sch }),
    ]);
    assert.deepEqual([a.statusCode, b.statusCode].sort(), [201, 409], `rodada ${rodada}: ${a.body} | ${b.body}`);
    const [n] = await sql`SELECT count(*)::int AS n FROM class_bookings WHERE session_id = ${sess.id} AND status = 'booked'`;
    assert.equal(n.n, 1, "a aula não passa da capacidade");
  }
});

// ─── horário fixo (C2) ──────────────────────────────────────────────────────
test("horário fixo: limite do plano, inscrição em todas as aulas geradas, só em frequência", async () => {
  const s1 = ok(await call("POST", "/classes/schedules", P.owner, { instructorId: I2, dayOfWeek: await dowIn(1), startTime: "18:00", capacity: 4 }), 201).id;
  const s2 = ok(await call("POST", "/classes/schedules", P.owner, { instructorId: I2, dayOfWeek: await dowIn(4), startTime: "18:00", capacity: 4 }), 201).id;
  const s3 = ok(await call("POST", "/classes/schedules", P.owner, { instructorId: I2, dayOfWeek: await dowIn(5), startTime: "18:00", capacity: 4 }), 201).id;
  const aluno = await student("Maria Fixa"), e = await enroll(aluno, FREQ);
  ok(await call("POST", "/classes/slots", P.recep, { enrollmentId: e, scheduleId: s1 }), 201);
  ok(await call("POST", "/classes/slots", P.recep, { enrollmentId: e, scheduleId: s2 }), 201);
  assert.equal(code(await call("POST", "/classes/slots", P.recep, { enrollmentId: e, scheduleId: s3 })), "SLOT_LIMIT");
  assert.equal(code(await call("POST", "/classes/slots", P.recep, { enrollmentId: e, scheduleId: s1 })), "SLOT_EXISTS");
  const [n] = await sql`SELECT count(*)::int AS n FROM class_bookings b JOIN class_sessions ss ON ss.id = b.session_id
    WHERE b.client_id = ${aluno} AND b.kind = 'fixed' AND ss.schedule_id IN (${s1}, ${s2})`;
  assert.equal(n.n, 8, "4 aulas de cada horário");
  const pac = await student("Pacote sem fixo"), ep = await enroll(pac, PKG);
  assert.equal(code(await call("POST", "/classes/slots", P.recep, { enrollmentId: ep, scheduleId: s3 })), "NOT_FREQUENCY");
  const u = await usage(e, aluno);
  assert.equal(u.perWeek, 2);
});

test("horário fixo novo: confere a vaga em TODAS as aulas já geradas da turma", async () => {
  const sch = ok(await call("POST", "/classes/schedules", P.owner, { instructorId: I1, dayOfWeek: await dowIn(1), startTime: "20:00", capacity: 1 }), 201).id;
  const aulas = await sessionsOf(sch);
  const pac = await student("Ocupa semana 3"), ep = await enroll(pac, PKG);
  ok(await call("POST", "/classes/bookings", P.recep, { sessionId: aulas[2].id, studentId: pac, enrollmentId: ep }), 201);
  const fx = await student("Quer fixo"), ef = await enroll(fx, FREQ);
  const r = await call("POST", "/classes/slots", P.recep, { enrollmentId: ef, scheduleId: sch });
  assert.equal(code(r), "CLASS_FULL");
  assert.ok(r.json().error.includes(aulas[2].d.split("-").reverse().join("/")), r.body);
});

test("vaga de fixo ainda não gerada (além das 4 semanas) é respeitada pelo pacote", async () => {
  const sch = ok(await call("POST", "/classes/schedules", P.owner, { instructorId: I1, dayOfWeek: await dowIn(6), startTime: "09:00", capacity: 1 }), 201).id;
  const fx = await student("Fixo além"), ef = await enroll(fx, FREQ);
  ok(await call("POST", "/classes/slots", P.recep, { enrollmentId: ef, scheduleId: sch }), 201);
  const [aula] = await sessionsOf(sch);
  // Simula uma aula cujo fixo ainda não virou inscrição (como numa data além da janela).
  await sql`DELETE FROM class_bookings WHERE session_id = ${aula.id} AND client_id = ${fx}`;
  const pac = await student("Pacote além"), ep = await enroll(pac, PKG);
  assert.equal(code(await call("POST", "/classes/bookings", P.recep, { sessionId: aula.id, studentId: pac, enrollmentId: ep })), "CLASS_FULL");
});

test("horário fixo só ocupa vaga até o fim da matrícula", async () => {
  const sch = ok(await call("POST", "/classes/schedules", P.owner, { instructorId: I3, dayOfWeek: await dowIn(1), startTime: "06:00", capacity: 1 }), 201).id;
  const aulas = await sessionsOf(sch);
  const fx = await student("Fim curto"), ef = await enroll(fx, FREQ);
  ok(await call("PATCH", `/memberships/enrollments/${ef}`, P.owner, { endDate: aulas[1].d }));
  ok(await call("POST", "/classes/slots", P.recep, { enrollmentId: ef, scheduleId: sch }), 201);
  const [n] = await sql`SELECT count(*)::int AS n FROM class_bookings WHERE client_id = ${fx}`;
  assert.equal(n.n, 2, "só as 2 aulas até o fim");
  const pac = await student("Depois do fim"), ep = await enroll(pac, PKG);
  ok(await call("POST", "/classes/bookings", P.recep, { sessionId: aulas[2].id, studentId: pac, enrollmentId: ep }), 201);
});

test("horário individual: chave, 1 ou 2 vagas, conflito do instrutor e aviso de jornada", async () => {
  const fx = await student("Individual"), ef = await enroll(fx, FREQ);
  // Jornada de Rafael (I2): sem trabalho no dia escolhido -> aviso, não bloqueia.
  const dow = await dowIn(2);
  ok(await call("PUT", `/class-instructors/${I2}/schedules`, P.owner, [{ dayOfWeek: dow, isWorking: false, startTime: "08:00", endTime: "12:00" }]));
  const r = ok(await call("POST", "/classes/slots", P.recep, { enrollmentId: ef, individual: { dayOfWeek: dow, startTime: "10:00", instructorId: I2 } }), 201);
  assert.equal(r.warning, "Horário fora da jornada de trabalho do instrutor");
  const [s] = await sql`SELECT capacity, class_type, owner_enrollment_id FROM class_schedules WHERE id = ${r.scheduleId}`;
  assert.equal(s.capacity, 1); assert.equal(s.class_type, "individual"); assert.equal(s.owner_enrollment_id, ef);
  // Conflito: I2 já tem aula às 10:00 nesse dia.
  const fx2 = await student("Individual 2"), ef2 = await enroll(fx2, FREQ);
  assert.equal(code(await call("POST", "/classes/slots", P.recep, { enrollmentId: ef2, individual: { dayOfWeek: dow, startTime: "10:30", instructorId: I2 } })), "INSTRUCTOR_CONFLICT");
  // 2 vagas (dupla) pelo padrão do studio.
  ok(await call("PATCH", "/classes/settings", P.owner, { individualSlotCapacity: 2 }));
  const r2 = ok(await call("POST", "/classes/slots", P.recep, { enrollmentId: ef2, individual: { dayOfWeek: dow, startTime: "14:00", instructorId: I2 } }), 201);
  const [s2] = await sql`SELECT capacity, class_type FROM class_schedules WHERE id = ${r2.scheduleId}`;
  assert.equal(s2.capacity, 2); assert.equal(s2.class_type, "duo");
  ok(await call("PATCH", "/classes/settings", P.owner, { individualSlotCapacity: 1 }));
  // Chave desligada no plano.
  const semInd = ok(await call("POST", "/memberships/plans", P.owner, { name: "Sem individual", kind: "frequency", classesPerWeek: 1, durationMonths: 1, allowIndividualSlot: false }), 201).id;
  const fx3 = await student("Individual 3"), ef3 = await enroll(fx3, semInd);
  assert.equal(code(await call("POST", "/classes/slots", P.recep, { enrollmentId: ef3, individual: { dayOfWeek: dow, startTime: "16:00", instructorId: I2 } })), "INDIVIDUAL_DISABLED");
  // Remover o horário individual desativa a grade dele.
  const [slot] = await sql`SELECT id FROM class_enrollment_slots WHERE enrollment_id = ${ef}`;
  ok(await call("DELETE", `/classes/slots/${slot.id}`, P.recep));
  const [g] = await sql`SELECT is_active FROM class_schedules WHERE id = ${r.scheduleId}`;
  assert.equal(g.is_active, false);
  const [left] = await sql`SELECT count(*)::int AS n FROM class_bookings WHERE client_id = ${fx} AND status = 'booked'`;
  assert.equal(left.n, 0);
});

// ─── consumo (C1) e reposição por presença ──────────────────────────────────
test("pacote: presente desconta; falta sem aviso desconta; falta justificada não desconta nem gera reposição", async () => {
  const a = await student("Pacote consumo"), e = await enroll(a, PKG);
  const b1 = await rawBooking(await adhoc(-30), a, e, "credit");
  const b2 = await rawBooking(await adhoc(-90), a, e, "credit");
  const b3 = await rawBooking(await adhoc(-150), a, e, "credit");
  assert.equal(ok(await call("POST", `/classes/bookings/${b1}/attendance`, P.recep, { status: "present" })).creditConsumed, true);
  const r2 = ok(await call("POST", `/classes/bookings/${b2}/attendance`, P.recep, { status: "absent" }));
  assert.equal(r2.creditConsumed, true); assert.equal(r2.makeupGenerated, false);
  const r3 = ok(await call("POST", `/classes/bookings/${b3}/attendance`, P.recep, { status: "excused" }));
  assert.equal(r3.creditConsumed, false); assert.equal(r3.makeupGenerated, false, "no pacote o crédito devolvido já é a compensação");
  const u = await usage(e, a);
  assert.deepEqual({ total: u.total, consumed: u.consumed, remaining: u.remaining }, { total: 10, consumed: 2, remaining: 8 });
  const hist = ok(await call("GET", `/classes/bookings/history?studentId=${a}`, P.owner));
  assert.ok(hist.some((h: any) => h.text.startsWith("−1 crédito · falta sem aviso") && h.text.includes("regra do studio")), JSON.stringify(hist));
  assert.ok(hist.some((h: any) => h.text.startsWith("crédito mantido · falta justificada")));
  assert.ok(hist.some((h: any) => h.text.startsWith("−1 crédito · presença")));
});

test("frequência: presença não desconta; falta sem aviso não gera reposição; justificada gera", async () => {
  const a = await student("Freq consumo"), e = await enroll(a, FREQ);
  const b1 = await rawBooking(await adhoc(-30, 4, I2), a, e, "fixed");
  const b2 = await rawBooking(await adhoc(-100, 4, I2), a, e, "fixed");
  const b3 = await rawBooking(await adhoc(-170, 4, I2), a, e, "fixed");
  assert.equal(ok(await call("POST", `/classes/bookings/${b1}/attendance`, P.recep, { status: "present" })).creditConsumed, false);
  assert.equal(ok(await call("POST", `/classes/bookings/${b2}/attendance`, P.recep, { status: "absent" })).makeupGenerated, false);
  assert.equal(ok(await call("POST", `/classes/bookings/${b3}/attendance`, P.recep, { status: "excused" })).makeupGenerated, true);
  const ms = await makeups(a);
  assert.equal(ms.length, 1); assert.equal(ms[0].reason, "excused_absence"); assert.equal(ms[0].status, "available");
  const hist = ok(await call("GET", `/classes/bookings/history?studentId=${a}`, P.owner));
  assert.ok(hist.some((h: any) => h.text.startsWith("+1 reposição · falta justificada") && h.text.includes("regra do studio")), JSON.stringify(hist));
  // Mudar a presença desfaz a reposição gerada.
  ok(await call("POST", `/classes/bookings/${b3}/attendance`, P.owner, { status: "present" }));
  assert.equal((await makeups(a)).length, 0);
  const [bk] = await sql`SELECT attendance_marked_by IS NOT NULL AS m, attendance_updated_by IS NOT NULL AS u FROM class_bookings WHERE id = ${b3}`;
  assert.equal(bk.m, true); assert.equal(bk.u, true, "registra quem alterou");
  const log = await waitLog((q) => q`SELECT old_data, new_data FROM audit_logs WHERE record_id = ${b3} AND action = 'classes.attendance.changed'`);
  assert.deepEqual([j(log.old_data), j(log.new_data)], [{ status: "excused" }, { status: "present" }]);
});

test("reposição usada impede mudar a presença que a gerou; reposição respeita validade e limite mensal", async () => {
  const a = await student("Repositor"), e = await enroll(a, FREQ);
  const origem = await rawBooking(await adhoc(-40, 4, I3), a, e, "fixed");
  ok(await call("POST", `/classes/bookings/${origem}/attendance`, P.recep, { status: "excused" }));
  const [m] = await makeups(a);
  // As 3 reposições caem amanhã em horários fixos: mesmo mês sempre, mesmo no último dia do mês.
  const amanhaAs = async (h: number) => {
    const [r] = await sql`SELECT floor(EXTRACT(EPOCH FROM ((((now() AT TIME ZONE 'America/Sao_Paulo')::date + 1) + make_time(${h}::int, 0, 0)) AT TIME ZONE 'America/Sao_Paulo') - now()) / 60)::int AS m`;
    return adhoc(r.m, 4, I3);
  };
  const alvo = await amanhaAs(10);
  ok(await call("POST", "/classes/bookings", P.recep, { sessionId: alvo, studentId: a, makeupCreditId: m.id }), 201);
  assert.equal((await makeups(a))[0].status, "used");
  assert.equal(code(await call("POST", `/classes/bookings/${origem}/attendance`, P.owner, { status: "present" })), "MAKEUP_ALREADY_USED");
  // Validade: aula depois do vencimento.
  const [m2] = await sql`INSERT INTO class_makeup_credits (tenant_id, client_id, enrollment_id, reason, expires_on)
    VALUES (${P.id}, ${a}, ${e}, 'excused_absence', ${TODAY}::date + 1) RETURNING id`;
  const longe = await adhoc(5 * 24 * 60, 4, I3);
  assert.equal(code(await call("POST", "/classes/bookings", P.recep, { sessionId: longe, studentId: a, makeupCreditId: m2.id })), "MAKEUP_EXPIRED");
  // Limite mensal (2): segunda no mesmo mês ok, terceira recusada.
  const extra = [];
  for (let i = 0; i < 2; i++) {
    const [x] = await sql`INSERT INTO class_makeup_credits (tenant_id, client_id, enrollment_id, reason, expires_on)
      VALUES (${P.id}, ${a}, ${e}, 'excused_absence', ${TODAY}::date + 30) RETURNING id`;
    extra.push(x.id);
  }
  const r1 = await call("POST", "/classes/bookings", P.recep, { sessionId: await amanhaAs(12), studentId: a, makeupCreditId: extra[0] });
  const r2 = await call("POST", "/classes/bookings", P.recep, { sessionId: await amanhaAs(14), studentId: a, makeupCreditId: extra[1] });
  assert.equal(r1.statusCode, 201, r1.body);
  assert.equal(code(r2), "MAKEUP_MONTHLY_LIMIT");
  // Histórico separa as reposições: geradas, usadas e vencidas.
  await sql`INSERT INTO class_makeup_credits (tenant_id, client_id, enrollment_id, reason, expires_on)
    VALUES (${P.id}, ${a}, ${e}, 'excused_absence', ${TODAY}::date - 1)`;
  const hist = ok(await call("GET", `/classes/bookings/history?studentId=${a}`, P.owner));
  const conta = (ev: string) => hist.filter((h: any) => h.event === ev).length;
  assert.deepEqual({ geradas: conta("makeup_generated"), usadas: conta("makeup_used"), vencidas: conta("makeup_expired") },
    { geradas: 5, usadas: 2, vencidas: 1 }, JSON.stringify(hist));
  assert.ok(hist.every((h: any) => h.type === "credit" ? h.event === "credit" : h.event.startsWith("makeup_")));
});

// ─── cancelamento pelo aluno ────────────────────────────────────────────────
test("cancelamento: no prazo não desconta / gera reposição; fora do prazo desconta / sem reposição; exceção do plano", async () => {
  const a = await student("Cancela pacote"), e = await enroll(a, PKG);
  const longe = await adhoc(48 * 60, 4, I2), perto = await adhoc(120, 4, I2);
  const b1 = ok(await call("POST", "/classes/bookings", P.recep, { sessionId: longe, studentId: a, enrollmentId: e }), 201).id;
  const b2 = ok(await call("POST", "/classes/bookings", P.recep, { sessionId: perto, studentId: a, enrollmentId: e }), 201).id;
  const pick = (r: any) => ({ timely: r.timely, creditConsumed: r.creditConsumed, makeupGenerated: r.makeupGenerated });
  // Prévia: mostra o efeito sem gravar.
  const prev = ok(await call("POST", `/classes/bookings/${b2}/cancel?preview=1`, P.recep));
  assert.deepEqual(pick(prev), { timely: false, creditConsumed: true, makeupGenerated: false });
  const [aindaAtiva] = await sql`SELECT status FROM class_bookings WHERE id = ${b2}`;
  assert.equal(aindaAtiva.status, "booked", "prévia não grava nada");
  assert.deepEqual(pick(ok(await call("POST", `/classes/bookings/${b1}/cancel`, P.recep))), { timely: true, creditConsumed: false, makeupGenerated: false });
  assert.deepEqual(pick(ok(await call("POST", `/classes/bookings/${b2}/cancel`, P.recep))), { timely: false, creditConsumed: true, makeupGenerated: false });
  const hist = ok(await call("GET", `/classes/bookings/history?studentId=${a}`, P.owner));
  assert.ok(hist.some((h: any) => h.delta === -1 && h.text.startsWith("−1 crédito · cancelou fora do prazo") && h.text.includes("regra do studio")), JSON.stringify(hist));
  assert.ok(hist.some((h: any) => h.text.startsWith("crédito mantido · cancelou no prazo")));
  const u = await usage(e, a);
  assert.equal(u.consumed, 1); assert.equal(u.remaining, 9);
  // A vaga cancelada fica livre de novo.
  const [st] = await sql`SELECT status FROM class_bookings WHERE id = ${b1}`;
  assert.equal(st.status, "cancelled");

  const f = await student("Cancela fixo"), ef = await enroll(f, FREQ);
  const bf1 = await rawBooking(await adhoc(48 * 60, 4, I3), f, ef, "fixed");
  const bf2 = await rawBooking(await adhoc(180, 4, I3), f, ef, "fixed");
  assert.equal(ok(await call("POST", `/classes/bookings/${bf1}/cancel`, P.recep)).makeupGenerated, true);
  assert.equal(ok(await call("POST", `/classes/bookings/${bf2}/cancel`, P.recep)).makeupGenerated, false);

  const flex = ok(await call("POST", "/memberships/plans", P.owner, { name: "Sem prazo", kind: "package", totalClasses: 5, validityDays: 30, cancelDeadlineEnabled: false }), 201).id;
  const g = await student("Sem prazo"), eg = await enroll(g, flex);
  const bg = ok(await call("POST", "/classes/bookings", P.recep, { sessionId: await adhoc(30, 4, I1), studentId: g, enrollmentId: eg }), 201).id;
  assert.equal(ok(await call("POST", `/classes/bookings/${bg}/cancel`, P.recep)).timely, true, "prazo desligado no plano");
});

// ─── cancelamento pelo studio ───────────────────────────────────────────────
test("studio cancela a aula: pacote devolve crédito, frequência gera reposição, reposição volta; exceção por plano", async () => {
  const sessao = await adhoc(72 * 60, 6, I2);
  const p = await student("Studio pacote"), ep = await enroll(p, PKG);
  ok(await call("POST", "/classes/bookings", P.recep, { sessionId: sessao, studentId: p, enrollmentId: ep }), 201);
  const f = await student("Studio fixo"), ef = await enroll(f, FREQ);
  await rawBooking(sessao, f, ef, "fixed");
  const r = await student("Studio reposicao"), er = await enroll(r, FREQ);
  const [mc] = await sql`INSERT INTO class_makeup_credits (tenant_id, client_id, enrollment_id, reason, expires_on)
    VALUES (${P.id}, ${r}, ${er}, 'excused_absence', ${TODAY}::date + 30) RETURNING id`;
  ok(await call("POST", "/classes/bookings", P.recep, { sessionId: sessao, studentId: r, makeupCreditId: mc.id }), 201);
  const gm = ok(await call("POST", "/memberships/plans", P.owner, { name: "Pacote repõe", kind: "package", totalClasses: 4, validityDays: 30, studioCancelAction: "generate_makeup" }), 201).id;
  const x = await student("Studio pacote repoe"), ex = await enroll(x, gm);
  ok(await call("POST", "/classes/bookings", P.recep, { sessionId: sessao, studentId: x, enrollmentId: ex }), 201);

  const previa = ok(await call("POST", `/classes/sessions/${sessao}/cancel?preview=1`, P.recep, { reason: "Feriado" }));
  assert.deepEqual([previa.refunded, previa.makeups, previa.effects.length], [1, 2, 4]);
  const [aindaAgendada] = await sql`SELECT status FROM class_sessions WHERE id = ${sessao}`;
  assert.equal(aindaAgendada.status, "scheduled", "prévia não cancela");
  const res = ok(await call("POST", `/classes/sessions/${sessao}/cancel`, P.recep, { reason: "Feriado" }));
  assert.deepEqual([res.refunded, res.makeups], [1, 2]);
  assert.equal(res.effects.find((e: any) => e.studentId === p).effect, "refund");
  assert.equal(res.effects.find((e: any) => e.studentId === x).effect, "makeup");
  assert.equal((await usage(ep, p)).consumed, 0, "pacote: crédito devolvido");
  assert.equal((await makeups(f)).length, 1, "frequência: reposição");
  assert.equal((await makeups(r))[0].status, "available", "reposição usada volta a ficar disponível");
  assert.equal((await usage(ex, x)).consumed, 1, "exceção do plano: vira reposição");
  assert.equal((await makeups(x)).length, 1);
  const [s] = await sql`SELECT status, cancel_reason FROM class_sessions WHERE id = ${sessao}`;
  assert.deepEqual([s.status, s.cancel_reason], ["cancelled", "Feriado"]);
  assert.equal(code(await call("POST", "/classes/bookings", P.recep, { sessionId: sessao, studentId: p, enrollmentId: ep })), "CLASS_CANCELLED");
});

// ─── pausa (C6) ─────────────────────────────────────────────────────────────
test("pausa: libera a vaga no período, estende a vigência e o fixo volta depois", async () => {
  const sch = ok(await call("POST", "/classes/schedules", P.owner, { instructorId: I3, dayOfWeek: await dowIn(3), startTime: "19:30", capacity: 1 }), 201).id;
  const aulas = await sessionsOf(sch);
  const f = await student("Pausada"), ef = await enroll(f, FREQ);
  ok(await call("POST", "/classes/slots", P.recep, { enrollmentId: ef, scheduleId: sch }), 201);
  const [antes] = await sql`SELECT to_char(end_date, 'YYYY-MM-DD') AS d FROM membership_enrollments WHERE id = ${ef}`;
  const p = ok(await call("POST", "/classes/pauses", P.recep, { enrollmentId: ef, startDate: aulas[0].d, endDate: aulas[0].d, reason: "Viagem" }), 201);
  assert.equal(p.days, 1);
  const [depois] = await sql`SELECT to_char(end_date, 'YYYY-MM-DD') AS d FROM membership_enrollments WHERE id = ${ef}`;
  const esperado = new Date(Date.parse(antes.d + "T00:00:00Z") + 86_400_000).toISOString().slice(0, 10);
  assert.equal(depois.d, esperado, "vigência estendida pelos dias pausados");
  const [b0] = await sql`SELECT status FROM class_bookings WHERE session_id = ${aulas[0].id} AND client_id = ${f}`;
  assert.equal(b0.status, "paused");
  const outro = await student("Usa a vaga"), eo = await enroll(outro, PKG);
  ok(await call("POST", "/classes/bookings", P.recep, { sessionId: aulas[0].id, studentId: outro, enrollmentId: eo }), 201);
  assert.equal(code(await call("POST", "/classes/bookings", P.recep, { sessionId: aulas[1].id, studentId: outro, enrollmentId: eo })), "CLASS_FULL", "depois da pausa o fixo está garantido");
  // Limites.
  assert.equal(code(await call("POST", "/classes/pauses", P.recep, { enrollmentId: ef, startDate: aulas[0].d, endDate: aulas[0].d })), "PAUSE_OVERLAP");
  assert.equal(code(await call("POST", "/classes/pauses", P.recep, { enrollmentId: ef, startDate: aulas[1].d, endDate: new Date(Date.parse(aulas[1].d) + 40 * 86_400_000).toISOString().slice(0, 10) })), "PAUSE_LIMIT");
  const semPausa = ok(await call("POST", "/memberships/plans", P.owner, { name: "Sem pausa", kind: "frequency", classesPerWeek: 1, durationMonths: 1, pauseEnabled: false }), 201).id;
  const g = await student("Sem pausa"), eg = await enroll(g, semPausa);
  assert.equal(code(await call("POST", "/classes/pauses", P.recep, { enrollmentId: eg, startDate: TODAY, endDate: TODAY })), "PAUSE_DISABLED");
});

// ─── grade: capacidade, troca de instrutor ──────────────────────────────────
test("reduzir capacidade: recusa abaixo dos fixos e abaixo das inscrições das aulas geradas", async () => {
  const sch = ok(await call("POST", "/classes/schedules", P.owner, { instructorId: I1, dayOfWeek: await dowIn(5), startTime: "11:00", capacity: 3 }), 201).id;
  const aulas = await sessionsOf(sch);
  const f = await student("Fixo cap"), ef = await enroll(f, FREQ);
  ok(await call("POST", "/classes/slots", P.recep, { enrollmentId: ef, scheduleId: sch }), 201);
  const p1 = await student("Pac cap 1"), e1 = await enroll(p1, PKG);
  const p2 = await student("Pac cap 2"), e2 = await enroll(p2, PKG);
  ok(await call("POST", "/classes/bookings", P.recep, { sessionId: aulas[1].id, studentId: p1, enrollmentId: e1 }), 201);
  ok(await call("POST", "/classes/bookings", P.recep, { sessionId: aulas[1].id, studentId: p2, enrollmentId: e2 }), 201);
  assert.equal(code(await call("PATCH", `/classes/schedules/${sch}`, P.owner, { capacity: 2 })), "CAPACITY_BELOW_BOOKINGS");
  const f2 = await student("Fixo cap 2"), ef2 = await enroll(f2, FREQ);
  await sql`DELETE FROM class_bookings WHERE session_id = ${aulas[1].id} AND kind = 'credit'`;
  ok(await call("POST", "/classes/slots", P.recep, { enrollmentId: ef2, scheduleId: sch }), 201);
  assert.equal(code(await call("PATCH", `/classes/schedules/${sch}`, P.owner, { capacity: 1 })), "CAPACITY_BELOW_FIXED");
  ok(await call("PATCH", `/classes/schedules/${sch}`, P.owner, { capacity: 2 }));
});

test("trocar o instrutor de UMA aula: confere conflito e sobrevive à edição da grade", async () => {
  const sch = ok(await call("POST", "/classes/schedules", P.owner, { instructorId: I1, dayOfWeek: await dowIn(4), startTime: "15:00" }), 201).id;
  const aulas = await sessionsOf(sch);
  ok(await call("PATCH", `/classes/sessions/${aulas[0].id}`, P.recep, { instructorId: I3, notes: "Substituição" }));
  ok(await call("PATCH", `/classes/schedules/${sch}`, P.owner, { startTime: "15:30" }));
  const rs = await sql`SELECT id, instructor_id, instructor_overridden, to_char(starts_at AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI') AS h FROM class_sessions
    WHERE schedule_id = ${sch} ORDER BY session_date`;
  assert.equal(rs[0].instructor_id, I3); assert.equal(rs[0].instructor_overridden, true); assert.equal(rs[0].h, "15:30");
  assert.equal(rs[1].instructor_id, I1); assert.equal(rs[1].h, "15:30");
  // Conflito: I2 com aula no mesmo horário.
  const [s1] = await sql`SELECT starts_at, ends_at, session_date FROM class_sessions WHERE id = ${aulas[1].id}`;
  await sql`INSERT INTO class_sessions (tenant_id, session_date, starts_at, ends_at, instructor_id, capacity) VALUES (${P.id}, ${s1.session_date}, ${s1.starts_at}, ${s1.ends_at}, ${I2}, 1)`;
  assert.equal(code(await call("PATCH", `/classes/sessions/${aulas[1].id}`, P.recep, { instructorId: I2 })), "INSTRUCTOR_CONFLICT");
  const log = await waitLog((q) => q`SELECT old_data FROM audit_logs WHERE record_id = ${aulas[0].id} AND action = 'classes.session.updated'`);
  assert.equal(j(log.old_data).instructorId, I1);
});

// ─── presença: permissões ───────────────────────────────────────────────────
test("presença: instrutor só nas dele e dentro do prazo; dono sem prazo; perfis sem permissão", async () => {
  ok(await call("PATCH", `/class-instructors/${I1}`, P.owner, { userProfileId: P.prof1ProfileId }));
  const a = await student("Presenca"), e = await enroll(a, PKG, new Date(Date.parse(TODAY) - 3 * 86_400_000).toISOString().slice(0, 10));
  const minha = await rawBooking(await adhoc(-30, 4, I1), a, e, "credit");
  const deOutro = await rawBooking(await adhoc(-100, 4, I2), a, e, "credit");
  const velha = await rawBooking(await adhoc(-30 * 60, 4, I1), a, e, "credit");
  const futura = await rawBooking(await adhoc(5 * 60, 4, I1), a, e, "credit");
  ok(await call("POST", `/classes/bookings/${minha}/attendance`, P.prof1, { status: "present" }));
  assert.equal(code(await call("POST", `/classes/bookings/${deOutro}/attendance`, P.prof1, { status: "present" })), "ATTENDANCE_NOT_ALLOWED");
  assert.equal(code(await call("POST", `/classes/bookings/${velha}/attendance`, P.prof1, { status: "present" })), "ATTENDANCE_NOT_ALLOWED", "prazo de 24 h");
  assert.equal(code(await call("POST", `/classes/bookings/${minha}/attendance`, P.prof2, { status: "absent" })), "ATTENDANCE_NOT_ALLOWED", "instrutor sem login ligado");
  assert.equal(code(await call("POST", `/classes/bookings/${minha}/attendance`, P.fin, { status: "absent" })), "ATTENDANCE_NOT_ALLOWED");
  assert.equal(code(await call("POST", `/classes/bookings/${futura}/attendance`, P.owner, { status: "present" })), "TOO_EARLY");
  ok(await call("POST", `/classes/bookings/${velha}/attendance`, P.owner, { status: "present" }));
  ok(await call("POST", `/classes/bookings/${deOutro}/attendance`, P.recep, { status: "present" }));
  ok(await call("PATCH", "/classes/settings", P.owner, { instructorAttendanceScope: "all" }));
  ok(await call("POST", `/classes/bookings/${deOutro}/attendance`, P.prof1, { status: "excused" }));
  ok(await call("PATCH", "/classes/settings", P.owner, { instructorAttendanceScope: "own" }));
  const detalhe = ok(await call("GET", `/classes/sessions/${(await sql`SELECT session_id FROM class_bookings WHERE id = ${minha}`)[0].session_id}`, P.owner));
  assert.equal(detalhe.bookings[0].attendance_marked_by_name, "prof1", "registra quem lançou");
  const insts = ok(await call("GET", "/class-instructors", P.owner));
  assert.equal(insts.find((i: any) => i.id === I1).loginName, "prof1");
  assert.equal(insts.find((i: any) => i.id === I2).userProfileId, null, "sem login");
});

test("marcar todos presentes lança só quem ainda está sem presença", async () => {
  const s = await adhoc(-20, 5, I3);
  const e1 = await student("Todos 1"), e2 = await student("Todos 2");
  const b1 = await rawBooking(s, e1, await enroll(e1, PKG), "credit");
  await rawBooking(s, e2, await enroll(e2, PKG), "credit");
  ok(await call("POST", `/classes/bookings/${b1}/attendance`, P.recep, { status: "absent" }));
  const pv = ok(await call("POST", `/classes/sessions/${s}/attendance-all?preview=1`, P.recep));
  assert.deepEqual([pv.marked, pv.creditsConsumed], [1, 1], "prévia: 1 aluno, 1 crédito");
  const r = ok(await call("POST", `/classes/sessions/${s}/attendance-all`, P.recep));
  assert.equal(r.marked, 1);
  const st = await sql`SELECT status FROM class_bookings WHERE session_id = ${s} ORDER BY status`;
  assert.deepEqual(st.map((x: any) => x.status), ["absent", "present"]);
});

// ─── aula extra, experimental e isolamento ──────────────────────────────────
test("aula extra: matrícula avulsa + inscrição juntas; plano por frequência recusado; experimental", async () => {
  const avulsa = ok(await call("POST", "/memberships/plans", P.owner, { name: "Aula avulsa", kind: "package", totalClasses: 1, validityDays: 30, price: 70 }), 201).id;
  const a = await student("Extra");
  const s = await adhoc(26 * 60, 4, I2);
  const r = ok(await call("POST", "/classes/bookings/extra", P.recep, { studentId: a, planId: avulsa, sessionId: s }), 201);
  const [b] = await sql`SELECT kind, enrollment_id FROM class_bookings WHERE id = ${r.id}`;
  assert.deepEqual([b.kind, b.enrollment_id], ["credit", r.enrollmentId]);
  assert.equal(code(await call("POST", "/classes/bookings/extra", P.recep, { studentId: a, planId: FREQ, sessionId: await adhoc(27 * 60, 4, I2) })), "NOT_PACKAGE");
  const t = await student("Experimental"), et = await enroll(t, TRIAL);
  ok(await call("POST", "/classes/bookings", P.recep, { sessionId: await adhoc(28 * 60, 4, I2), studentId: t, enrollmentId: et }), 201);
  assert.equal(code(await call("POST", "/classes/bookings", P.recep, { sessionId: await adhoc(29 * 60, 4, I2), studentId: t, enrollmentId: et })), "NO_CREDITS", "experimental = 1 aula");
});

test("isolamento: outro studio não vê nem inscreve nas aulas; recepção não mexe na grade", async () => {
  const s = await adhoc(30 * 60, 4, I1);
  assert.equal((await call("GET", `/classes/sessions/${s}`, Q.owner)).statusCode, 404);
  const qAluno = await student("Aluno Q", Q);
  const qPlano = ok(await call("POST", "/memberships/plans", Q.owner, { name: "Q", kind: "package", totalClasses: 5, validityDays: 30 }), 201).id;
  const qe = await enroll(qAluno, qPlano, TODAY, Q);
  assert.equal((await call("POST", "/classes/bookings", Q.owner, { sessionId: s, studentId: qAluno, enrollmentId: qe })).statusCode, 404);
  const pAluno = await student("Aluno P isolado");
  assert.equal((await call("POST", "/classes/bookings", Q.owner, { sessionId: s, studentId: pAluno, enrollmentId: qe })).statusCode, 404);
  const lista = ok(await call("GET", `/classes/sessions?from=${TODAY}&to=2099-01-01`, Q.owner));
  assert.ok(lista.every((x: any) => x.id !== s));
  assert.equal((await call("PATCH", `/classes/sessions/${s}`, Q.owner, { notes: "x" })).statusCode, 404);
  assert.equal((await call("POST", `/classes/sessions/${s}/cancel`, Q.owner, {})).statusCode, 404);
  assert.equal((await call("POST", "/classes/schedules", P.recep, { instructorId: I1, dayOfWeek: 1, startTime: "05:00" })).statusCode, 403);
  assert.equal((await call("PATCH", `/class-instructors/${I1}`, P.owner, { userProfileId: randomUUID() })).statusCode, 404, "login de outra equipe");
});

// ─── pendentes (C7) ─────────────────────────────────────────────────────────
test("pendentes: aula passada sem presença; instrutor só vê as dele; janela de 14 dias; isolamento", async () => {
  ok(await call("PATCH", `/class-instructors/${I1}`, P.owner, { userProfileId: P.prof1ProfileId }));
  const inicio = new Date(Date.parse(TODAY) - 30 * 86_400_000).toISOString().slice(0, 10);
  const a = await student("Pendente A"), b = await student("Pendente B");
  const ea = await enroll(a, PKG, inicio), eb = await enroll(b, PKG, inicio);
  const ontem = -24 * 60;
  const minha = await adhoc(ontem, 4, I1);       // 2 alunos sem presença
  await rawBooking(minha, a, ea, "credit"); await rawBooking(minha, b, eb, "credit");
  const deOutro = await adhoc(ontem - 90, 4, I2); // de outro instrutor
  await rawBooking(deOutro, a, ea, "credit");
  const lancada = await adhoc(ontem - 180, 4, I1); // presença já lançada
  const bl = await rawBooking(lancada, a, ea, "credit");
  ok(await call("POST", `/classes/bookings/${bl}/attendance`, P.owner, { status: "present" }));
  const velha = await adhoc(-20 * 24 * 60, 4, I1); // fora da janela de 14 dias
  await rawBooking(velha, a, ea, "credit");
  const cancelada = await adhoc(ontem - 270, 4, I1);
  await rawBooking(cancelada, b, eb, "credit");
  await sql`UPDATE class_sessions SET status = 'cancelled' WHERE id = ${cancelada}`;

  const ids = (r: any[]) => r.map((s) => s.id);
  const dono = ok(await call("GET", "/classes/sessions/pending", P.owner));
  assert.ok(ids(dono).includes(minha) && ids(dono).includes(deOutro), "dono vê as de todos");
  for (const x of [lancada, velha, cancelada]) assert.ok(!ids(dono).includes(x), "lançada, antiga e cancelada não são pendentes");
  assert.equal(dono.find((s: any) => s.id === minha).pending_count, 2);
  const instrutor = ok(await call("GET", "/classes/sessions/pending", P.prof1));
  assert.ok(ids(instrutor).includes(minha) && !ids(instrutor).includes(deOutro), "instrutor só vê as dele (escopo own)");
  ok(await call("PATCH", "/classes/settings", P.owner, { instructorAttendanceScope: "all" }));
  assert.ok(ids(ok(await call("GET", "/classes/sessions/pending", P.prof1))).includes(deOutro), "escopo all: vê todas");
  ok(await call("PATCH", "/classes/settings", P.owner, { instructorAttendanceScope: "own" }));
  assert.ok(!ids(ok(await call("GET", "/classes/sessions/pending", Q.owner))).includes(minha), "outra empresa não vê");
  // /today usa a mesma regra
  assert.deepEqual(ids(ok(await call("GET", "/classes/sessions/today", P.prof1)).pending), ids(instrutor));
  // lançar a presença tira da lista
  for (const bk of await sql`SELECT id FROM class_bookings WHERE session_id = ${minha}`) {
    ok(await call("POST", `/classes/bookings/${bk.id}/attendance`, P.owner, { status: "present" }));
  }
  assert.ok(!ids(ok(await call("GET", "/classes/sessions/pending", P.owner))).includes(minha));
});
