// Copia os usuários do Auth do Supabase para o GoTrue da VPS: auth.users e auth.identities,
// com os mesmos IDs e os mesmos hashes de senha (bcrypt), então ninguém precisa trocar de senha
// e user_profiles.auth_user_id continua valendo.
// Copia só as colunas que existem nos dois lados (as versões do GoTrue podem diferir) e que não são geradas.
// O Supabase não é alterado (só leitura). O GoTrue da VPS precisa ter subido antes (ele cria o schema auth).
//
// Variáveis: SUPABASE_DB_URL (origem), GOTRUE_DATABASE_URL (destino), SUBSTITUIR=1 para apagar
// os usuários do destino antes de copiar.
// Uso (no container da API): node --import tsx scripts/migracao/copiar-usuarios.ts
import postgres from "postgres";
import { pipeline } from "node:stream/promises";

const srcUrl = process.env.SUPABASE_DB_URL;
const dstUrl = process.env.GOTRUE_DATABASE_URL;
if (!srcUrl || !dstUrl) throw new Error("Defina SUPABASE_DB_URL e GOTRUE_DATABASE_URL");

const src = postgres(srcUrl, { max: 1, prepare: false, onnotice: () => {}, ssl: srcUrl.includes("sslmode=disable") ? false : { rejectUnauthorized: false } });
const dst = postgres(dstUrl, { max: 1, onnotice: () => {} });
const TABLES = ["users", "identities"]; // nessa ordem: identities.user_id -> users.id

async function columns(db: postgres.Sql, table: string): Promise<string[]> {
  const rows = await db`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'auth' AND table_name = ${table} AND is_generated = 'NEVER'
    ORDER BY ordinal_position`;
  return rows.map((r) => r.column_name as string);
}
const count = async (db: postgres.Sql, table: string) =>
  Number((await db.unsafe(`SELECT count(*) AS n FROM auth.${table}`))[0].n);

try {
  // Supabase somente leitura: qualquer escrita nesta sessão falha no próprio Postgres.
  await src`SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY`;
  const existing = await count(dst, "users");
  if (existing > 0) {
    if (process.env.SUBSTITUIR !== "1") {
      console.error(`O GoTrue da VPS já tem ${existing} usuários. Para apagar e copiar de novo: SUBSTITUIR=1`);
      process.exit(1);
    }
    console.log(`Apagando ${existing} usuários do GoTrue da VPS (sessões e identidades vão junto)...`);
    await dst`DELETE FROM auth.identities`;
    await dst`DELETE FROM auth.users`;
  }

  for (const table of TABLES) {
    const [s, d] = [await columns(src, table), await columns(dst, table)];
    const common = s.filter((c) => d.includes(c));
    const onlySrc = s.filter((c) => !d.includes(c));
    if (onlySrc.length) console.log(`auth.${table}: colunas só no Supabase (não copiadas): ${onlySrc.join(", ")}`);
    const list = common.map((c) => `"${c}"`).join(", ");
    // COPY em texto: preserva exatamente cada valor (jsonb, arrays, timestamps), sem conversão pelo Node.
    const reader = await src.unsafe(`COPY (SELECT ${list} FROM auth.${table}) TO STDOUT`).readable();
    const writer = await dst.unsafe(`COPY auth.${table} (${list}) FROM STDIN`).writable();
    await pipeline(reader, writer);
    const [a, b] = [await count(src, table), await count(dst, table)];
    console.log(`auth.${table}: Supabase ${a}, VPS ${b} ${a === b ? "OK" : "DIFERENTE"}`);
    if (a !== b) process.exitCode = 1;
  }
} finally {
  await src.end();
  await dst.end();
}
