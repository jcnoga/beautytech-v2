// Trava WHATSAPP_SEND_ENABLED: com "false", o serviço do WhatsApp recusa enviar mensagem e
// conectar/desconectar/apagar instância ANTES de consultar o banco ou chamar a Evolution.
// Não precisa de banco: qualquer acesso à rede falharia o teste.
import { test, before } from "node:test";
import assert from "node:assert/strict";

let wa: typeof import("../src/modules/whatsapp/whatsapp.service");
const calls: string[] = [];

before(async () => {
  Object.assign(process.env, {
    NODE_ENV: "test", POSTGRES_URL: "postgres://ninguem:x@127.0.0.1:9/nada", POSTGRES_SSL: "false",
    GOTRUE_URL: "http://127.0.0.1:9", GOTRUE_JWT_SECRET: "test-secret-at-least-32-characters-long!!",
    GOTRUE_SERVICE_KEY: "x", RESEND_API_KEY: "re_test", WHATSAPP_SEND_ENABLED: "false",
  });
  globalThis.fetch = (async (url: any) => { calls.push(String(url)); throw new Error("rede não deveria ser usada"); }) as any;
  wa = await import("../src/modules/whatsapp/whatsapp.service");
});

const TENANT = "00000000-0000-0000-0000-000000000001";
for (const [name, run] of [
  ["sendTextMessage", () => wa.sendTextMessage("5534999999999", "oi", TENANT)],
  ["sendTemplateMessage", () => wa.sendTemplateMessage("5534999999999", "x", {}, TENANT)],
  ["connectInstance", () => wa.connectInstance(TENANT)],
  ["disconnectInstance", () => wa.disconnectInstance(TENANT)],
  ["deleteInstance", () => wa.deleteInstance(TENANT)],
] as const) {
  test(`${name} é bloqueado com WHATSAPP_SEND_ENABLED=false`, async () => {
    await assert.rejects(run as () => Promise<unknown>, (e: any) => e instanceof wa.WhatsappDisabledError);
    assert.deepEqual(calls, [], "nenhuma chamada de rede");
  });
}
