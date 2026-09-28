// Registra as migrations Drizzle já existentes como aplicadas num banco restaurado do dump
// de produção (as tabelas já existem; rodar 0000–0002 criaria FKs duplicadas).
// Mesmo formato do migrator do drizzle-orm: drizzle.__drizzle_migrations(hash, created_at).
// Idempotente. Uso (no container da API): node --import tsx scripts/migracao/registrar-migrations.ts
import postgres from "postgres";
import { readMigrationFiles } from "drizzle-orm/migrator";

const url = process.env.POSTGRES_URL;
if (!url) throw new Error("POSTGRES_URL não definida");
const sql = postgres(url, { max: 1, onnotice: () => {}, ssl: process.env.POSTGRES_SSL === "true" ? { rejectUnauthorized: false } : false });

const migrations = readMigrationFiles({ migrationsFolder: "./src/db/migrations" });
await sql`CREATE SCHEMA IF NOT EXISTS drizzle`;
await sql`CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (id SERIAL PRIMARY KEY, hash text NOT NULL, created_at bigint)`;
for (const m of migrations) {
  const [row] = await sql`SELECT 1 FROM drizzle.__drizzle_migrations WHERE hash = ${m.hash}`;
  if (row) { console.log(`já registrada: ${m.folderMillis}`); continue; }
  await sql`INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES (${m.hash}, ${m.folderMillis})`;
  console.log(`registrada: ${m.folderMillis}`);
}
await sql.end();
