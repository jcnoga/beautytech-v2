// Super Admin, base comum de "Excluir conta" e "Dados de teste": ordem de exclusão pelas ligações reais do banco,
// impressão digital da prévia, nova conferência da senha com trava, marcas da conta e auditoria.
// Uso: sh scripts/test-db.sh   (o banco de teste é APAGADO a cada execução)
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { SignJWT } from "jose";
import jwt from "jsonwebtoken";

const DB_URL = process.env.TEST_DATABASE_URL ?? "";
if (!/test/i.test(new URL(DB_URL || "postgres://x/none").pathname)) {
  throw new Error("Defina TEST_DATABASE_URL com um banco cujo nome contenha 'test' (ele será apagado).");
}
const SECRET = "test-secret-at-least-32-characters-long!!";
const SA_SECRET = "super-admin-test";
Object.assign(process.env, {
  NODE_ENV: "test", POSTGRES_URL: DB_URL, POSTGRES_SSL: "false",
  GOTRUE_URL: "http://127.0.0.1:9", GOTRUE_JWT_SECRET: SECRET, GOTRUE_SERVICE_KEY: "nao-usado",
  RESEND_API_KEY: "re_test", SUPER_ADMIN_SECRET: SA_SECRET, SUPER_ADMIN_PASSWORD: "senha-certa-do-sa", WHATSAPP_SEND_ENABLED: "false",
});
globalThis.fetch = (async () => { throw new Error("rede desligada no teste"); }) as any;

const PREFIX = "/api/v1";
const sql = postgres(DB_URL, { max: 4, onnotice: () => {} });
let app: any;
let ddb: any; // conexão Drizzle (as funções do repositório usam .execute)
let svc: typeof import("../src/modules/super-admin/admin-ops.service");
let repo: typeof import("../src/modules/super-admin/admin-ops.repository");
const SA = jwt.sign({ email: "sa@test", role: "super_admin" }, SA_SECRET, { expiresIn: "1h" });

const req = (method: string, url: string, tok: string | undefined, payload?: any) =>
  app.inject({ method, url: PREFIX + url, headers: tok ? { authorization: `Bearer ${tok}` } : {}, payload });

before(async () => {
  await sql.unsafe("DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public; DROP SCHEMA IF EXISTS drizzle CASCADE;");
  const { drizzle } = await import("drizzle-orm/postgres-js");
  const { migrate } = await import("drizzle-orm/postgres-js/migrator");
  ddb = drizzle(sql);
  await migrate(ddb, { migrationsFolder: new URL("../src/db/migrations", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1") });
  const Fastify = (await import("fastify")).default;
  const { installFeatureGuard } = await import("../src/middleware/feature-guard");
  const { API_MODULES } = await import("../src/api-modules");
  app = Fastify();
  installFeatureGuard(app, PREFIX);
  for (const mod of API_MODULES) await app.register(mod as any, { prefix: PREFIX });
  await app.ready();
  svc = await import("../src/modules/super-admin/admin-ops.service");
  repo = await import("../src/modules/super-admin/admin-ops.repository");
});

after(async () => {
  await app?.close();
  await sql.end();
  const { closeDatabaseConnection } = await import("../src/db/connection");
  await closeDatabaseConnection();
  process.exit(0);
});

const edge = (child: string, parent: string) => ({ child, childColumn: "x", parent, parentColumn: "id", onDelete: "NO ACTION" });

test("ordem de exclusão: filhos antes dos pais; ligação consigo mesma não conta; ciclo é recusado", () => {
  const order = svc.deletionOrder(["a", "b", "c", "d"], [edge("b", "a"), edge("c", "b"), edge("d", "a"), edge("b", "b"), edge("x", "a")]);
  assert.ok(order.indexOf("c") < order.indexOf("b") && order.indexOf("b") < order.indexOf("a") && order.indexOf("d") < order.indexOf("a"), order.join(","));
  assert.throws(() => svc.deletionOrder(["a", "b"], [edge("a", "b"), edge("b", "a")]), (e: any) => e.code === "FK_CYCLE");
});

test("banco real: todas as tabelas da conta têm ordem (sem ciclo); auditoria fica de fora", async () => {
  const tables = await repo.tenantTables(ddb);
  const edges = await repo.fkEdges(ddb);
  assert.ok(tables.length >= 55, `tabelas com tenant_id: ${tables.length}`);
  assert.ok(!tables.includes("admin_operations"), "auditoria não tem tenant_id");
  assert.ok(tables.includes("test_batch_items") && tables.includes("financial_transactions"));
  const order = svc.deletionOrder([...tables, "tenants"], edges);
  const pos = (t: string) => order.indexOf(t);
  for (const [child, parent] of [["appointment_services", "appointments"], ["class_bookings", "class_sessions"], ["commissions", "financial_transactions"],
    ["financial_transactions", "membership_enrollments"], ["test_batch_items", "test_batches"], ["clients", "tenants"], ["user_profiles", "tenants"]]) {
    assert.ok(pos(child) < pos(parent), `${child} antes de ${parent}`);
  }
  assert.equal(order.at(-1), "tenants");
  assert.deepEqual(svc.incomingFromOutside([...tables, "tenants"], edges), [], "nenhuma tabela de fora aponta para dados da conta");
});

test("impressão digital da prévia: não depende da ordem das chaves; muda com qualquer número", () => {
  const h = svc.previewHash({ a: 1, b: 2 });
  assert.equal(svc.previewHash({ b: 2, a: 1 }), h);
  assert.notEqual(svc.previewHash({ a: 1, b: 3 }), h);
  assert.throws(() => svc.assertPreviewHash("outro", { a: 1, b: 2 }), (e: any) => e.code === "PREVIEW_CHANGED" && e.status === 409);
  assert.doesNotThrow(() => svc.assertPreviewHash(h, { a: 1, b: 2 }));
});

test("senha do Super Admin: errada recusa; 5 erros travam por 15 min (mesmo com a certa); outro IP segue livre", () => {
  svc.resetPasswordLocks();
  const now = 1_000_000;
  assert.doesNotThrow(() => svc.checkSuperAdminPassword("senha-certa-do-sa", "1.1.1.1", now));
  for (let i = 0; i < 5; i++) assert.throws(() => svc.checkSuperAdminPassword("errada", "1.1.1.1", now), (e: any) => e.code === "WRONG_PASSWORD");
  assert.throws(() => svc.checkSuperAdminPassword("senha-certa-do-sa", "1.1.1.1", now + 60_000), (e: any) => e.code === "LOCKED");
  assert.doesNotThrow(() => svc.checkSuperAdminPassword("senha-certa-do-sa", "2.2.2.2", now));
  assert.doesNotThrow(() => svc.checkSuperAdminPassword("senha-certa-do-sa", "1.1.1.1", now + 16 * 60_000), "trava acaba em 15 min");
  assert.throws(() => svc.checkSuperAdminPassword(undefined, "3.3.3.3", now), (e: any) => e.code === "WRONG_PASSWORD");
  assert.throws(() => svc.assertConfirmName("studio x", "Studio X"), (e: any) => e.code === "NAME_MISMATCH");
  assert.doesNotThrow(() => svc.assertConfirmName("Studio X", "Studio X"));
  svc.resetPasswordLocks();
});

test("marcas da conta: só Super Admin; valida o tipo; aparece na lista", async () => {
  const [t] = await sql`INSERT INTO tenants (name, slug, business_type) VALUES ('Conta Marca', ${"marca-" + Date.now()}, 'pilates') RETURNING id`;
  assert.equal((await req("PATCH", `/super-admin/tenants/${t.id}/flags`, undefined, { isProtected: true })).statusCode, 401);
  const owner = randomUUID();
  await sql`INSERT INTO user_profiles (tenant_id, auth_user_id, full_name, role) VALUES (${t.id}, ${owner}, 'Dono', 'owner')`;
  const tenantToken = await new SignJWT({ role: "authenticated" }).setProtectedHeader({ alg: "HS256" }).setSubject(owner)
    .setAudience("authenticated").setExpirationTime("1h").sign(new TextEncoder().encode(SECRET));
  assert.equal((await req("PATCH", `/super-admin/tenants/${t.id}/flags`, tenantToken, { isProtected: true })).statusCode, 401, "login de empresa não serve");
  assert.equal((await req("PATCH", `/super-admin/tenants/${t.id}/flags`, SA, { isProtected: "sim" })).statusCode, 400);
  assert.equal((await req("PATCH", `/super-admin/tenants/${t.id}/flags`, SA, {})).statusCode, 400);
  assert.equal((await req("PATCH", `/super-admin/tenants/${randomUUID()}/flags`, SA, { isProtected: true })).statusCode, 404);
  const ok = await req("PATCH", `/super-admin/tenants/${t.id}/flags`, SA, { isTestAccount: true });
  assert.equal(ok.statusCode, 200, ok.body);
  assert.deepEqual({ ...ok.json().data, id: undefined, name: undefined }, { id: undefined, name: undefined, isProtected: false, isTestAccount: true });
  const list = (await req("GET", "/super-admin/tenants", SA)).json().data;
  const mine = list.find((x: any) => x.id === t.id);
  assert.deepEqual([mine.isProtected, mine.isTestAccount], [false, true]);
});

test("auditoria: grava, fecha e lista por conta; sobrevive à conta apagada", async () => {
  const [t] = await sql`INSERT INTO tenants (name, slug) VALUES ('Some', ${"some-" + Date.now()}) RETURNING id`;
  const id = await repo.insertOperation(ddb, { operation: "test_generate", tenantId: t.id, tenantName: "Some", actor: "sa@test", ip: "1.1.1.1", counts: { clients: 2 } });
  await repo.finishOperation(ddb, id, { status: "done", details: { batchId: "x" } });
  await sql`DELETE FROM tenants WHERE id = ${t.id}`;
  const r = (await req("GET", `/super-admin/operations?tenantId=${t.id}`, SA)).json().data;
  assert.equal(r.length, 1);
  assert.deepEqual([r[0].operation, r[0].status, r[0].counts, r[0].details.batchId, r[0].tenantName], ["test_generate", "done", { clients: 2 }, "x", "Some"]);
  assert.ok(r[0].finishedAt);
  assert.equal((await req("GET", "/super-admin/operations", undefined)).statusCode, 401);
});
