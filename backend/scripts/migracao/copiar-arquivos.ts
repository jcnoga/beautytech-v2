// Copia os arquivos do bucket tenant-assets do Supabase Storage para o volume de uploads da VPS
// e reescreve, no banco zensalon, as URLs gravadas (logo, capa, fotos...).
//   https://<ref>.supabase.co/storage/v1/object/public/tenant-assets/<nome>
//   -> PUBLIC_UPLOADS_URL/tenant-assets/<nome>
// A troca de URL varre todas as colunas de texto/json/array do schema public, então pega qualquer
// lugar onde a URL tenha sido gravada. No fim, lista o que ainda aponta para o Supabase.
// O Supabase não é alterado (só leitura). Idempotente: arquivo já baixado é pulado.
//
// Variáveis: SUPABASE_DB_URL (lista os objetos em storage.objects), SUPABASE_URL (https://<ref>.supabase.co),
// POSTGRES_URL, UPLOADS_DIR, PUBLIC_UPLOADS_URL (já definidas no container da API).
// Uso (no container da API): node --import tsx scripts/migracao/copiar-arquivos.ts
import postgres from "postgres";
import { mkdir, writeFile, stat } from "node:fs/promises";
import path from "node:path";

const BUCKET = "tenant-assets";
const { SUPABASE_DB_URL, SUPABASE_URL, POSTGRES_URL, UPLOADS_DIR, PUBLIC_UPLOADS_URL } = process.env;
if (!SUPABASE_DB_URL || !SUPABASE_URL || !POSTGRES_URL || !UPLOADS_DIR || !PUBLIC_UPLOADS_URL) {
  throw new Error("Defina SUPABASE_DB_URL, SUPABASE_URL, POSTGRES_URL, UPLOADS_DIR e PUBLIC_UPLOADS_URL");
}
const oldPrefix = `${SUPABASE_URL.replace(/\/+$/, "")}/storage/v1/object/public/${BUCKET}/`;
const newPrefix = `${PUBLIC_UPLOADS_URL.replace(/\/+$/, "")}/${BUCKET}/`;
const baseDir = path.resolve(UPLOADS_DIR, BUCKET);

const src = postgres(SUPABASE_DB_URL, { max: 1, prepare: false, onnotice: () => {}, ssl: SUPABASE_DB_URL.includes("sslmode=disable") ? false : { rejectUnauthorized: false } });
const db = postgres(POSTGRES_URL, { max: 1, onnotice: () => {}, ssl: process.env.POSTGRES_SSL === "true" ? { rejectUnauthorized: false } : false });

try {
  // ── 1. arquivos ──────────────────────────────────────────────────────────
  const objects = await src`SELECT name FROM storage.objects WHERE bucket_id = ${BUCKET} ORDER BY name`;
  let copied = 0, skipped = 0, failed = 0;
  for (const { name } of objects as unknown as { name: string }[]) {
    const dest = path.resolve(baseDir, name);
    if (!dest.startsWith(baseDir + path.sep)) { console.error(`nome inválido, ignorado: ${name}`); failed++; continue; }
    if (await stat(dest).then(() => true, () => false)) { skipped++; continue; }
    const url = oldPrefix + name.split("/").map(encodeURIComponent).join("/");
    const res = await fetch(url);
    if (!res.ok) { console.error(`falhou (${res.status}): ${name}`); failed++; continue; }
    await mkdir(path.dirname(dest), { recursive: true });
    await writeFile(dest, Buffer.from(await res.arrayBuffer()));
    copied++;
  }
  console.log(`Arquivos: ${objects.length} no bucket, ${copied} copiados, ${skipped} já existiam, ${failed} com falha.`);
  if (failed) process.exitCode = 1;

  // ── 2. URLs no banco ─────────────────────────────────────────────────────
  const cols = await db`
    SELECT c.table_name, c.column_name, c.data_type
    FROM information_schema.columns c
    JOIN information_schema.tables t ON t.table_schema = c.table_schema AND t.table_name = c.table_name AND t.table_type = 'BASE TABLE'
    WHERE c.table_schema = 'public' AND c.is_generated = 'NEVER'
      AND c.data_type IN ('text', 'character varying', 'json', 'jsonb', 'ARRAY')
    ORDER BY 1, 2`;
  let total = 0;
  for (const { table_name: t, column_name: c, data_type: type } of cols as unknown as { table_name: string; column_name: string; data_type: string }[]) {
    const cast = type === "ARRAY" ? `::${(await db`SELECT format_type(atttypid, atttypmod) AS t FROM pg_attribute WHERE attrelid = ${"public." + t}::regclass AND attname = ${c}`)[0].t}` : type === "json" || type === "jsonb" ? `::${type}` : "";
    const res = await db.unsafe(
      `UPDATE public."${t}" SET "${c}" = replace("${c}"::text, $1, $2)${cast} WHERE "${c}"::text LIKE '%' || $1 || '%'`,
      [oldPrefix, newPrefix],
    );
    if (res.count) { console.log(`URLs trocadas: ${t}.${c} = ${res.count}`); total += res.count; }
  }
  console.log(`URLs: ${total} valores atualizados.`);

  // ── 3. o que ainda aponta para o Supabase ────────────────────────────────
  for (const { table_name: t, column_name: c } of cols as unknown as { table_name: string; column_name: string }[]) {
    const [{ n }] = await db.unsafe(`SELECT count(*) AS n FROM public."${t}" WHERE "${c}"::text LIKE '%supabase.co%'`);
    if (Number(n)) console.log(`ainda com supabase.co: ${t}.${c} = ${n} (conferir à mão)`);
  }
} finally {
  await src.end();
  await db.end();
}
