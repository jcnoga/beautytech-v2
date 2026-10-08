// Anota no lote 'example' os dados do "+ Demo" ANTIGO das contas abaixo e troca os contatos por fictícios
// (ver src/modules/example-data/example-legacy.ts). NÃO apaga nada. Precisa da migration 0012 aplicada.
// Sem confirmação, só MOSTRA (roda e desfaz), conta por conta e nome por nome.
// Com confirmação, primeiro refaz a prévia de TODAS as contas; se alguma der erro, não grava nenhuma.
// Uso (na VPS, num container descartável da imagem da API, com o .env da API; ver deploy/README.md):
//   prévia:  node --import tsx scripts/anotar-exemplo-antigo.ts
//   aplicar: ZS_CONFIRMAR_EXEMPLO=sim node --import tsx scripts/anotar-exemplo-antigo.ts
// Contas e extras aprovados pelo usuário em 08/10/2026 (prévia somente leitura da produção). Contas com o mesmo nome
// são separadas pelo id; o nome é conferido. Agendamentos criados à mão sobre o exemplo NÃO entram, nem o cliente,
// profissional ou serviço do demo que eles usam (decisão de 08/10, opção B); os contatos de todos são trocados.
import { sql } from "drizzle-orm";
import { db, closeDatabaseConnection } from "../src/db/connection";
import { rows } from "../src/modules/group-classes/rules";
import { annotateLegacyDemo, type LegacyAccount } from "../src/modules/example-data/example-legacy";

const CONTAS: LegacyAccount[] = [
  // o nome desta conta no banco termina com espaço (conferido no ensaio de 08/10)
  { id: "d664018e", name: "Salão Beleza Pura ", extraProfessionals: ["Julia Costa", "Marina Santos"], extraServices: ["Coloracao"] },
  { id: "59ded311", name: "Vitta Prime Estética" },
  { id: "4b19ce02", name: "Barbearia Zenon", extraProfessionals: ["Carlos Silva", "Pedro Barbosa"] },
  { id: "1fa81459", name: "The Gentleman Barber" },
  { id: "311772a9", name: "Lumiere Beauty Studio" },
  { id: "6730e9c2", name: "Salão Beleza Pura" },
];

async function rodar(apply: boolean, mostrar: boolean) {
  let erros = 0;
  for (const c of CONTAS) {
    const found = rows(await db.execute(sql`SELECT id::text AS id FROM tenants WHERE id::text LIKE ${c.id + "%"}`)) as any[];
    if (found.length !== 1) { console.log(`\n### ${c.name} (${c.id}): ${found.length} contas com esse início de id.`); erros++; continue; }
    try {
      const r = await annotateLegacyDemo({ ...c, id: found[0].id }, { apply, actor: "script:anotar-exemplo-antigo" });
      if (!mostrar) continue;
      console.log(`\n### ${r.name} (${r.tenantId})`);
      if (r.skipped) { console.log(`PULADA: ${r.skipped}`); continue; }
      console.log(`Registros no lote: ${Object.values(r.counts).reduce((a, n) => a + n, 0)}  ${JSON.stringify(r.counts)}`);
      for (const [t, ns] of Object.entries(r.names)) console.log(`  ${t}: ${ns.join(" | ")}`);
      console.log(`Ficam FORA do lote: ${r.excluded.length}`);
      for (const x of r.excluded) console.log(`  FORA: ${x.name} (${x.table}) — ${x.reason}`);
      console.log(`Contatos trocados por fictícios: ${r.contacts.clients} clientes, ${r.contacts.leads} interessados`);
      console.log(r.applied ? "GRAVADO." : "Nada gravado.");
    } catch (e: any) { console.log(`\n### ${c.name} (${c.id}): ERRO ${e.message}`); erros++; }
  }
  return erros;
}

(async () => {
  const apply = process.env.ZS_CONFIRMAR_EXEMPLO === "sim";
  const [{ banco }] = rows(await db.execute(sql`SELECT current_database() AS banco`)) as any[];
  console.log(`Banco: ${banco}${apply ? "  (APLICANDO)" : "  (prévia: nada é gravado)"}`);
  let erros = await rodar(false, !apply);
  if (apply && erros) console.log(`\nA prévia deu ${erros} erro(s): NADA foi gravado.`);
  else if (apply) erros = await rodar(true, true);
  else console.log("\nNada foi aplicado (para aplicar: ZS_CONFIRMAR_EXEMPLO=sim).");
  await closeDatabaseConnection();
  process.exit(erros ? 1 : 0);
})().catch(async (e) => { console.error("ERRO:", e.message); process.exit(1); });
