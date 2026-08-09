#!/usr/bin/env node
/**
 * migrate-auto-reply-delay.cjs
 *
 * Adiciona as colunas reply_delay_min_seconds/reply_delay_max_seconds na tabela
 * auto_reply_settings, usando o pacote "postgres" que ja esta no projeto
 * (nao depende de psql estar instalado no Windows).
 *
 * Rode a partir da raiz do backend: /c/projetos/beautytech-v2/backend
 *   node migrate-auto-reply-delay.cjs
 *
 * Le POSTGRES_URL do .env automaticamente (via dotenv, se instalado) ou
 * da variavel de ambiente ja exportada.
 */

try {
  require("dotenv").config();
} catch {
  // dotenv pode nao estar instalado como dependencia direta; segue sem erro
  // se POSTGRES_URL ja estiver disponivel via variavel de ambiente/shell.
}

const postgres = require("postgres");

const connectionString = process.env.POSTGRES_URL;

if (!connectionString) {
  console.error("[ERRO] POSTGRES_URL nao encontrada. Confirme que existe no .env ou exporte manualmente:");
  console.error('  export POSTGRES_URL="postgresql://usuario:senha@host:porta/banco"');
  process.exit(1);
}

async function main() {
  const sql = postgres(connectionString, { prepare: false, ssl: { rejectUnauthorized: false } });

  try {
    console.log("[INFO] Conectando ao banco...");

    const before = await sql`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'auto_reply_settings'
        AND column_name IN ('reply_delay_min_seconds', 'reply_delay_max_seconds')
    `;

    if (before.length === 2) {
      console.log("[SKIP] Colunas ja existem na tabela auto_reply_settings. Nada a fazer.");
      await sql.end();
      return;
    }

    console.log("[INFO] Aplicando ALTER TABLE...");
    await sql`
      ALTER TABLE auto_reply_settings
        ADD COLUMN IF NOT EXISTS reply_delay_min_seconds INTEGER NOT NULL DEFAULT 5,
        ADD COLUMN IF NOT EXISTS reply_delay_max_seconds INTEGER NOT NULL DEFAULT 8
    `;

    const after = await sql`
      SELECT column_name, data_type, column_default FROM information_schema.columns
      WHERE table_name = 'auto_reply_settings'
        AND column_name IN ('reply_delay_min_seconds', 'reply_delay_max_seconds')
      ORDER BY column_name
    `;

    console.log("[OK] Migracao aplicada com sucesso. Colunas confirmadas:");
    console.table(after);

    await sql.end();
  } catch (err) {
    console.error("[ERRO] Falha na migracao:", err.message);
    process.exit(1);
  }
}

main();
