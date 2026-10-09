// Fila do WhatsApp (lembretes, reativação), 09/10/2026: o telefone é limpo antes do envio.
// Antes, a limpeza usava /\\D/ (barra invertida + D) e "(34) 99999-0001" seguia com parênteses e traço.
// Inválido = notificação failed com o motivo, sem chamar a API. Evolution simulada (fetch registra os envios).
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
  RESEND_API_KEY: "re_test", SUPER_ADMIN_SECRET: "sa", WHATSAPP_SEND_ENABLED: "true",
});
const EVO = "http://evolution.teste";
const enviados: string[] = [];
globalThis.fetch = (async (url: any, init?: any) => {
  const u = String(url);
  if (u.startsWith(EVO + "/message/sendText/")) {
    enviados.push(JSON.parse(init?.body ?? "{}").number);
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  }
  throw new Error(`rede desligada no teste: ${u}`);
}) as any;

const sql = postgres(DB_URL, { max: 4, onnotice: () => {} });

before(async () => {
  await sql.unsafe("DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public; DROP SCHEMA IF EXISTS drizzle CASCADE;");
  const { drizzle } = await import("drizzle-orm/postgres-js");
  const { migrate } = await import("drizzle-orm/postgres-js/migrator");
  await migrate(drizzle(sql), { migrationsFolder: new URL("../src/db/migrations", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1") });
});

after(async () => {
  await sql.end();
  const { closeDatabaseConnection } = await import("../src/db/connection");
  await closeDatabaseConnection();
  process.exit(0);
});

test("normalizeWhatsappNumber: formatos aceitos e recusados", async () => {
  const { normalizeWhatsappNumber: n } = await import("../src/modules/whatsapp/whatsapp.service");
  assert.equal(n("(34) 99999-0001"), "5534999990001");
  assert.equal(n("+55 34 99999-0001"), "5534999990001");
  assert.equal(n("5534999990001"), "5534999990001");
  assert.equal(n("(34) 9999-0001"), "553499990001", "sem o 9 (formato antigo/fixo): envia como está, não inventa o 9");
  assert.equal(n("+55 (34) 9999-0001"), "553499990001");
  for (const bad of ["123", "abc", "", null, "(34) 89999-0001", "(00) 90000-0001", "(04) 99999-0001", "34 99999-00011", "+1 202 555 0100"])
    assert.equal(n(bad), null, String(bad));
});

test("fila: telefones formatados saem limpos; inválido fica failed com o motivo, sem envio", async () => {
  const [t] = await sql`INSERT INTO tenants (name, slug, business_type, plan_tier, trial_ends_at, whatsapp_mode, whatsapp_api_url, whatsapp_api_key, whatsapp_instance)
    VALUES ('Salão Fila', ${"fila-" + Date.now()}, 'beauty_salon', 'trial', now() + interval '20 days', 'local', ${EVO}, 'k', 'inst-teste') RETURNING id`;
  const casos: [string, string | null][] = [
    ["(34) 99999-0001", "5534999990001"],
    ["+55 34 99999-0002", "5534999990002"],
    ["(34) 9999-0003", "553499990003"],      // sem o 9
    ["99999", null],                          // inválido
    ["(34) 89999-0005", null],                // 11 dígitos sem o 9
  ];
  const ids: string[] = [];
  for (const [phone] of casos) {
    const [c] = await sql`INSERT INTO clients (tenant_id, full_name, whatsapp) VALUES (${t.id}, 'Cliente', ${phone}) RETURNING id`;
    const [nt] = await sql`INSERT INTO notifications (tenant_id, client_id, channel, message, status) VALUES (${t.id}, ${c.id}, 'whatsapp', 'Olá', 'pending') RETURNING id`;
    ids.push(nt.id);
  }
  const { processWhatsAppQueue } = await import("../src/jobs/whatsapp-worker");
  await processWhatsAppQueue();

  assert.deepEqual(enviados, casos.filter(([, n]) => n).map(([, n]) => n), "só os válidos, já limpos");
  for (let i = 0; i < casos.length; i++) {
    const [row] = await sql`SELECT status, error_msg, sent_at IS NOT NULL AS tem_envio FROM notifications WHERE id = ${ids[i]}`;
    if (casos[i][1]) assert.deepEqual({ ...row }, { status: "sent", error_msg: null, tem_envio: true }, casos[i][0]);
    else assert.deepEqual({ ...row }, { status: "failed", error_msg: "Telefone inválido: " + casos[i][0], tem_envio: false }, casos[i][0]);
  }
});
