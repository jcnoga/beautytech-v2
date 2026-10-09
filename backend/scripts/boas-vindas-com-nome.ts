// Recepção Automática: troca as mensagens de contato novo que estão IDÊNTICAS ao padrão antigo (sem {nome}) pelo
// padrão novo (com {nome} = nome do WhatsApp). Texto editado pelo dono nunca é tocado. Não apaga nada.
// Sem confirmação, só MOSTRA (conta por conta). Com confirmação, grava tudo numa transação.
// Uso (na VPS, num container descartável da imagem da API, com o ambiente da API; ver deploy/README.md):
//   prévia:  node --import tsx scripts/boas-vindas-com-nome.ts
//   aplicar: ZS_CONFIRMAR_BOAS_VINDAS=sim node --import tsx scripts/boas-vindas-com-nome.ts
import { sql } from "drizzle-orm";
import { db, closeDatabaseConnection } from "../src/db/connection";
import { rows } from "../src/modules/group-classes/rules";
import { NEW_CONTACT_DEFAULTS, NEW_CONTACT_OLD_DEFAULTS } from "../src/modules/auto-reply/auto-reply.text";

const apply = process.env.ZS_CONFIRMAR_BOAS_VINDAS === "sim";
const olds = sql.join(NEW_CONTACT_OLD_DEFAULTS.map((m) => sql`${m}`), sql`, `);

const lista = rows(await db.execute(sql`
  SELECT t.name AS conta, t.id::text AS "tenantId", m.id::text AS id, m.message
  FROM auto_reply_messages m JOIN tenants t ON t.id = m.tenant_id
  WHERE m.audience = 'new_contact' AND m.message IN (${olds}) ORDER BY t.name, m.sort_order`)) as any[];

const porConta = new Map<string, number>();
for (const r of lista) porConta.set(`${r.conta} (${r.tenantId})`, (porConta.get(`${r.conta} (${r.tenantId})`) ?? 0) + 1);
console.log(`Mensagens no padrão antigo: ${lista.length}`);
for (const [c, n] of porConta) console.log(`  ${c}: ${n}`);

if (!apply) {
  console.log("\nPRÉVIA: nada gravado. Para aplicar: ZS_CONFIRMAR_BOAS_VINDAS=sim");
} else {
  const n = await db.transaction(async (tx) => {
    let total = 0;
    for (const r of lista) {
      const novo = NEW_CONTACT_DEFAULTS[NEW_CONTACT_OLD_DEFAULTS.indexOf(r.message)];
      const upd = rows(await tx.execute(sql`UPDATE auto_reply_messages SET message = ${novo}
        WHERE id = ${r.id} AND message = ${r.message} RETURNING id`));
      total += upd.length;
    }
    return total;
  });
  console.log(`\nGRAVADO: ${n} mensagens trocadas pelo padrão com {nome}.`);
}
await closeDatabaseConnection();
process.exit(0);
