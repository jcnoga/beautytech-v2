// Aplica as migrations Drizzle no banco LOCAL (dev-local). Recusa qualquer banco fora de localhost.
// Uso: POSTGRES_URL=postgres://postgres:local@127.0.0.1:55433/zensalon_local node --import tsx scripts/local-migrate.ts
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

const url = process.env.POSTGRES_URL ?? "";
const host = new URL(url || "postgres://x/none").hostname;
if (!["127.0.0.1", "localhost"].includes(host)) throw new Error(`Só migra banco local (host recebido: ${host || "vazio"})`);
const sql = postgres(url, { max: 1, onnotice: () => {} });
await migrate(drizzle(sql), { migrationsFolder: new URL("../src/db/migrations", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1") });
console.log("migrations aplicadas no banco local");
await sql.end();
