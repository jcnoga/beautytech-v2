// BEAUTYTECH v2 — Database Connection
// ⚠️ SEMPRE env.DATABASE_URL — NUNCA hardcode
// ⚠️ SEMPRE Session Pooler Supabase (IPv4)
// ⚠️ prepare: false — obrigatório com PgBouncer
 
import { drizzle } from "drizzle-orm/postgres-js";
import postgres     from "postgres";
import { env }      from "@config/env";
import * as schema  from "./schema/index";
 
const queryClient = postgres(env.DATABASE_URL, {
  max:             10,
  idle_timeout:    30,
  connect_timeout: 10,
  prepare:         false,
  ssl:             { rejectUnauthorized: false },
  onnotice:        () => {},
});
 
export const db = drizzle(queryClient, { schema, logger: env.NODE_ENV === "development" });
export type Database = typeof db;
 
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await queryClient`SELECT 1`;
    return true;
  } catch (err) {
    console.error("DB Health Check falhou:", err);
    return false;
  }
}
 
export async function closeDatabaseConnection(): Promise<void> {
  await queryClient.end();
}
