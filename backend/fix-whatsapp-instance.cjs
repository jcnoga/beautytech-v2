#!/usr/bin/env node
/**
 * fix-whatsapp-instance.cjs
 *
 * Corrige o campo tenants.whatsapp_instance quando ele fica null mesmo com
 * a conexao ativa (state "open"). Isso quebra a Recepcao Automatica porque
 * o webhook busca o tenant justamente por esse campo.
 *
 * Uso:
 *   node fix-whatsapp-instance.cjs <tenant_id> <instance_name>
 *
 * Exemplo:
 *   node fix-whatsapp-instance.cjs d664018e-59f0-4d59-a3c7-503646041d5b salon-d664018e-1783523748765
 */

try {
  require("dotenv").config();
} catch {}

const postgres = require("postgres");

const connectionString = process.env.POSTGRES_URL;
if (!connectionString) {
  console.error("[ERRO] POSTGRES_URL nao encontrada.");
  process.exit(1);
}

const tenantId = process.argv[2];
const instanceName = process.argv[3];

if (!tenantId || !instanceName) {
  console.error("Uso: node fix-whatsapp-instance.cjs <tenant_id> <instance_name>");
  process.exit(1);
}

async function main() {
  const sql = postgres(connectionString, { prepare: false, ssl: { rejectUnauthorized: false } });

  try {
    const before = await sql`SELECT id, name, whatsapp_instance, whatsapp_status FROM tenants WHERE id = ${tenantId}`;
    if (before.length === 0) {
      console.error("[ERRO] Tenant nao encontrado com esse ID.");
      await sql.end();
      return;
    }
    console.log("[ANTES]", before[0]);

    const updated = await sql`
      UPDATE tenants
      SET whatsapp_instance = ${instanceName}, updated_at = NOW()
      WHERE id = ${tenantId}
      RETURNING id, name, whatsapp_instance, whatsapp_status
    `;
    console.log("[DEPOIS]", updated[0]);
    console.log("\n[OK] whatsapp_instance corrigido. O webhook agora deve encontrar o tenant corretamente.");

    await sql.end();
  } catch (err) {
    console.error("[ERRO]", err.message);
    process.exit(1);
  }
}

main();
