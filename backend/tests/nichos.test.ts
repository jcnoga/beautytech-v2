// Testes do controle de funcionalidades por nicho (Fase 1 do Pilates).
// Sobe TODOS os módulos da API (os mesmos do server.ts, via API_MODULES) com o guard de nicho,
// contra um Postgres de teste criado pelas migrations Drizzle. Tokens HS256 assinados aqui.
//
// Uso: sh scripts/test-db.sh   (ou TEST_DATABASE_URL=postgres://.../zensalon_test npm test)
// ATENÇÃO: o banco é APAGADO a cada execução; o nome precisa conter "test".
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
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
  RESEND_API_KEY: "re_test", SUPER_ADMIN_SECRET: SA_SECRET, ASAAS_WEBHOOK_TOKEN: "webhook-test",
  WHATSAPP_SEND_ENABLED: "false",
});
// Nenhuma chamada de rede real (GoTrue, Evolution, Asaas, Resend): responde erro na hora.
globalThis.fetch = (async () => { throw new Error("rede desligada no teste"); }) as any;

const PREFIX = "/api/v1";
const sql = postgres(DB_URL, { max: 2, onnotice: () => {} });
let app: any;
let guarded: { method: string; url: string; feature: string | null }[];
let F: typeof import("../src/config/features");

type Tenant = { id: string; token: string; client: string };
const T: Record<string, Tenant> = {};
const CLASSIC = ["beauty_salon", "barbershop", "aesthetics_clinic"] as const;
const ALL = [...CLASSIC, "pilates"] as const;

async function seedTenant(businessType: string): Promise<Tenant> {
  const [t] = await sql`INSERT INTO tenants (name, slug, business_type)
    VALUES (${"Empresa " + businessType}, ${businessType + "-" + Date.now()}, ${businessType}) RETURNING id`;
  const authUserId = randomUUID();
  await sql`INSERT INTO user_profiles (tenant_id, auth_user_id, full_name, role) VALUES (${t.id}, ${authUserId}, 'Dono', 'owner')`;
  const [c] = await sql`INSERT INTO clients (tenant_id, full_name) VALUES (${t.id}, 'Cliente') RETURNING id`;
  const token = await new SignJWT({ role: "authenticated" }).setProtectedHeader({ alg: "HS256" })
    .setSubject(authUserId).setAudience("authenticated").setExpirationTime("1h").sign(new TextEncoder().encode(SECRET));
  return { id: t.id, token, client: c.id };
}

const call = (method: string, url: string, token?: string, body?: unknown) =>
  app.inject({ method, url: PREFIX + url, headers: token ? { authorization: `Bearer ${token}` } : {}, payload: body as any });
const featureDenied = (res: any) => res.statusCode === 403 && res.json()?.code === "FEATURE_NOT_ALLOWED";

before(async () => {
  await sql.unsafe("DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public; DROP SCHEMA IF EXISTS drizzle CASCADE;");
  const { drizzle } = await import("drizzle-orm/postgres-js");
  const { migrate } = await import("drizzle-orm/postgres-js/migrator");
  await migrate(drizzle(sql), { migrationsFolder: new URL("../src/db/migrations", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1") });

  F = await import("../src/config/features");
  const Fastify = (await import("fastify")).default;
  const { installFeatureGuard } = await import("../src/middleware/feature-guard");
  const { API_MODULES } = await import("../src/api-modules");
  app = Fastify();
  guarded = installFeatureGuard(app, PREFIX);
  for (const mod of API_MODULES) await app.register(mod as any, { prefix: PREFIX });
  await app.ready();
  for (const bt of ALL) T[bt] = await seedTenant(bt);
});

after(async () => {
  await app?.close();
  await sql.end();
  const { closeDatabaseConnection } = await import("../src/db/connection");
  await closeDatabaseConnection();
  process.exit(0); // all-modules abre um segundo cliente postgres sem close exposto
});

// ─── registro de features ───────────────────────────────────────────────────
test("features.ts do backend e do frontend são idênticos", () => {
  const read = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8").replace(/\r\n/g, "\n");
  assert.equal(read("../../frontend/src/config/features.ts"), read("../src/config/features.ts"));
});

test("toda feature tem lista explícita, não vazia, só com nichos válidos", () => {
  for (const [feature, types] of Object.entries(F.FEATURES)) {
    assert.ok(types.length > 0, `${feature} sem nichos`);
    for (const t of types) assert.ok((F.BUSINESS_TYPES as readonly string[]).includes(t), `${feature}: nicho inválido ${t}`);
  }
  for (const feature of Object.values(F.ROUTE_FEATURES)) assert.ok(feature in F.FEATURES, `ROUTE_FEATURES aponta para ${feature}`);
});

test("negação por padrão: feature desconhecida, nula ou sem nichos é negada", () => {
  assert.equal(F.isFeatureAllowed("feature_nova_sem_lista", "beauty_salon"), false);
  assert.equal(F.isFeatureAllowed(null, "beauty_salon"), false);
  assert.equal(F.isFeatureAllowed("agenda", null), false);
  (F.FEATURES as any).__teste_vazia = [];
  try { assert.equal(F.isFeatureAllowed("__teste_vazia", "beauty_salon"), false); }
  finally { delete (F.FEATURES as any).__teste_vazia; }
});

test("nicho vazio vira beauty_salon; desconhecido é negado", async () => {
  assert.equal(F.normalizeBusinessType(null), "beauty_salon");
  assert.equal(F.normalizeBusinessType(undefined), "beauty_salon");
  assert.equal(F.normalizeBusinessType(""), "beauty_salon");
  assert.equal(F.normalizeBusinessType("pilates"), "pilates");
  assert.equal(F.normalizeBusinessType("xyz"), null);

  const { requireFeature } = await import("../src/middleware/feature-guard");
  const fake = (businessType: unknown) => {
    const reply: any = { sent: false, code: 0, status(c: number) { this.code = c; return this; }, send() { this.sent = true; return this; } };
    return { req: { tenantContext: { tenantId: "t", businessType } } as any, reply };
  };
  const vazio = fake(null);
  await requireFeature("agenda")(vazio.req, vazio.reply);
  assert.equal(vazio.reply.sent, false, "nicho vazio (= salão) acessa agenda");
  const desconhecido = fake("xyz");
  await requireFeature("account")(desconhecido.req, desconhecido.reply);
  assert.equal(desconhecido.reply.code, 403, "nicho desconhecido é negado até em feature global");
});

test("frontend: toda tela do menu tem feature válida; pilates só vê as telas globais", () => {
  const app = readFileSync(new URL("../../frontend/src/App.tsx", import.meta.url), "utf8");
  const block = app.match(/const PAGE_FEATURES: Record<string, Feature> = \{([\s\S]*?)\};/);
  assert.ok(block, "PAGE_FEATURES não encontrado no App.tsx");
  const pages = Object.fromEntries([...block[1].matchAll(/(\w+):\s*"(\w+)"/g)].map((m) => [m[1], m[2]]));
  for (const [page, feature] of Object.entries(pages)) assert.ok(feature in F.FEATURES, `tela ${page} → feature inexistente ${feature}`);
  const menu = app.match(/const MENU_GROUPS = \[([\s\S]*?)\n\];/);
  assert.ok(menu, "MENU_GROUPS não encontrado");
  for (const m of menu[1].matchAll(/\{ id:"(\w+)"/g)) assert.ok(m[1] in pages, `item de menu ${m[1]} sem feature (ficaria escondido)`);
  const pilates = Object.keys(pages).filter((p) => F.isFeatureAllowed(pages[p], "pilates")).sort();
  const telasPilates = ["class_agenda", "class_instructors", "class_leads", "class_modalities", "class_schedules", "class_students", "class_today", "memberships"];
  assert.deepEqual(pilates, ["ajuda", "auditlogs", "checkout", "financial", ...telasPilates, "pricing", "settings"].sort());
  for (const bt of CLASSIC) {
    const escondidas = Object.keys(pages).filter((p) => !F.isFeatureAllowed(pages[p], bt)).sort();
    assert.deepEqual(escondidas, telasPilates, `${bt}: só as telas do Pilates ficam escondidas`);
  }
});

// ─── cobertura das rotas ────────────────────────────────────────────────────
test("toda rota com login de empresa tem feature mapeada", () => {
  assert.ok(guarded.length > 100, `poucas rotas protegidas: ${guarded.length}`);
  const semFeature = guarded.filter((r) => !r.feature).map((r) => `${r.method} ${r.url}`);
  assert.deepEqual(semFeature, [], "rotas com login sem feature (seriam negadas a todos)");
});

test("rotas públicas, webhooks, senha e Super Admin não passam pelo controle de nicho", async () => {
  const isentas = [
    "POST /api/v1/billing/webhook", "POST /api/v1/auth/forgot-password", "POST /api/v1/auth/reset-password",
    "POST /api/v1/auth/register", "GET /api/v1/public/tenants/:slug", "GET /api/v1/public/tenants/:slug/services",
    "POST /api/v1/public/appointments", "POST /api/v1/webhooks/evolution/:instanceName",
    "GET /api/v1/super-admin/tenants", "PATCH /api/v1/super-admin/tenants/:id", "POST /api/v1/super-admin/login",
  ];
  const protegidas = new Set(guarded.map((r) => `${r.method} ${r.url}`));
  for (const r of isentas) assert.ok(!protegidas.has(r), `${r} não deveria ter guard de nicho`);

  const webhook = await call("POST", "/billing/webhook", undefined, { event: "PAYMENT_RECEIVED", payment: {} });
  assert.equal(webhook.statusCode, 401, "webhook sem token: 401 do próprio webhook, não 403 de nicho");
  const forgot = await call("POST", "/auth/forgot-password", undefined, { email: "x@y.com" });
  assert.ok(!featureDenied(forgot), "esqueci a senha não é bloqueado por nicho");
  const pub = await call("GET", "/public/tenants/nao-existe");
  assert.ok(!featureDenied(pub), "página pública não é bloqueada por nicho");
});

// ─── acesso por nicho ───────────────────────────────────────────────────────
const globals: Record<string, (t: Tenant) => string> = {
  account: () => "/auth/me",
  subscription: () => "/plan-info",
  settings: () => "/team",
  audit_logs: () => "/audit-logs",
  consent_forms: (t) => `/consent-forms/${t.client}`, // termo LGPD: 3 nichos atuais + Pilates (C8)
  financial: () => "/financial", // Financeiro: 3 nichos atuais + Pilates
};
const exclusivas: Record<string, (t: Tenant) => string> = {
  dashboard: () => "/dashboard/kpis",
  performance: () => "/dashboard/performance",
  agenda: () => "/appointments",
  clients: () => "/clients",
  professionals: () => "/professionals",
  services: () => "/services",
  packages: () => "/packages",
  commissions: () => "/commissions",
  goals: () => "/goals",
  crm: () => "/leads",
  loyalty: () => "/referrals",
  marketing: () => "/campaigns",
  whatsapp: () => "/auto-reply/settings",
  automations: () => "/automations/templates",
  notifications: () => "/automations/notifications",
  inventory: () => "/products",
  clinical_records: (t) => `/client-records/${t.client}`,
  protocols: () => "/protocols",
  appointment_photos: (t) => `/appointment-photos/${t.client}`,
  treatment_packages: () => "/treatment-packages",
};
const soPilates: Record<string, (t: Tenant) => string> = {
  class_students: () => "/class-students",
  class_instructors: () => "/class-instructors",
  memberships: () => "/memberships/plans",
  class_settings: () => "/classes/modalities",
  group_classes: () => "/classes/schedules",
  class_leads: () => "/class-leads",
};

test("sondas cobrem todas as features que têm rota na API", () => {
  const comRota = new Set(Object.values(F.ROUTE_FEATURES));
  for (const f of comRota) assert.ok(f in globals || f in exclusivas || f in soPilates || f === "demo", `sem sonda para ${f}`);
});

for (const bt of CLASSIC) {
  test(`${bt}: acessa todas as funcionalidades de hoje (nenhuma regressão) e nada do Pilates`, async () => {
    for (const [feature, url] of Object.entries({ ...globals, ...exclusivas })) {
      const res = await call("GET", url(T[bt]), T[bt].token);
      assert.ok(!featureDenied(res), `${bt} bloqueado em ${feature} (${url(T[bt])})`);
    }
    for (const [feature, url] of Object.entries(soPilates)) {
      const res = await call("GET", url(T[bt]), T[bt].token);
      assert.ok(featureDenied(res), `${bt} deveria receber 403 em ${feature} (${url(T[bt])}), veio ${res.statusCode}`);
    }
    assert.ok(featureDenied(await call("POST", "/class-students", T[bt].token, { fullName: "X" })), `${bt} criou aluno de Pilates`);
  });
}

test("pilates: globais + Pilates liberados; o resto é 403 pela API", async () => {
  const p = T.pilates;
  for (const [feature, url] of Object.entries({ ...globals, ...soPilates })) {
    const res = await call("GET", url(p), p.token);
    assert.ok(!featureDenied(res), `pilates deveria acessar ${feature} (${url(p)}), veio ${res.statusCode}`);
  }
  for (const [feature, url] of Object.entries(exclusivas)) {
    const res = await call("GET", url(p), p.token);
    assert.ok(featureDenied(res), `pilates deveria receber 403 em ${feature} (${url(p)}), veio ${res.statusCode}`);
  }
});

test("pilates: ações diretas também são negadas (e nada é gravado)", async () => {
  const p = T.pilates;
  const antes = (await sql`SELECT count(*)::int AS n FROM clients WHERE tenant_id = ${p.id}`)[0].n;
  assert.ok(featureDenied(await call("POST", "/clients", p.token, { fullName: "Invasor" })));
  assert.ok(featureDenied(await call("POST", "/client-records", p.token, { clientId: p.client, notes: "x" })));
  assert.ok(featureDenied(await call("POST", "/protocols", p.token, { name: "x" })));
  assert.ok(featureDenied(await call("POST", "/demo/seed", p.token)));
  const depois = (await sql`SELECT count(*)::int AS n FROM clients WHERE tenant_id = ${p.id}`)[0].n;
  assert.equal(depois, antes);
});

// ─── nicho no cadastro, na empresa e no Super Admin ─────────────────────────
test("cadastro com nicho inválido é recusado antes de criar qualquer coisa", async () => {
  const res = await call("POST", "/auth/register", undefined,
    { salonName: "X", ownerName: "Y", email: "novo@teste.com", password: "123456", businessType: "xyz" });
  assert.equal(res.statusCode, 400);
  assert.equal(res.json().code, "INVALID_BUSINESS_TYPE");
});

test("a empresa não consegue trocar o próprio nicho", async () => {
  const s = T.beauty_salon;
  await call("PATCH", "/auth/me/profile", s.token, { businessType: "pilates", name: "Empresa beauty_salon" });
  const [row] = await sql`SELECT business_type FROM tenants WHERE id = ${s.id}`;
  assert.equal(row.business_type, "beauty_salon");
});

test("só o Super Admin troca o nicho, e só para valor válido", async () => {
  const jwt = (await import("jsonwebtoken")).default;
  const sa = jwt.sign({ role: "super_admin" }, SA_SECRET, { expiresIn: "10m" });
  const [t] = await sql`INSERT INTO tenants (name, slug) VALUES ('Troca', ${"troca-" + Date.now()}) RETURNING id, business_type`;
  assert.equal(t.business_type, "beauty_salon", "padrão do banco");

  const bad = await call("PATCH", `/super-admin/tenants/${t.id}`, sa, { businessType: "xyz" });
  assert.equal(bad.statusCode, 400);
  const ok = await call("PATCH", `/super-admin/tenants/${t.id}`, sa, { businessType: "pilates" });
  assert.equal(ok.statusCode, 200);
  const [row] = await sql`SELECT business_type FROM tenants WHERE id = ${t.id}`;
  assert.equal(row.business_type, "pilates");

  const lista = await call("GET", "/super-admin/tenants", sa);
  assert.ok(lista.json().data.some((x: any) => x.id === t.id && x.businessType === "pilates"), "lista mostra o nicho");
  const semToken = await call("PATCH", `/super-admin/tenants/${t.id}`, T.beauty_salon.token, { businessType: "barbershop" });
  assert.equal(semToken.statusCode, 401, "token de empresa não serve no Super Admin");
});

test("o banco recusa nicho fora da lista", async () => {
  await assert.rejects(sql`INSERT INTO tenants (name, slug, business_type) VALUES ('X', ${"x-" + Date.now()}, 'xyz')`);
});
