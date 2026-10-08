// "+ Demo" ANTIGO (antes do lote 'example'): o retroativo anota o exemplo no lote e troca os contatos por fictícios,
// sem apagar nada; prévia não grava; confere nome da conta e extras; agendamento criado à mão não entra; depois disso
// o "Remover dados de exemplo" funciona (e recusa enquanto houver ligação com dado real).
// Uso: sh scripts/test-db.sh   (o banco de teste é APAGADO a cada execução)
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import postgres from "postgres";

const DB_URL = process.env.TEST_DATABASE_URL ?? "";
if (!/test/i.test(new URL(DB_URL || "postgres://x/none").pathname)) {
  throw new Error("Defina TEST_DATABASE_URL com um banco cujo nome contenha 'test' (ele será apagado).");
}
Object.assign(process.env, {
  NODE_ENV: "test", POSTGRES_URL: DB_URL, POSTGRES_SSL: "false",
  GOTRUE_URL: "http://127.0.0.1:9", GOTRUE_JWT_SECRET: "test-secret-at-least-32-characters-long!!", GOTRUE_SERVICE_KEY: "x",
  RESEND_API_KEY: "re_test", SUPER_ADMIN_SECRET: "super-admin-test", WHATSAPP_SEND_ENABLED: "false",
});
globalThis.fetch = (async (url: string) => { throw new Error(`rede desligada no teste: ${url}`); }) as any;

const sql = postgres(DB_URL, { max: 4, onnotice: () => {} });
let legacy: typeof import("../src/modules/example-data/example-legacy");
let svc: typeof import("../src/modules/example-data/example-data.service");
let guard: typeof import("../src/modules/super-admin/test-data.guard");

type Old = { id: string; name: string; realClient: string; handAppt: string; protectedIds: Record<string, string> };
let A: Old, B: Old;

/** Conta com o "+ Demo" antigo: nomes "Demo", tag 'demo', (34) 98001-..., internal_notes 'demo'; um profissional
 *  do exemplo renomeado sem "Demo"; um cliente real com um agendamento feito à mão com profissional do exemplo. */
async function oldDemo(name: string): Promise<Old> {
  const [t] = await sql`INSERT INTO tenants (name, slug, business_type, plan_tier) VALUES (${name}, ${"s" + Date.now() + Math.random()}, 'beauty_salon', 'free') RETURNING id`;
  const [up] = await sql`INSERT INTO user_profiles (tenant_id, auth_user_id, full_name, role) VALUES (${t.id}, gen_random_uuid(), 'Dono', 'owner') RETURNING id`;
  const [acc] = await sql`INSERT INTO financial_accounts (tenant_id, name, is_default) VALUES (${t.id}, 'Caixa', true) RETURNING id`;
  const [fc] = await sql`INSERT INTO financial_categories (tenant_id, name, type) VALUES (${t.id}, 'Serviços', 'revenue') RETURNING id`;
  const [p1] = await sql`INSERT INTO professionals (tenant_id, full_name) VALUES (${t.id}, 'Marina Demo Santos') RETURNING id`;
  const [p2] = await sql`INSERT INTO professionals (tenant_id, full_name) VALUES (${t.id}, 'Julia Costa') RETURNING id`; // renomeado
  await sql`INSERT INTO professional_schedules (professional_id, tenant_id, day_of_week, is_working, start_time, end_time)
    VALUES (${p1.id}, ${t.id}, 1, true, '08:00', '18:00'), (${p2.id}, ${t.id}, 1, true, '08:00', '18:00')`;
  const [cat] = await sql`INSERT INTO service_categories (tenant_id, name) VALUES (${t.id}, 'Demo Cabelo') RETURNING id`;
  const [s1] = await sql`INSERT INTO services (tenant_id, name, duration_minutes, price, category_id) VALUES (${t.id}, 'Demo Escova', 60, 60, ${cat.id}) RETURNING id`;
  const [s2] = await sql`INSERT INTO services (tenant_id, name, duration_minutes, price, category_id) VALUES (${t.id}, 'Coloracao', 120, 180, ${cat.id}) RETURNING id`;
  await sql`INSERT INTO professional_services (professional_id, service_id, tenant_id) VALUES (${p1.id}, ${s1.id}, ${t.id}), (${p2.id}, ${s2.id}, ${t.id})`;
  const cl = [];
  for (const [i, n] of ["Ana Demo Silva", "Bruno Santos"].entries()) { // o 2º renomeado, ainda com a tag
    const [c] = await sql`INSERT INTO clients (tenant_id, full_name, whatsapp, phone, email, tags, accepts_whatsapp)
      VALUES (${t.id}, ${n}, ${`(34) 98001-000${i + 1}`}, ${`(34) 98001-000${i + 1}`}, ${`c${i}.demo@email.com`}, ARRAY['demo']::text[], true) RETURNING id`;
    cl.push(c.id);
  }
  const [real] = await sql`INSERT INTO clients (tenant_id, full_name, whatsapp, email) VALUES (${t.id}, 'Cliente Real', '34997824990', 'real@gmail.com') RETURNING id`;
  const [a1] = await sql`INSERT INTO appointments (tenant_id, client_id, professional_id, status, scheduled_at, ends_at, duration_minutes, internal_notes)
    VALUES (${t.id}, ${cl[0]}, ${p1.id}, 'completed', now() - interval '3 days', now() - interval '3 days' + interval '1 hour', 60, 'demo') RETURNING id`;
  await sql`INSERT INTO appointment_services (appointment_id, service_id, price, tenant_id) VALUES (${a1.id}, ${s1.id}, 60, ${t.id})`;
  const [a2] = await sql`INSERT INTO appointments (tenant_id, client_id, professional_id, status, scheduled_at, ends_at, duration_minutes, internal_notes)
    VALUES (${t.id}, ${cl[1]}, ${p2.id}, 'confirmed', now() + interval '1 day', now() + interval '1 day 1 hour', 60, 'demo') RETURNING id`;
  await sql`INSERT INTO appointment_services (appointment_id, service_id, price, tenant_id) VALUES (${a2.id}, ${s2.id}, 180, ${t.id})`;
  const [hand] = await sql`INSERT INTO appointments (tenant_id, client_id, professional_id, status, scheduled_at, ends_at, duration_minutes)
    VALUES (${t.id}, ${real.id}, ${p1.id}, 'pending', now() + interval '2 days', now() + interval '2 days 1 hour', 60) RETURNING id`;
  await sql`INSERT INTO financial_transactions (tenant_id, account_id, type, amount, description, due_date)
    VALUES (${t.id}, ${acc.id}, 'revenue', 60, 'Demo - Demo Escova', current_date), (${t.id}, ${acc.id}, 'revenue', 99, 'Venda real', current_date)`;
  await sql`INSERT INTO leads (tenant_id, name, whatsapp, source, status) VALUES (${t.id}, 'Demo Lead Maria', '(34) 98002-0001', 'instagram', 'new'),
    (${t.id}, 'Lead Real', '34988887777', 'google', 'new')`;
  await sql`INSERT INTO packages (tenant_id, client_id, name, total_sessions, used_sessions, remaining_sessions, total_value, status)
    VALUES (${t.id}, ${cl[0]}, 'Demo Pacote 5x Demo Escova', 5, 2, 3, 270, 'active')`;
  return { id: t.id, name, realClient: real.id, handAppt: hand.id,
    protectedIds: { tenants: t.id, user_profiles: up.id, financial_accounts: acc.id, financial_categories: fc.id } };
}
const acct = (o: Old, extra = true) => ({ id: o.id, name: o.name, extraProfessionals: extra ? ["Julia Costa"] : [], extraServices: extra ? ["Coloracao"] : [] });
const batches = async (o: Old) => sql`SELECT id, kind, status FROM test_batches WHERE tenant_id = ${o.id}`;
const items = async (o: Old) => sql`SELECT table_name, record_id::text AS id FROM test_batch_items WHERE tenant_id = ${o.id}`;

before(async () => {
  await sql.unsafe("DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public; DROP SCHEMA IF EXISTS drizzle CASCADE;");
  const { drizzle } = await import("drizzle-orm/postgres-js");
  const { migrate } = await import("drizzle-orm/postgres-js/migrator");
  await migrate(drizzle(sql), { migrationsFolder: new URL("../src/db/migrations", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1") });
  legacy = await import("../src/modules/example-data/example-legacy");
  svc = await import("../src/modules/example-data/example-data.service");
  guard = await import("../src/modules/super-admin/test-data.guard");
  A = await oldDemo("Salão Beleza Pura");
  B = await oldDemo("Salão Beleza Pura"); // mesmo nome, outra conta
});

after(async () => {
  await sql.end();
  const { closeDatabaseConnection } = await import("../src/db/connection");
  await closeDatabaseConnection();
  process.exit(0);
});

test("prévia: mostra nome por nome e não grava nada", async () => {
  const r = await legacy.annotateLegacyDemo(acct(A), { apply: false, actor: "t" });
  assert.equal(r.applied, false);
  assert.deepEqual(r.names.clients, ["Ana Demo Silva", "Bruno Santos"]);
  assert.deepEqual(r.names.professionals, ["Marina Demo Santos", "Julia Costa"]);
  assert.deepEqual(r.names.services, ["Demo Escova", "Coloracao"]);
  assert.equal(r.counts.appointments, 2, "só os do + Demo (internal_notes demo)");
  assert.deepEqual(r.contacts, { clients: 2, leads: 1 });
  assert.equal((await batches(A)).length, 0);
  const [c] = await sql`SELECT whatsapp FROM clients WHERE tenant_id = ${A.id} AND full_name = 'Ana Demo Silva'`;
  assert.equal(c.whatsapp, "(34) 98001-0001", "contato não muda na prévia");
});

test("trava: nome da conta errado ou extra que não existe → erro, nada gravado", async () => {
  await assert.rejects(legacy.annotateLegacyDemo({ ...acct(A), name: "Outra" }, { apply: true, actor: "t" }), /se chama/);
  await assert.rejects(legacy.annotateLegacyDemo({ ...acct(A), extraProfessionals: ["Ninguem"] }, { apply: true, actor: "t" }), /achou 0/);
  assert.equal((await batches(A)).length, 0);
});

test("aplicar: anota o exemplo, troca contatos; real, agendamento à mão e conta/Financeiro ficam de fora", async () => {
  const r = await legacy.annotateLegacyDemo(acct(A), { apply: true, actor: "t" });
  assert.equal(r.applied, true);
  const b = await batches(A);
  assert.deepEqual(b.map((x) => [x.kind, x.status]), [["example", "ready"]]);
  const it = await items(A);
  const has = (tb: string, id: string) => it.some((i) => i.table_name === tb && i.id === id);
  assert.ok(!has("clients", A.realClient), "cliente real não entra");
  assert.ok(!has("appointments", A.handAppt), "agendamento feito à mão não entra");
  for (const [tb, id] of Object.entries(A.protectedIds)) assert.ok(!has(tb, id), tb);
  const tx = await sql`SELECT description FROM financial_transactions WHERE id::text IN ${sql(it.filter((i) => i.table_name === "financial_transactions").map((i) => i.id))}`;
  assert.deepEqual(tx.map((x) => x.description), ["Demo - Demo Escova"]);
  const cls = await sql`SELECT whatsapp, phone, email, accepts_whatsapp FROM clients WHERE tenant_id = ${A.id} AND tags @> ARRAY['demo']::text[]`;
  for (const c of cls) {
    assert.ok(guard.isFakePhone(c.whatsapp) && guard.isFakePhone(c.phone) && guard.isFakeEmail(c.email), JSON.stringify(c));
    assert.equal(c.accepts_whatsapp, false);
  }
  const [real] = await sql`SELECT whatsapp FROM clients WHERE id = ${A.realClient}`;
  assert.equal(real.whatsapp, "34997824990");
  const lds = await sql`SELECT name, whatsapp FROM leads WHERE tenant_id = ${A.id} ORDER BY name`;
  assert.ok(guard.isFakePhone(lds.find((l) => l.name === "Demo Lead Maria")!.whatsapp));
  assert.equal(lds.find((l) => l.name === "Lead Real")!.whatsapp, "34988887777");
  // a outra conta com o mesmo nome não foi tocada
  assert.equal((await batches(B)).length, 0);
  const [cb] = await sql`SELECT whatsapp FROM clients WHERE tenant_id = ${B.id} AND full_name = 'Ana Demo Silva'`;
  assert.equal(cb.whatsapp, "(34) 98001-0001");
  // rodar de novo não duplica
  const again = await legacy.annotateLegacyDemo(acct(A), { apply: true, actor: "t" });
  assert.equal(again.skipped, "já tem lote de exemplo");
});

test("depois do retroativo: remover recusa pela ligação com o real; sem ela, só o exemplo sai", async () => {
  const p = await svc.previewExampleRemoval(A.id);
  assert.deepEqual(p.linkedOutside, { appointments: 1 }, "agendamento à mão do cliente real com profissional do exemplo");
  await assert.rejects(svc.removeExampleData(A.id), (e: any) => e.code === "LINKED_TO_REAL_DATA");
  const [realProf] = await sql`INSERT INTO professionals (tenant_id, full_name) VALUES (${A.id}, 'Profissional Real') RETURNING id`;
  await sql`UPDATE appointments SET professional_id = ${realProf.id} WHERE id = ${A.handAppt}`; // "troque o profissional"
  await svc.removeExampleData(A.id);
  const left = await sql`SELECT full_name FROM clients WHERE tenant_id = ${A.id}`;
  assert.deepEqual(left.map((c) => c.full_name), ["Cliente Real"]);
  const pr = await sql`SELECT full_name FROM professionals WHERE tenant_id = ${A.id}`;
  assert.deepEqual(pr.map((x) => x.full_name), ["Profissional Real"]);
  assert.equal((await sql`SELECT count(*)::int n FROM appointments WHERE id = ${A.handAppt}`)[0].n, 1, "agendamento real fica");
  const tx = await sql`SELECT description FROM financial_transactions WHERE tenant_id = ${A.id}`;
  assert.deepEqual(tx.map((x) => x.description), ["Venda real"]);
  for (const [tb, id] of Object.entries(A.protectedIds)) {
    assert.equal((await sql.unsafe(`SELECT count(*)::int n FROM "${tb}" WHERE id = $1`, [id]))[0].n, 1, tb);
  }
});
