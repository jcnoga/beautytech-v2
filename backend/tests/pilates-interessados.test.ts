// Pilates: funil de interessados (/class-leads), reaproveitando a tabela leads do CRM do salão.
// Etapas, nicho, isolamento entre empresas e convivência com as rotas /leads do salão.
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
const sql = postgres(DB_URL, { max: 2, onnotice: () => {} });
let app: any;

type T = { id: string; token: string; reception: string; instructor: string };
let A: T, B: T, S: T;

async function token(authUserId: string) {
  return new SignJWT({ role: "authenticated" }).setProtectedHeader({ alg: "HS256" })
    .setSubject(authUserId).setAudience("authenticated").setExpirationTime("1h").sign(new TextEncoder().encode(SECRET));
}
async function seed(label: string, businessType: string): Promise<T> {
  const [t] = await sql`INSERT INTO tenants (name, slug, business_type, plan_tier)
    VALUES (${"Studio " + label}, ${label + "-" + Date.now()}, ${businessType}, 'pro') RETURNING id`;
  const owner = randomUUID(), recep = randomUUID(), inst = randomUUID();
  await sql`INSERT INTO user_profiles (tenant_id, auth_user_id, full_name, role) VALUES (${t.id}, ${owner}, 'Dono', 'owner')`;
  await sql`INSERT INTO user_profiles (tenant_id, auth_user_id, full_name, role) VALUES (${t.id}, ${recep}, 'Recepcao', 'receptionist')`;
  await sql`INSERT INTO user_profiles (tenant_id, auth_user_id, full_name, role) VALUES (${t.id}, ${inst}, 'Instrutor', 'professional')`;
  return { id: t.id, token: await token(owner), reception: await token(recep), instructor: await token(inst) };
}

const call = (method: string, url: string, tok: string, body?: unknown) =>
  app.inject({ method, url: PREFIX + url, headers: { authorization: `Bearer ${tok}` }, payload: body as any });
const data = (res: any) => res.json().data;

/** Dia AAAA-MM-DD em Brasília, deslocado em N dias a partir de hoje. */
function daySP(offset: number) {
  const d = new Date(Date.now() + offset * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(d);
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

// ─── estrutura ──────────────────────────────────────────────────────────────
test("migration 0006: leads.status é texto, com padrão 'new'", async () => {
  const [col] = await sql`SELECT data_type, character_maximum_length AS len, column_default AS def
    FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'status'`;
  assert.equal(col.data_type, "character varying");
  assert.equal(col.len, 30);
  assert.match(col.def, /'new'/);
});

test("etapas: lista única, na ordem do funil", async () => {
  const res = await call("GET", "/class-leads/stages", A.token);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(data(res).map((s: any) => s.key), ["interested", "trial", "converted", "lost"]);
  assert.deepEqual(data(res).map((s: any) => s.label), ["Interessado", "Experimental", "Matriculado", "Perdido"]);
});

// ─── nicho ──────────────────────────────────────────────────────────────────
test("nicho: salão recebe 403 em /class-leads; Pilates recebe 403 em /leads", async () => {
  for (const url of ["/class-leads", "/class-leads/stages"]) {
    const res = await call("GET", url, S.token);
    assert.equal(res.statusCode, 403, url);
    assert.equal(res.json().code, "FEATURE_NOT_ALLOWED");
  }
  assert.equal((await call("POST", "/class-leads", S.token, { name: "X" })).statusCode, 403);
  assert.equal((await call("GET", "/leads", A.token)).statusCode, 403);
});

test("salão: /leads continua igual e valida a etapa (lista do salão)", async () => {
  const ok = await call("POST", "/leads", S.token, { name: "Cliente salão", status: "scheduled", whatsapp: "34999990000" });
  assert.equal(ok.statusCode, 201, ok.body);
  assert.equal(data(ok).status, "scheduled");
  const semEtapa = await call("POST", "/leads", S.token, { name: "Outra" });
  assert.equal(data(semEtapa).status, "new");
  assert.equal((await call("POST", "/leads", S.token, { name: "X", status: "trial" })).statusCode, 400, "etapa do Pilates não vale no salão");
  assert.equal((await call("PATCH", `/leads/${data(ok).id}`, S.token, { status: "proposta" })).statusCode, 400);
  const lista = await call("GET", "/leads?status=scheduled", S.token);
  assert.deepEqual(data(lista).map((l: any) => l.name), ["Cliente salão"]);
});

// ─── cadastro e etapas ──────────────────────────────────────────────────────
let leadA: string, leadB: string;
test("cadastro: começa em Interessado; tenantId do corpo é ignorado", async () => {
  const res = await call("POST", "/class-leads", A.reception, {
    name: "  Joana Lima ", whatsapp: "(34) 99999-1234", source: "instagram", followUpAt: daySP(2), notes: "Dor nas costas", tenantId: B.id,
  });
  assert.equal(res.statusCode, 201, res.body);
  leadA = data(res).id;
  assert.equal(data(res).name, "Joana Lima");
  assert.equal(data(res).status, "interested");
  assert.equal(data(res).followUpDate, daySP(2));
  assert.equal(data(res).followUpOverdue, false);
  const [row] = await sql`SELECT tenant_id FROM leads WHERE id = ${leadA}`;
  assert.equal(row.tenant_id, A.id);
  leadB = data(await call("POST", "/class-leads", B.token, { name: "Lead da B" })).id;
});

test("cadastro: nome obrigatório, etapa fora da lista e Matriculado direto são recusados", async () => {
  assert.equal((await call("POST", "/class-leads", A.token, { name: "  " })).statusCode, 400);
  const bad = await call("POST", "/class-leads", A.token, { name: "X", status: "scheduled" });
  assert.equal(bad.statusCode, 400);
  assert.equal(bad.json().code, "INVALID_STAGE");
  const conv = await call("POST", "/class-leads", A.token, { name: "X", status: "converted" });
  assert.equal(conv.statusCode, 400);
  assert.equal(conv.json().code, "STAGE_ONLY_BY_CONVERSION");
  assert.equal((await call("POST", "/class-leads", A.token, { name: "X", followUpAt: "05/10/2026" })).statusCode, 400);
});

test("etapas: muda para Experimental; Matriculado só pela conversão; etapa inválida é recusada", async () => {
  const exp = await call("PATCH", `/class-leads/${leadA}`, A.token, { status: "trial", notes: "Experimental sexta 8h" });
  assert.equal(exp.statusCode, 200, exp.body);
  assert.equal(data(exp).status, "trial");
  assert.equal(data(exp).notes, "Experimental sexta 8h");
  const conv = await call("PATCH", `/class-leads/${leadA}`, A.token, { status: "converted" });
  assert.equal(conv.statusCode, 400);
  assert.equal(conv.json().code, "STAGE_ONLY_BY_CONVERSION");
  assert.equal((await call("PATCH", `/class-leads/${leadA}`, A.token, { status: "proposta" })).statusCode, 400);
});

test("interessado já convertido não muda de etapa", async () => {
  const id = data(await call("POST", "/class-leads", A.token, { name: "Já aluna" })).id;
  await sql`UPDATE leads SET status = 'converted' WHERE id = ${id}`;
  const res = await call("PATCH", `/class-leads/${id}`, A.token, { status: "lost" });
  assert.equal(res.statusCode, 409);
  assert.equal(res.json().code, "LEAD_CONVERTED");
  assert.equal((await call("PATCH", `/class-leads/${id}`, A.token, { notes: "ok" })).statusCode, 200, "dados ainda podem ser editados");
});

test("lista: sem os perdidos por padrão, com contagem por etapa; ?status= filtra", async () => {
  const perdido = data(await call("POST", "/class-leads", A.token, { name: "Desistiu" })).id;
  assert.equal((await call("PATCH", `/class-leads/${perdido}`, A.token, { status: "lost" })).statusCode, 200);
  const res = await call("GET", "/class-leads", A.token);
  assert.equal(res.statusCode, 200);
  const nomes = data(res).map((l: any) => l.name);
  assert.ok(nomes.includes("Joana Lima"));
  assert.ok(!nomes.includes("Desistiu"), "perdido fica escondido");
  assert.equal(res.json().counts.lost, 1);
  const lost = data(await call("GET", "/class-leads?status=lost", A.token));
  assert.deepEqual(lost.map((l: any) => l.name), ["Desistiu"]);
  assert.equal((await call("GET", "/class-leads?status=xyz", A.token)).statusCode, 400);
});

test("próximo contato vencido só alerta nas etapas abertas", async () => {
  const atrasado = data(await call("POST", "/class-leads", A.token, { name: "Atrasada", followUpAt: daySP(-1) }));
  assert.equal(atrasado.followUpOverdue, true);
  const hoje = data(await call("POST", "/class-leads", A.token, { name: "Hoje", followUpAt: daySP(0) }));
  assert.equal(hoje.followUpOverdue, false, "hoje ainda não venceu");
  const perdido = data(await call("PATCH", `/class-leads/${atrasado.id}`, A.token, { status: "lost" }));
  assert.equal(perdido.followUpOverdue, false, "perdido não gera alerta");
  const limpo = data(await call("PATCH", `/class-leads/${hoje.id}`, A.token, { followUpAt: "" }));
  assert.equal(limpo.followUpDate, null);
});

// ─── permissões e isolamento ────────────────────────────────────────────────
test("instrutor só consulta; outra empresa não vê nem altera", async () => {
  assert.equal((await call("GET", "/class-leads", A.instructor)).statusCode, 200);
  assert.equal((await call("POST", "/class-leads", A.instructor, { name: "X" })).statusCode, 403);
  assert.equal((await call("PATCH", `/class-leads/${leadA}`, A.instructor, { notes: "X" })).statusCode, 403);
  assert.equal((await call("GET", `/class-leads/${leadB}`, A.token)).statusCode, 404);
  assert.equal((await call("PATCH", `/class-leads/${leadB}`, A.token, { name: "Invadido" })).statusCode, 404);
  assert.equal((await call("GET", "/class-leads/nao-e-uuid", A.token)).statusCode, 404);
  const lista = data(await call("GET", "/class-leads", A.token));
  assert.ok(lista.every((l: any) => l.id !== leadB));
  const [row] = await sql`SELECT name FROM leads WHERE id = ${leadB}`;
  assert.equal(row.name, "Lead da B");
});

// ─── conversão em aluno ─────────────────────────────────────────────────────
test("conversão: cria cliente + ficha de aluno com os dados do interessado e marca Matriculado", async () => {
  const lead = data(await call("POST", "/class-leads", A.token, { name: "Carla Souza", whatsapp: "(34) 98888-0001", followUpAt: daySP(-3) }));
  const res = await call("POST", `/class-leads/${lead.id}/convert`, A.reception, {});
  assert.equal(res.statusCode, 200, res.body);
  const { studentId, lead: after } = data(res);
  assert.equal(after.status, "converted");
  assert.equal(after.convertedTo, studentId);
  assert.ok(after.convertedAt);
  assert.equal(after.followUpOverdue, false, "matriculado não gera alerta");
  const [c] = await sql`SELECT tenant_id, full_name, whatsapp, source FROM clients WHERE id = ${studentId}`;
  assert.deepEqual({ ...c }, { tenant_id: A.id, full_name: "Carla Souza", whatsapp: "(34) 98888-0001", source: "lead" });
  const [p] = await sql`SELECT count(*)::int n FROM student_profiles WHERE client_id = ${studentId} AND tenant_id = ${A.id}`;
  assert.equal(p.n, 1, "ficha de aluno criada (não fica 'ficha incompleta')");
  const aluno = await call("GET", `/class-students/${studentId}`, A.token);
  assert.equal(aluno.statusCode, 200);
  assert.equal(data(aluno).hasProfile, true);

  const de_novo = await call("POST", `/class-leads/${lead.id}/convert`, A.token, {});
  assert.equal(de_novo.statusCode, 409);
  assert.equal(de_novo.json().code, "LEAD_CONVERTED");
});

test("conversão: WhatsApp já usado (só dígitos) → 409 com o cliente, sem criar nada; com confirmação cria", async () => {
  const [existente] = await sql`INSERT INTO clients (tenant_id, full_name, whatsapp) VALUES (${A.id}, 'Paula Antiga', '34 9 7777-0002') RETURNING id`;
  await sql`INSERT INTO clients (tenant_id, full_name, whatsapp) VALUES (${B.id}, 'Da outra empresa', '34977770003')`;
  const lead = data(await call("POST", "/class-leads", A.token, { name: "Paula Nova", whatsapp: "(34) 97777-0002" }));
  const antes = await sql`SELECT count(*)::int n FROM clients WHERE tenant_id = ${A.id}`;

  const dup = await call("POST", `/class-leads/${lead.id}/convert`, A.token, {});
  assert.equal(dup.statusCode, 409, dup.body);
  assert.equal(dup.json().code, "DUPLICATE_WHATSAPP");
  assert.deepEqual(dup.json().data, { clientId: existente.id, clientName: "Paula Antiga" });
  const depois = await sql`SELECT count(*)::int n FROM clients WHERE tenant_id = ${A.id}`;
  assert.equal(depois[0].n, antes[0].n, "nada criado");
  assert.equal(data(await call("GET", `/class-leads/${lead.id}`, A.token)).status, "interested", "etapa não muda");

  const ok = await call("POST", `/class-leads/${lead.id}/convert`, A.token, { confirmDuplicate: true });
  assert.equal(ok.statusCode, 200, ok.body);
  assert.notEqual(data(ok).studentId, existente.id, "cria um aluno novo");
  assert.equal(data(ok).lead.status, "converted");

  const outra = data(await call("POST", "/class-leads", A.token, { name: "Só na B", whatsapp: "34977770003" }));
  assert.equal((await call("POST", `/class-leads/${outra.id}/convert`, A.token, {})).statusCode, 200, "cliente de outra empresa não conta");
  const semZap = data(await call("POST", "/class-leads", A.token, { name: "Sem WhatsApp" }));
  assert.equal((await call("POST", `/class-leads/${semZap.id}/convert`, A.token, {})).statusCode, 200);
});

test("conversão: limite do plano dá 403 e nada é gravado; permissões e isolamento", async () => {
  const lead = data(await call("POST", "/class-leads", A.token, { name: "Limite", whatsapp: "34911110000" }));
  const [{ n }] = await sql`SELECT count(*)::int n FROM clients WHERE tenant_id = ${A.id} AND deleted_at IS NULL`;
  const [{ max_clients: original }] = await sql`SELECT max_clients FROM tenants WHERE id = ${A.id}`;
  await sql`UPDATE tenants SET max_clients = ${n} WHERE id = ${A.id}`;
  try {
    const res = await call("POST", `/class-leads/${lead.id}/convert`, A.token, {});
    assert.equal(res.statusCode, 403, res.body);
    assert.equal(res.json().code, "PLAN_LIMIT");
    const [{ m }] = await sql`SELECT count(*)::int m FROM clients WHERE tenant_id = ${A.id} AND deleted_at IS NULL`;
    assert.equal(m, n);
    assert.equal(data(await call("GET", `/class-leads/${lead.id}`, A.token)).status, "interested");
  } finally {
    await sql`UPDATE tenants SET max_clients = ${original} WHERE id = ${A.id}`;
  }
  assert.equal((await call("POST", `/class-leads/${lead.id}/convert`, A.instructor, {})).statusCode, 403);
  assert.equal((await call("POST", `/class-leads/${leadB}/convert`, A.token, {})).statusCode, 404);
  assert.equal((await call("POST", `/class-leads/${lead.id}/convert`, S.token, {})).statusCode, 403);
  assert.equal((await call("POST", `/class-leads/${lead.id}/convert`, A.token, { confirmDuplicate: "sim" })).statusCode, 400);
});

test("cadastro de aluno (POST /class-students) segue igual depois da mudança para o service", async () => {
  const res = await call("POST", "/class-students", A.token, { fullName: "Aluna Direta", whatsapp: "34922220000", level: "beginner" });
  assert.equal(res.statusCode, 201, res.body);
  assert.equal(data(res).fullName, "Aluna Direta");
  assert.equal(data(res).level, "beginner");
  assert.equal(data(res).hasProfile, true);
});
