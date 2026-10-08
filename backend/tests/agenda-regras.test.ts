// Regras da agenda no backend (08/10/2026): 1) profissional habilitado para o serviço (só se ele tem algum configurado);
// 2) jornada, intervalo, dia sem atendimento e bloqueio; 3) choque de horário (409). Horários de Brasília.
// Também: horários livres (/professionals/:id/slots) seguem as mesmas regras; dois cadastros simultâneos no mesmo
// horário não passam juntos.
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
const sql = postgres(DB_URL, { max: 6, onnotice: () => {} });
let app: any;
let rules: typeof import("../src/modules/appointments/agenda-rules");
let T: { id: string; token: string; slug: string }, client: string, P: string, Q: string, S1: string, S2: string;
const DAY = "2030-01-03";    // quinta-feira
const SUNDAY = "2030-01-06"; // domingo

const token = (sub: string) => new SignJWT({ role: "authenticated" }).setProtectedHeader({ alg: "HS256" }).setSubject(sub)
  .setAudience("authenticated").setExpirationTime("1h").sign(new TextEncoder().encode(SECRET));
const req = (method: string, url: string, payload?: any) =>
  app.inject({ method, url: PREFIX + url, headers: { authorization: `Bearer ${T.token}` }, payload });
/** agendamento das HH:MM (Brasília), N minutos */
const at = (date: string, hhmm: string, min = 60) => {
  const s = rules.localToUtc(date, hhmm);
  return { scheduledAt: s.toISOString(), endsAt: new Date(s.getTime() + min * 60000).toISOString(), durationMinutes: min };
};
const book = (prof: string | null, svc: string | null, date: string, hhmm: string, min = 60, extra: any = {}) =>
  req("POST", "/appointments", { clientId: client, professionalId: prof, ...at(date, hhmm, min), status: "pending", source: "manual",
    ...(svc ? { services: [{ serviceId: svc, price: "50", durationMinutes: min, total: "50" }] } : {}), ...extra });

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
  rules = await import("../src/modules/appointments/agenda-rules");

  const slug = "agenda-" + Date.now();
  const [t] = await sql`INSERT INTO tenants (name, slug, business_type, plan_tier, trial_ends_at)
    VALUES ('Salão Agenda', ${slug}, 'beauty_salon', 'trial', now() + interval '20 days') RETURNING id`;
  const owner = randomUUID();
  await sql`INSERT INTO user_profiles (tenant_id, auth_user_id, full_name, role) VALUES (${t.id}, ${owner}, 'Dono', 'owner')`;
  T = { id: t.id, token: await token(owner), slug };
  client = (await sql`INSERT INTO clients (tenant_id, full_name, whatsapp) VALUES (${t.id}, 'Ana', '34999990000') RETURNING id`)[0].id;
  P = (await sql`INSERT INTO professionals (tenant_id, full_name) VALUES (${t.id}, 'Marina') RETURNING id`)[0].id;
  Q = (await sql`INSERT INTO professionals (tenant_id, full_name) VALUES (${t.id}, 'Julia') RETURNING id`)[0].id; // nada configurado
  S1 = (await sql`INSERT INTO services (tenant_id, name, duration_minutes, price) VALUES (${t.id}, 'Corte', 60, 50) RETURNING id`)[0].id;
  S2 = (await sql`INSERT INTO services (tenant_id, name, duration_minutes, price) VALUES (${t.id}, 'Unhas', 60, 40) RETURNING id`)[0].id;
  await sql`INSERT INTO professional_services (tenant_id, professional_id, service_id, duration_minutes, is_enabled) VALUES (${t.id}, ${P}, ${S1}, 60, true)`;
  await sql`INSERT INTO professional_schedules (professional_id, tenant_id, day_of_week, is_working, start_time, end_time, slot_minutes, break_start, break_end)
    VALUES (${P}, ${t.id}, 4, true, '08:00', '18:00', 30, '12:00', '13:30'), (${P}, ${t.id}, 0, false, '00:00', '00:00', 30, NULL, NULL)`;
  await sql`INSERT INTO professional_blocks (tenant_id, professional_id, starts_at, ends_at, reason)
    VALUES (${t.id}, ${P}, ${rules.localToUtc(DAY, "15:00").toISOString()}, ${rules.localToUtc(DAY, "16:00").toISOString()}, 'Médico')`;
});

after(async () => {
  await app?.close();
  await sql.end();
  const { closeDatabaseConnection } = await import("../src/db/connection");
  await closeDatabaseConnection();
  process.exit(0);
});

test("horário de Brasília: 08:00 de 03/01/2030 = 11:00 UTC; partes locais de volta", () => {
  assert.equal(rules.localToUtc(DAY, "08:00").toISOString(), "2030-01-03T11:00:00.000Z");
  assert.deepEqual(rules.localParts(new Date("2030-01-03T11:00:00Z")), { date: DAY, dow: 4, minutes: 480 });
  assert.equal(rules.localParts(new Date("2030-01-04T01:30:00Z")).date, DAY, "22:30 de Brasília ainda é dia 03");
});

test("1) habilitado: serviço fora dos configurados recusa; sem nada configurado não confere", async () => {
  const r = await book(P, S2, DAY, "08:00");
  assert.deepEqual([r.statusCode, r.json().code], [422, "PROFESSIONAL_NOT_ENABLED"]);
  assert.match(r.json().error, /Marina não está habilitado para o serviço "Unhas"/);
  assert.equal((await book(Q, S2, DAY, "08:00")).statusCode, 201, "Julia não tem serviço configurado");
});

test("2) jornada: antes do início, no intervalo, dia sem atendimento e bloqueio recusam", async () => {
  const cases: [string, string, string, RegExp][] = [
    [DAY, "07:00", "OUTSIDE_SCHEDULE", /Fora do horário de Marina: atende das 08:00 às 18:00/],
    [DAY, "17:30", "OUTSIDE_SCHEDULE", /atende das 08:00 às 18:00/],
    [DAY, "12:30", "OUTSIDE_SCHEDULE", /intervalo de Marina \(12:00 às 13:30\)/],
    [DAY, "11:30", "OUTSIDE_SCHEDULE", /intervalo/],
    [SUNDAY, "10:00", "OUTSIDE_SCHEDULE", /Marina não atende neste dia/],
    [DAY, "14:30", "PROFESSIONAL_BLOCKED", /bloqueada nesse horário \(Médico\)/],
  ];
  for (const [d, h, code, msg] of cases) {
    const r = await book(P, S1, d, h);
    assert.deepEqual([r.statusCode, r.json().code], [422, code], `${d} ${h}`);
    assert.match(r.json().error, msg);
  }
  assert.equal((await book(P, S1, DAY, "13:30")).statusCode, 201, "logo depois do intervalo pode");
});

test("3) choque: mesmo profissional no mesmo horário → 409; cancelado e apagado não ocupam", async () => {
  const first = await book(P, S1, DAY, "09:00");
  assert.equal(first.statusCode, 201);
  const clash = await book(P, S1, DAY, "09:30");
  assert.deepEqual([clash.statusCode, clash.json().code], [409, "SCHEDULE_CONFLICT"]);
  assert.match(clash.json().error, /Marina já tem agendamento das 09:00 às 10:00 \(Ana\)/);
  assert.equal((await book(P, S1, DAY, "10:00")).statusCode, 201, "encostado no fim pode");

  assert.equal((await req("POST", `/appointments/${first.json().data.id}/cancel`, { reason: "x" })).statusCode, 200);
  const again = await book(P, S1, DAY, "09:00");
  assert.equal(again.statusCode, 201, "cancelado não ocupa");
  assert.equal((await req("DELETE", `/appointments/${again.json().data.id}`)).statusCode, 204);
  assert.equal((await book(P, S1, DAY, "09:00")).statusCode, 201, "apagado não ocupa");
  assert.equal((await book(Q, null, DAY, "08:30")).statusCode, 409, "Julia (sem jornada) também não pode ter choque");
});

test("editar: mover para cima de outro → 409; salvar no próprio horário não conta como choque", async () => {
  const a = (await book(P, S1, DAY, "16:00")).json().data;
  assert.equal((await req("PATCH", `/appointments/${a.id}`, { internalNotes: "obs" })).statusCode, 200);
  assert.equal((await req("PATCH", `/appointments/${a.id}`, at(DAY, "16:00"))).statusCode, 200, "o próprio não é choque");
  const r = await req("PATCH", `/appointments/${a.id}`, at(DAY, "09:30"));
  assert.deepEqual([r.statusCode, r.json().code], [409, "SCHEDULE_CONFLICT"]);
  const r2 = await req("PATCH", `/appointments/${a.id}`, at(DAY, "12:30"));
  assert.deepEqual([r2.statusCode, r2.json().code], [422, "OUTSIDE_SCHEDULE"]);
  assert.equal((await req("PATCH", `/appointments/${randomUUID()}`, { internalNotes: "x" })).statusCode, 404);
});

test("horários livres: jornada, intervalo, bloqueio e agendamentos de Brasília; duração do serviço", async () => {
  const r = await req("GET", `/professionals/${P}/slots?serviceId=${S1}&date=${DAY}`);
  assert.equal(r.statusCode, 200, r.body);
  const { data, duration } = r.json();
  assert.equal(duration, 60);
  assert.equal(data[0], "08:00", "começa às 08:00 de Brasília");
  for (const h of ["08:30", "09:00", "09:30", "10:00", "11:30", "12:00", "13:00", "13:30", "14:00", "14:30", "15:00", "16:00", "17:30"]) {
    assert.ok(!data.includes(h), `${h} não pode estar livre`);
  }
  for (const h of ["08:00", "11:00", "17:00"]) assert.ok(data.includes(h), `${h} livre`);
  const sun = await req("GET", `/professionals/${P}/slots?serviceId=${S1}&date=${SUNDAY}`);
  assert.deepEqual(sun.json().data, [], "domingo não atende");
});

test("dois cadastros ao mesmo tempo no mesmo horário: só um passa", async () => {
  const [a, b] = await Promise.all([book(P, S1, DAY, "11:00"), book(P, S1, DAY, "11:00")]);
  assert.deepEqual([a.statusCode, b.statusCode].sort(), [201, 409]);
});

test("editar só status ou observação de agendamento antigo fora das regras: passa; mudar o horário confere", async () => {
  // antigo: domingo (Marina não atende) e em cima de outro agendamento, gravado antes das regras
  const old = { ...at(SUNDAY, "10:00") };
  const [a] = await sql`INSERT INTO appointments (tenant_id, client_id, professional_id, status, scheduled_at, ends_at, duration_minutes)
    VALUES (${T.id}, ${client}, ${P}, 'confirmed', ${old.scheduledAt}, ${old.endsAt}, 60) RETURNING id`;
  await sql`INSERT INTO appointments (tenant_id, client_id, professional_id, status, scheduled_at, ends_at, duration_minutes)
    VALUES (${T.id}, ${client}, ${P}, 'confirmed', ${old.scheduledAt}, ${old.endsAt}, 60)`;
  assert.equal((await req("PATCH", `/appointments/${a.id}`, { internalNotes: "observação" })).statusCode, 200, "observação");
  assert.equal((await req("PATCH", `/appointments/${a.id}`, { status: "completed" })).statusCode, 200, "status");
  assert.equal((await req("PATCH", `/appointments/${a.id}`, { ...old, professionalId: P, internalNotes: "x" })).statusCode, 200,
    "reenviar o mesmo horário e profissional não conta como mudança");
  const moved = await req("PATCH", `/appointments/${a.id}`, at(SUNDAY, "11:00"));
  assert.deepEqual([moved.statusCode, moved.json().code], [422, "OUTSIDE_SCHEDULE"], "mudou o horário: confere");
});

test("página pública: horário de Brasília, mesmos horários livres da agenda interna, choque recusado", async () => {
  const pub = (date: string, time: string) => app.inject({ method: "POST", url: `${PREFIX}/public/appointments`,
    payload: { tenantSlug: T.slug, clientId: client, professionalId: P, serviceId: S1, date, time } });
  const free = async (date: string) => (await app.inject({ method: "GET",
    url: `${PREFIX}/public/tenants/${T.slug}/availability?professionalId=${P}&serviceId=${S1}&date=${date}` })).json().data;
  const DAY2 = "2030-01-08"; // terça
  const internal = (await req("GET", `/professionals/${P}/slots?serviceId=${S1}&date=${DAY2}`)).json().data;
  assert.deepEqual(await free(DAY2), internal, "pública = interna");
  const r = await pub(DAY2, "09:00");
  assert.equal(r.statusCode, 201, r.body);
  const [row] = await sql`SELECT scheduled_at FROM appointments WHERE id = ${r.json().data.id}`;
  assert.equal(new Date(row.scheduled_at).toISOString(), "2030-01-08T12:00:00.000Z", "09:00 de Brasília = 12:00 UTC");
  assert.ok(!(await free(DAY2)).includes("09:00"), "some dos horários livres");
  const again = await pub(DAY2, "09:30");
  assert.deepEqual([again.statusCode, again.json().code], [409, "SCHEDULE_CONFLICT"]);
  assert.match(again.json().error, /Horario indisponivel/);
  const [x, y] = await Promise.all([pub(DAY2, "14:00"), book(P, S1, DAY2, "14:00")]);
  assert.deepEqual([x.statusCode, y.statusCode].sort(), [201, 409], "pública e interna ao mesmo tempo: só uma passa");
});

test("reativar (cancelado/não compareceu → status que ocupa) confere choque; pelas rotas de ação e pela edição", async () => {
  const D = "2030-01-09"; // quarta
  const a = (await book(P, S1, D, "09:00")).json().data;
  assert.equal((await req("POST", `/appointments/${a.id}/cancel`, { reason: "x" })).statusCode, 200);
  const b = await book(P, S1, D, "09:00");
  assert.equal(b.statusCode, 201, "horário liberado pelo cancelado foi ocupado por outro");

  for (const [method, url, payload] of [
    ["POST", `/appointments/${a.id}/confirm`, undefined],
    ["POST", `/appointments/${a.id}/checkin`, undefined],
    ["POST", `/appointments/${a.id}/complete`, {}],
    ["PATCH", `/appointments/${a.id}`, { status: "pending" }],
  ] as const) {
    const r = await req(method, url, payload);
    assert.deepEqual([r.statusCode, r.json().code], [409, "SCHEDULE_CONFLICT"], `${method} ${url}`);
  }
  const [{ status }] = await sql`SELECT status FROM appointments WHERE id = ${a.id}`;
  assert.equal(status, "cancelled", "continua cancelado");

  // não compareceu → confirmado também confere
  await sql`UPDATE appointments SET status = 'no_show' WHERE id = ${a.id}`;
  assert.equal((await req("POST", `/appointments/${a.id}/confirm`)).statusCode, 409);

  // liberado o horário (o outro foi cancelado), reativar passa
  assert.equal((await req("POST", `/appointments/${b.json().data.id}/cancel`, { reason: "x" })).statusCode, 200);
  const ok = await req("POST", `/appointments/${a.id}/confirm`);
  assert.equal(ok.statusCode, 200, ok.body);
  assert.equal(ok.json().data.status, "confirmed");

  // status que ocupa → status que ocupa não confere (confirmado → em atendimento → concluído)
  assert.equal((await req("POST", `/appointments/${a.id}/checkin`)).statusCode, 200);
  assert.equal((await req("POST", `/appointments/${a.id}/complete`, {})).statusCode, 200);
});
