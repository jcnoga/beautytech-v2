#!/usr/bin/env node
/**
 * diagnose-auto-reply.cjs
 *
 * Verifica, direto no banco, por que a Recepcao Automatica pode nao ter
 * respondido a uma mensagem recebida: confirma se a instancia bate com o
 * tenant, se as settings estao habilitadas, se ha mensagens ativas, e se
 * ja existe um cooldown registrado para o numero que testou.
 *
 * Uso:
 *   node diagnose-auto-reply.cjs <numero-que-testou-sem-9-e-sem-simbolos>
 *
 * Exemplo:
 *   node diagnose-auto-reply.cjs 5534999998888
 *
 * Se nao passar o numero, o script so mostra tenant + settings + mensagens.
 */

try {
  require("dotenv").config();
} catch {}

const postgres = require("postgres");

const connectionString = process.env.POSTGRES_URL;
if (!connectionString) {
  console.error("[ERRO] POSTGRES_URL nao encontrada no .env nem na variavel de ambiente.");
  process.exit(1);
}

const testedPhone = process.argv[2] || null;

async function main() {
  const sql = postgres(connectionString, { prepare: false, ssl: { rejectUnauthorized: false } });

  try {
    console.log("=== 1) Tenant e instancia WhatsApp ===");
    const tenants = await sql`
      SELECT id, name, whatsapp_instance, whatsapp_mode, whatsapp_status
      FROM tenants
      WHERE id = '${sql.unsafe("d664018e-59f0-4d59-a3c7-503646041d5b")}'::uuid
    `.catch(async () => {
      // fallback caso a interpolacao acima falhe por algum motivo de driver
      return sql`SELECT id, name, whatsapp_instance, whatsapp_mode, whatsapp_status FROM tenants WHERE id = 'd664018e-59f0-4d59-a3c7-503646041d5b'`;
    });
    console.table(tenants);

    if (tenants.length === 0) {
      console.log("[PROBLEMA] Tenant nao encontrado com esse ID. Confirme o UUID correto.");
      await sql.end();
      return;
    }

    const tenantId = tenants[0].id;
    const instanceName = tenants[0].whatsapp_instance;

    console.log(`\n[INFO] whatsapp_instance no banco: "${instanceName}"`);
    console.log(`[INFO] Compare com o nome usado no webhook (deve ser identico, incluindo maiusculas/minusculas)`);

    console.log("\n=== 2) Configuracoes da Recepcao Automatica (auto_reply_settings) ===");
    const settings = await sql`SELECT * FROM auto_reply_settings WHERE tenant_id = ${tenantId}`;
    console.table(settings);

    if (settings.length === 0) {
      console.log("[PROBLEMA] Nao existe linha em auto_reply_settings para esse tenant -> is_enabled fica undefined/false, resposta e pulada (reason: disabled).");
    } else if (!settings[0].is_enabled) {
      console.log("[PROBLEMA] is_enabled = false. O toggle no frontend pode nao ter salvo corretamente.");
    } else {
      console.log("[OK] Recepcao Automatica habilitada nas settings.");
    }

    console.log("\n=== 3) Mensagens cadastradas (auto_reply_messages) ===");
    const messages = await sql`
      SELECT id, audience, is_active, left(message, 40) as preview
      FROM auto_reply_messages
      WHERE tenant_id = ${tenantId}
      ORDER BY audience, sort_order
    `;
    console.table(messages);

    const activeNew = messages.filter(m => m.audience === "new_contact" && m.is_active);
    const activeExisting = messages.filter(m => m.audience === "existing_client" && m.is_active);
    console.log(`\n[INFO] Mensagens ativas para "novo contato": ${activeNew.length}`);
    console.log(`[INFO] Mensagens ativas para "cliente existente": ${activeExisting.length}`);
    if (activeNew.length === 0) {
      console.log("[PROBLEMA] Nenhuma mensagem ativa para novo_contato -> reason: no_messages_configured (se quem testou nao e cliente cadastrado).");
    }

    if (testedPhone) {
      console.log(`\n=== 4) Estado da conversa para o numero testado (${testedPhone}) ===`);
      const conv = await sql`
        SELECT * FROM auto_reply_conversations
        WHERE tenant_id = ${tenantId} AND contact_phone = ${testedPhone}
      `;
      console.table(conv);

      if (conv.length > 0 && conv[0].last_replied_at) {
        const cooldownHours = settings[0]?.cooldown_hours ?? 24;
        const elapsedMs = Date.now() - new Date(conv[0].last_replied_at).getTime();
        const elapsedH = (elapsedMs / 3600000).toFixed(2);
        console.log(`[INFO] Ultima resposta enviada ha ${elapsedH}h. Cooldown configurado: ${cooldownHours}h.`);
        if (elapsedMs < cooldownHours * 3600000) {
          console.log("[PROBLEMA] Ainda dentro do cooldown -> reason: cooldown. E por isso que nao respondeu de novo.");
        }
      } else {
        console.log("[INFO] Nenhum registro de conversa anterior para esse numero (ou nunca respondeu antes).");
      }

      console.log("\n=== 5) O numero testado e um cliente cadastrado? ===");
      const client = await sql`
        SELECT id, full_name, whatsapp
        FROM clients
        WHERE tenant_id = ${tenantId}
          AND regexp_replace(whatsapp, '\\D', '', 'g') = ${testedPhone}
      `;
      console.table(client);
      console.log(client.length > 0 ? "[INFO] E um cliente cadastrado -> audience = existing_client" : "[INFO] Nao e cliente cadastrado -> audience = new_contact");
    } else {
      console.log("\n[DICA] Rode de novo passando o numero que testou (sem +55, sem espacos, sem simbolos) para checar cooldown e cadastro:");
      console.log("  node diagnose-auto-reply.cjs 5534999998888");
    }

    await sql.end();
  } catch (err) {
    console.error("[ERRO]", err.message);
    process.exit(1);
  }
}

main();
