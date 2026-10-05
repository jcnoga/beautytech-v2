// Aplica as migrations Drizzle no banco de POSTGRES_URL (produção ou ensaio). Sem confirmação, só LISTA o que falta.
// Uso (na VPS, num container descartável da imagem da API; ver deploy/README.md):
//   listar:  node --import tsx scripts/migrar.ts
//   aplicar: ZS_CONFIRMAR_MIGRACAO=sim node --import tsx scripts/migrar.ts
// O Drizzle aplica todas as pendentes numa única transação: se uma falhar, nenhuma fica aplicada.
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { readFileSync } from "node:fs";

(async () => {
  const url = process.env.POSTGRES_URL;
  if (!url) { console.error("Defina POSTGRES_URL."); process.exit(1); }
  const banco = new URL(url).pathname.slice(1);
  const pasta = new URL("../src/db/migrations", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
  const journal = JSON.parse(readFileSync(`${pasta}/meta/_journal.json`, "utf8")) as { entries: { tag: string; when: number }[] };

  const sql = postgres(url, { max: 1, onnotice: () => {} });
  const temTabela = (await sql`SELECT to_regclass('drizzle.__drizzle_migrations') AS t`)[0].t !== null;
  const ultima = temTabela ? Number((await sql`SELECT max(created_at) AS m FROM drizzle.__drizzle_migrations`)[0].m ?? 0) : 0;
  const pendentes = journal.entries.filter((e) => e.when > ultima);
  console.log(`Banco: ${banco}`);
  console.log(`Última aplicada: ${journal.entries.find((e) => e.when === ultima)?.tag ?? (ultima ? String(ultima) : "nenhuma")}`);
  console.log(pendentes.length ? `Pendentes (${pendentes.length}): ${pendentes.map((e) => e.tag).join(", ")}` : "Nenhuma pendente.");

  if (pendentes.length && process.env.ZS_CONFIRMAR_MIGRACAO === "sim") {
    await migrate(drizzle(sql), { migrationsFolder: pasta });
    const depois = Number((await sql`SELECT max(created_at) AS m FROM drizzle.__drizzle_migrations`)[0].m);
    console.log(`Aplicadas. Última agora: ${journal.entries.find((e) => e.when === depois)?.tag ?? depois}`);
  } else if (pendentes.length) {
    console.log("Nada foi aplicado (para aplicar: ZS_CONFIRMAR_MIGRACAO=sim).");
  }
  await sql.end();
})().catch((e) => { console.error("ERRO:", e.message); process.exit(1); });
