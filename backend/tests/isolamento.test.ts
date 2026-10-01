// Testes de isolamento entre tenants e do CPF/CNPJ.
// Sobe as rotas reais num Fastify (fastify.inject) contra um Postgres de teste criado pelas
// migrations Drizzle. Tokens HS256 assinados aqui com o mesmo segredo do middleware (sem GoTrue).
//
// Uso: TEST_DATABASE_URL=postgres://usuario:senha@localhost:5432/zensalon_test npm test
// ATENÇÃO: o banco é APAGADO a cada execução; o nome precisa conter "test".
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
  RESEND_API_KEY: "re_test", SUPER_ADMIN_SECRET: "super-admin-test",
});

const sql = postgres(DB_URL, { max: 2, onnotice: () => {} });
let app: any;

interface Tenant {
  id: string; slug: string; token: string; client: string; professional: string; service: string;
  appointment: string; account: string; tx: string; lead: string; protocol: string; session: string; pkg: string;
}
let A: Tenant, B: Tenant;

async function seedTenant(label: string): Promise<Tenant> {
  const slug = `${label}-${Date.now()}`;
  const [t] = await sql`INSERT INTO tenants (name, slug) VALUES (${"Salao " + label}, ${slug}) RETURNING id`;
  const authUserId = randomUUID();
  await sql`INSERT INTO user_profiles (tenant_id, auth_user_id, full_name, role) VALUES (${t.id}, ${authUserId}, ${"Dono " + label}, 'owner')`;
  const [c] = await sql`INSERT INTO clients (tenant_id, full_name) VALUES (${t.id}, ${"Cliente " + label}) RETURNING id`;
  const [p] = await sql`INSERT INTO professionals (tenant_id, full_name) VALUES (${t.id}, ${"Prof " + label}) RETURNING id`;
  const [s] = await sql`INSERT INTO services (tenant_id, name) VALUES (${t.id}, ${"Servico " + label}) RETURNING id`;
  const [a] = await sql`INSERT INTO appointments (tenant_id, client_id, professional_id, scheduled_at, ends_at)
    VALUES (${t.id}, ${c.id}, ${p.id}, now() + interval '1 day', now() + interval '1 day 1 hour') RETURNING id`;
  const [acc] = await sql`INSERT INTO financial_accounts (tenant_id, name) VALUES (${t.id}, 'Caixa') RETURNING id`;
  const [tx] = await sql`INSERT INTO financial_transactions (tenant_id, account_id, type, description, amount, due_date)
    VALUES (${t.id}, ${acc.id}, 'revenue', 'Venda', 10, current_date) RETURNING id`;
  const [l] = await sql`INSERT INTO leads (tenant_id, name) VALUES (${t.id}, ${"Lead " + label}) RETURNING id`;
  const [pr] = await sql`INSERT INTO protocols (tenant_id, name) VALUES (${t.id}, 'Protocolo') RETURNING id`;
  const [ps] = await sql`INSERT INTO protocol_sessions (tenant_id, client_id, protocol_id) VALUES (${t.id}, ${c.id}, ${pr.id}) RETURNING id`;
  const [tp] = await sql`INSERT INTO treatment_packages (tenant_id, name) VALUES (${t.id}, 'Pacote') RETURNING id`;
  await sql`INSERT INTO professional_services (tenant_id, professional_id, service_id, commission_value) VALUES (${t.id}, ${p.id}, ${s.id}, 10)`;
  await sql`INSERT INTO professional_schedules (tenant_id, professional_id, day_of_week, start_time) VALUES (${t.id}, ${p.id}, 1, '08:00')`;
  const token = await new SignJWT({ role: "authenticated" }).setProtectedHeader({ alg: "HS256" })
    .setSubject(authUserId).setAudience("authenticated").setExpirationTime("1h").sign(new TextEncoder().encode(SECRET));
  return { id: t.id, slug, token, client: c.id, professional: p.id, service: s.id, appointment: a.id,
    account: acc.id, tx: tx.id, lead: l.id, protocol: pr.id, session: ps.id, pkg: tp.id };
}

const call = (method: string, url: string, body?: unknown, token = A.token) =>
  app.inject({ method, url: `/api/v1${url}`, headers: { authorization: `Bearer ${token}` }, payload: body as any });

/** Mesmo pedido com o ID do outro tenant -> 404; com o próprio -> sucesso (controle). */
async function isolated(method: string, url: string, foreign: unknown, own?: unknown) {
  const res = await call(method, url, foreign);
  assert.equal(res.statusCode, 404, `${method} ${url} com ID de outro tenant: esperado 404, veio ${res.statusCode} ${res.body}`);
  if (own !== undefined) {
    const ok = await call(method, url, own);
    assert.ok(ok.statusCode < 300, `${method} ${url} com IDs próprios: esperado 2xx, veio ${ok.statusCode} ${ok.body}`);
  }
}
const one = async (q: Promise<any[]>) => (await q)[0];

before(async () => {
  await sql.unsafe("DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public; DROP SCHEMA IF EXISTS drizzle CASCADE;");
  const { drizzle } = await import("drizzle-orm/postgres-js");
  const { migrate } = await import("drizzle-orm/postgres-js/migrator");
  await migrate(drizzle(sql), { migrationsFolder: new URL("../src/db/migrations", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1") });

  const Fastify = (await import("fastify")).default;
  const m = await import("../src/modules/all-modules");
  const { professionalScheduleRoutes } = await import("../src/modules/professionals/professional-schedule.routes");
  const { publicBookingModule } = await import("../src/modules/appointments/appointments.routes");
  app = Fastify();
  const prefix = "/api/v1";
  for (const mod of [m.clientsModule, m.appointmentsModule, m.packagesModule, m.financialModule, m.commissionsModule,
    m.crmModule, m.loyaltyModule, m.authModule, m.automationsModule, m.clientRecordsModule, m.consentFormsModule,
    m.appointmentPhotosModule, m.protocolsModule, m.protocolSessionsModule, m.packageSessionsModule,
    professionalScheduleRoutes, publicBookingModule]) {
    await app.register(mod as any, { prefix });
  }
  await app.ready();
  A = await seedTenant("a");
  B = await seedTenant("b");
});

after(async () => {
  await app?.close();
  await sql.end();
  const { closeDatabaseConnection } = await import("../src/db/connection");
  await closeDatabaseConnection();
  process.exit(0); // o módulo abre um segundo cliente postgres (all-modules) sem close exposto
});

// ─── clients ────────────────────────────────────────────────────────────────
test("POST /clients: preferredProfessionalId e referredById de outro tenant", async () => {
  await isolated("POST", "/clients", { fullName: "X", preferredProfessionalId: B.professional }, { fullName: "X", preferredProfessionalId: A.professional });
  await isolated("POST", "/clients", { fullName: "X", referredById: B.client }, { fullName: "X", referredById: A.client });
});
test("PATCH /clients/:id: preferredProfessionalId de outro tenant não é gravado", async () => {
  await isolated("PATCH", `/clients/${A.client}`, { preferredProfessionalId: B.professional });
  const row = await one(sql`SELECT preferred_professional_id FROM clients WHERE id = ${A.client}`);
  assert.equal(row.preferred_professional_id, null);
});

// ─── appointments ───────────────────────────────────────────────────────────
test("POST /appointments: cliente, profissional, serviço e profissional do item de outro tenant", async () => {
  const base = { scheduledAt: new Date().toISOString(), endsAt: new Date(Date.now() + 3600e3).toISOString(), totalPrice: "50" };
  await isolated("POST", "/appointments", { ...base, clientId: B.client }, { ...base, clientId: A.client });
  await isolated("POST", "/appointments", { ...base, clientId: A.client, professionalId: B.professional }, { ...base, clientId: A.client, professionalId: A.professional });
  await isolated("POST", "/appointments", { ...base, clientId: A.client, services: [{ serviceId: B.service }] }, { ...base, clientId: A.client, services: [{ serviceId: A.service }] });
  await isolated("POST", "/appointments", { ...base, clientId: A.client, services: [{ serviceId: A.service, professionalId: B.professional }] });
});
test("PATCH /appointments/:id: cliente e profissional de outro tenant", async () => {
  await isolated("PATCH", `/appointments/${A.appointment}`, { clientId: B.client }, { clientId: A.client });
  await isolated("PATCH", `/appointments/${A.appointment}`, { professionalId: B.professional }, { professionalId: A.professional });
});

// ─── packages / financial / goals ───────────────────────────────────────────
test("POST /packages: cliente de outro tenant", async () => {
  const base = { name: "P", totalSessions: 5, totalValue: 100 };
  await isolated("POST", "/packages", { ...base, clientId: B.client }, { ...base, clientId: A.client });
});
test("POST /packages/:id/use-session: desconta, conclui no fim e não passa do total nem de tenant", async () => {
  const pkg = await one(sql`INSERT INTO packages (tenant_id, client_id, name, total_sessions, used_sessions, remaining_sessions, total_value)
    VALUES (${A.id}, ${A.client}, 'Pacote 2x', 2, 0, 2, 100) RETURNING id`);
  const outro = await call("POST", `/packages/${pkg.id}/use-session`, undefined, B.token);
  assert.equal(outro.statusCode, 400, `pacote de outro tenant: ${outro.statusCode} ${outro.body}`);
  const r1 = await call("POST", `/packages/${pkg.id}/use-session`);
  assert.equal(r1.statusCode, 200, r1.body);
  assert.deepEqual([r1.json().data.usedSessions, r1.json().data.remainingSessions, r1.json().data.status], [1, 1, "active"]);
  const r2 = await call("POST", `/packages/${pkg.id}/use-session`);
  assert.deepEqual([r2.json().data.usedSessions, r2.json().data.remainingSessions, r2.json().data.status], [2, 0, "completed"]);
  const r3 = await call("POST", `/packages/${pkg.id}/use-session`);
  assert.equal(r3.statusCode, 400, r3.body);
});
test("POST /financial: cliente, profissional e agendamento de outro tenant", async () => {
  const base = { accountId: A.account, type: "revenue", description: "V", amount: "10", dueDate: "2026-10-01" };
  await isolated("POST", "/financial", { ...base, clientId: B.client }, { ...base, clientId: A.client });
  await isolated("POST", "/financial", { ...base, professionalId: B.professional }, { ...base, professionalId: A.professional });
  await isolated("POST", "/financial", { ...base, appointmentId: B.appointment }, { ...base, appointmentId: A.appointment });
});
test("PATCH /financial/:id: agendamento de outro tenant", async () => {
  await isolated("PATCH", `/financial/${A.tx}`, { appointmentId: B.appointment }, { appointmentId: A.appointment });
});
test("POST /goals: profissional de outro tenant", async () => {
  const base = { title: "Meta", targetAmount: "1000", targetDate: "2026-12-31" };
  await isolated("POST", "/goals", { ...base, professionalId: B.professional }, { ...base, professionalId: A.professional });
});

// ─── CRM / fidelidade / notificações ────────────────────────────────────────
test("POST e PATCH /leads: assignedTo de outro tenant", async () => {
  await isolated("POST", "/leads", { name: "L", assignedTo: B.professional }, { name: "L", assignedTo: A.professional });
  await isolated("PATCH", `/leads/${A.lead}`, { assignedTo: B.professional }, { assignedTo: A.professional });
});
test("POST /leads/:id/convert: lead e profissional de outro tenant", async () => {
  await isolated("POST", `/leads/${B.lead}/convert`, { clientData: { fullName: "C" } });
  await isolated("POST", `/leads/${A.lead}/convert`, { clientData: { fullName: "C", preferredProfessionalId: B.professional } },
    { clientData: { fullName: "C", preferredProfessionalId: A.professional } });
});
test("POST /loyalty/add-points: cliente de outro tenant não ganha pontos", async () => {
  await isolated("POST", "/loyalty/add-points", { clientId: B.client, points: 100 }, { clientId: A.client, points: 1 });
  const tx = await one(sql`SELECT count(*)::int AS n FROM loyalty_transactions WHERE client_id = ${B.client}`);
  assert.equal(tx.n, 0);
});
test("POST /automations/notifications/send-manual: cliente de outro tenant", async () => {
  await isolated("POST", "/automations/notifications/send-manual", { clientId: B.client, message: "oi" }, { clientId: A.client, message: "oi" });
});

// ─── clínica ────────────────────────────────────────────────────────────────
test("POST /client-records: cliente de outro tenant", async () => {
  await isolated("POST", "/client-records", { clientId: B.client }, { clientId: A.client });
});
test("POST /consent-forms: cliente de outro tenant", async () => {
  await isolated("POST", "/consent-forms", { clientId: B.client }, { clientId: A.client });
});
test("POST /appointment-photos: cliente e agendamento de outro tenant", async () => {
  const base = { storagePath: "x.png" };
  await isolated("POST", "/appointment-photos", { ...base, clientId: B.client }, { ...base, clientId: A.client });
  await isolated("POST", "/appointment-photos", { ...base, clientId: A.client, appointmentId: B.appointment }, { ...base, clientId: A.client, appointmentId: A.appointment });
});
test("POST /protocols: serviço de outro tenant", async () => {
  await isolated("POST", "/protocols", { name: "P", serviceId: B.service }, { name: "P", serviceId: A.service });
});
test("POST e PATCH /protocol-sessions: cliente e profissional de outro tenant", async () => {
  const base = { protocolId: A.protocol, sessionNumber: 1 };
  await isolated("POST", "/protocol-sessions", { ...base, clientId: B.client }, { ...base, clientId: A.client });
  await isolated("POST", "/protocol-sessions", { ...base, clientId: A.client, performedBy: B.professional }, { ...base, clientId: A.client, performedBy: A.professional });
  await isolated("PATCH", `/protocol-sessions/${A.session}`, { performedBy: B.professional }, { performedBy: A.professional });
});
test("POST /package-sessions: cliente de outro tenant", async () => {
  await isolated("POST", "/package-sessions", { clientId: B.client, packageId: A.pkg }, { clientId: A.client, packageId: A.pkg });
});

// ─── agenda do profissional (ON CONFLICT DO UPDATE alterava o outro tenant) ─
test("POST /professionals/:id/services: profissional ou serviço de outro tenant; comissão do outro intacta", async () => {
  await isolated("POST", `/professionals/${B.professional}/services`, { serviceId: B.service, commissionValue: 99 });
  await isolated("POST", `/professionals/${A.professional}/services`, { serviceId: B.service }, { serviceId: A.service });
  const row = await one(sql`SELECT commission_value FROM professional_services WHERE professional_id = ${B.professional}`);
  assert.equal(Number(row.commission_value), 10);
});
test("POST /professionals/:id/schedules: jornada do outro tenant intacta", async () => {
  const days = [{ dayOfWeek: 1, isWorking: false, startTime: "10:00", endTime: "11:00" }];
  await isolated("POST", `/professionals/${B.professional}/schedules`, { days }, undefined);
  const ok = await call("POST", `/professionals/${A.professional}/schedules`, { days });
  assert.equal(ok.statusCode, 200);
  const row = await one(sql`SELECT start_time FROM professional_schedules WHERE professional_id = ${B.professional} AND day_of_week = 1`);
  assert.equal(row.start_time, "08:00");
});
test("POST /professionals/:id/blocks: profissional de outro tenant", async () => {
  const body = { startsAt: new Date().toISOString(), endsAt: new Date(Date.now() + 3600e3).toISOString() };
  await isolated("POST", `/professionals/${B.professional}/blocks`, body, undefined);
  assert.equal((await call("POST", `/professionals/${A.professional}/blocks`, body)).statusCode, 200);
  const n = await one(sql`SELECT count(*)::int AS n FROM professional_blocks WHERE professional_id = ${B.professional}`);
  assert.equal(n.n, 0);
});

// ─── agendamento público ────────────────────────────────────────────────────
test("POST /public/appointments: cliente, profissional ou serviço de outro tenant", async () => {
  const base = { tenantSlug: A.slug, clientId: A.client, professionalId: A.professional, serviceId: A.service, date: "2030-01-10", time: "10:00" };
  for (const foreign of [{ clientId: B.client }, { professionalId: B.professional }, { serviceId: B.service }]) {
    const res = await app.inject({ method: "POST", url: "/api/v1/public/appointments", payload: { ...base, ...foreign } });
    assert.equal(res.statusCode, 404, `${JSON.stringify(foreign)} -> ${res.statusCode}`);
  }
  const ok = await app.inject({ method: "POST", url: "/api/v1/public/appointments", payload: base });
  assert.equal(ok.statusCode, 201, ok.body);
});

// ─── casos gerais ───────────────────────────────────────────────────────────
test("ID inválido ou registro apagado (soft delete) -> 404, não 500", async () => {
  await isolated("POST", "/client-records", { clientId: "nao-e-uuid" });
  const [c] = await sql`INSERT INTO clients (tenant_id, full_name, deleted_at) VALUES (${A.id}, 'Apagado', now()) RETURNING id`;
  await isolated("POST", "/client-records", { clientId: c.id });
});

// ─── CPF/CNPJ ───────────────────────────────────────────────────────────────
test("PATCH /auth/me/cpf-cnpj grava na coluna tenants.cpf_cnpj (não em settings)", async () => {
  const res = await call("PATCH", "/auth/me/cpf-cnpj", { cpfCnpj: "123.456.789-01" });
  assert.equal(res.statusCode, 200, res.body);
  const row = await one(sql`SELECT cpf_cnpj, settings FROM tenants WHERE id = ${A.id}`);
  assert.equal(row.cpf_cnpj, "12345678901");
  assert.equal(row.settings?.cpfCnpj, undefined);
  assert.equal((await call("PATCH", "/auth/me/cpf-cnpj", { cpfCnpj: "123" })).statusCode, 400);
  const other = await one(sql`SELECT cpf_cnpj FROM tenants WHERE id = ${B.id}`);
  assert.equal(other.cpf_cnpj, null);
});
