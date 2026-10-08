// Dados do "+ Demo" ANTIGO (antes do lote 'example', 0012): anota no lote 'example' o que o "+ Demo" criou numa conta
// e troca os contatos por fictícios. NÃO apaga nada; quem apaga é o dono, em "Remover dados de exemplo".
// - Uma conta por vez, pelo id e conferindo o nome (há contas com o mesmo nome).
// - Critério do "+ Demo" antigo: clientes com a tag 'demo'; profissionais, serviços e categorias com "Demo" no nome;
//   agendamentos com internal_notes = 'demo' (os do "+ Demo"; agendamentos criados à mão não entram); lançamentos
//   "Demo - ..."; interessados "Demo Lead ..."; pacotes "Demo Pacote ..."; e o que depende só deles (jornada,
//   itens dos agendamentos, serviços dos profissionais, fichas/sessões da clínica).
// - extras: nomes exatos (aprovados na prévia) de profissionais/serviços renomeados sem "Demo"; cada um precisa
//   achar exatamente 1 registro, senão nada é feito.
// - FICA FORA da anotação (decisão de 08/10, opção B): cliente, profissional ou serviço do demo usado por algum
//   agendamento SEM a nota 'demo' (criado à mão, inclusive de cliente real). Assim o "Remover" nunca leva esses
//   agendamentos. A troca de contatos por fictícios vale para TODOS os clientes/interessados do demo, dentro ou fora.
// - Sem `apply`, roda tudo e desfaz (ROLLBACK): é a prévia, nome por nome.
import { sql } from "drizzle-orm";
import { db } from "@db/connection";
import { rows } from "../group-classes/rules";
import * as repo from "../super-admin/test-data.repository";
import { examplePhone, exampleEmail } from "./example-data.service";

export type LegacyAccount = {
  id: string;                       // id da conta (ou prefixo, resolvido pelo script)
  name: string;                     // nome esperado da conta (trava contra id errado)
  extraProfessionals?: string[];    // profissionais renomeados sem "Demo" que são do exemplo
  extraServices?: string[];         // serviços renomeados sem "Demo" que são do exemplo
};

export type LegacyReport = {
  tenantId: string; name: string; skipped?: string;
  counts: Record<string, number>;
  names: Record<string, string[]>;  // tabela -> nomes (clientes, profissionais, serviços...) para conferir
  excluded: { table: string; name: string; reason: string }[]; // do demo, mas fora da anotação, e por quê
  contacts: { clients: number; leads: number };
  applied: boolean;
};

class Rollback extends Error {}

const ids = (r: any[]) => r.map((x) => String(x.id));
const inList = (list: string[]) => list.length ? sql.join(list.map((i) => sql`${i}`), sql`, `) : sql`NULL`;

export async function annotateLegacyDemo(acc: LegacyAccount, opts: { apply: boolean; actor: string }): Promise<LegacyReport> {
  let report!: LegacyReport;
  try {
    await db.transaction(async (tx) => {
      const q = async (s: any) => rows(await tx.execute(s)) as any[];
      await repo.lockTenantBatches(tx as any, acc.id);
      const [t] = await q(sql`SELECT id::text AS id, name FROM tenants WHERE id = ${acc.id}`);
      if (!t) throw new Error(`Conta ${acc.id} não existe.`);
      if (t.name !== acc.name) throw new Error(`Conta ${acc.id} se chama "${t.name}", esperado "${acc.name}". Nada feito.`);
      report = { tenantId: t.id, name: t.name, counts: {}, names: {}, excluded: [], contacts: { clients: 0, leads: 0 }, applied: false };
      if ((await repo.readyExampleBatches(tx as any, t.id)).length) { report.skipped = "já tem lote de exemplo"; return; }

      const T = t.id;
      const one = async (table: "professionals" | "services", col: "full_name" | "name", name: string) => {
        const r = await q(sql`SELECT id::text AS id FROM ${sql.identifier(table)} WHERE tenant_id = ${T} AND ${sql.identifier(col)} = ${name}`);
        if (r.length !== 1) throw new Error(`"${name}" (${table}) achou ${r.length} registros na conta "${t.name}"; esperado 1. Nada feito.`);
        return r[0].id as string;
      };

      // Todos os clientes do demo (para a troca de contatos) e, deles, os que entram no lote.
      const allClients = await q(sql`SELECT id::text AS id, full_name AS n FROM clients WHERE tenant_id = ${T}
        AND tags @> ARRAY['demo']::text[] ORDER BY created_at, full_name`);
      const allCl = ids(allClients);
      const allProfs = await q(sql`SELECT id::text AS id, full_name AS n FROM professionals WHERE tenant_id = ${T} AND full_name LIKE '%Demo%' ORDER BY full_name`);
      for (const n of acc.extraProfessionals ?? []) allProfs.push({ id: await one("professionals", "full_name", n), n });
      const cats = await q(sql`SELECT id::text AS id, name AS n FROM service_categories WHERE tenant_id = ${T} AND name LIKE 'Demo %' ORDER BY name`);
      const allSvcs = await q(sql`SELECT id::text AS id, name AS n FROM services WHERE tenant_id = ${T} AND name LIKE 'Demo %' ORDER BY name`);
      for (const n of acc.extraServices ?? []) allSvcs.push({ id: await one("services", "name", n), n });

      // Usados por agendamento SEM a nota 'demo' (feito à mão, inclusive de cliente real; apagado ou não): ficam fora.
      const hand = sql`SELECT id FROM appointments WHERE tenant_id = ${T} AND coalesce(internal_notes, '') <> 'demo'`;
      const uses = async (s: any) => new Map((await q(s)).map((r: any) => [String(r.id), Number(r.n)]));
      const usedC = await uses(sql`SELECT client_id::text AS id, count(*)::int AS n FROM appointments
        WHERE id IN (${hand}) AND client_id IS NOT NULL GROUP BY 1`);
      const usedP = await uses(sql`SELECT id, count(DISTINCT ap)::int AS n FROM (
          SELECT professional_id::text AS id, id AS ap FROM appointments WHERE id IN (${hand}) AND professional_id IS NOT NULL
          UNION ALL SELECT professional_id::text, appointment_id FROM appointment_services WHERE appointment_id IN (${hand}) AND professional_id IS NOT NULL
        ) x GROUP BY 1`);
      const usedS = await uses(sql`SELECT service_id::text AS id, count(DISTINCT appointment_id)::int AS n FROM appointment_services
        WHERE appointment_id IN (${hand}) AND service_id IS NOT NULL GROUP BY 1`);
      const keep = (list: any[], used: Map<string, number>, table: string) => list.filter((r) => {
        const n = used.get(r.id);
        if (n) report.excluded.push({ table, name: String(r.n), reason: `${n} agendamento(s) feito(s) à mão` });
        return !n;
      });
      const clients = keep(allClients, usedC, "clients");
      const profs = keep(allProfs, usedP, "professionals");
      const svcs = keep(allSvcs, usedS, "services");
      const pr = ids(profs), sv = ids(svcs), allPr = ids(allProfs), allSv = ids(allSvcs);
      // Categoria Demo usada por serviço que não entra no lote (que ficou fora ou real) também fica fora.
      const usedK = await uses(sql`SELECT category_id::text AS id, count(*)::int AS n FROM services WHERE tenant_id = ${T}
        AND category_id IS NOT NULL AND id::text NOT IN (${inList(sv)}) GROUP BY 1`);
      const catsIn = cats.filter((r) => {
        const n = usedK.get(r.id);
        if (n) report.excluded.push({ table: "service_categories", name: String(r.n), reason: `usada por ${n} serviço(s) fora do lote` });
        return !n;
      });
      const cl = allCl; // fichas, pacotes e sessões do demo entram mesmo se o cliente ficar fora (só o cliente fica)
      const appts = await q(sql`SELECT id::text AS id FROM appointments WHERE tenant_id = ${T} AND internal_notes = 'demo'`);
      const ap = ids(appts);

      const sets: [string, any[]][] = [
        ["clients", clients], ["professionals", profs], ["service_categories", catsIn], ["services", svcs], ["appointments", appts],
        ["appointment_services", await q(sql`SELECT id::text AS id FROM appointment_services WHERE tenant_id = ${T} AND appointment_id::text IN (${inList(ap)})`)],
        ["professional_schedules", await q(sql`SELECT id::text AS id FROM professional_schedules WHERE tenant_id = ${T} AND professional_id::text IN (${inList(pr)})`)],
        // vínculo entre profissional e serviço do demo, se ao menos um dos dois entra (o vínculo sai com ele;
        // quem ficou fora continua)
        ["professional_services", await q(sql`SELECT id::text AS id FROM professional_services WHERE tenant_id = ${T}
          AND professional_id::text IN (${inList(allPr)}) AND service_id::text IN (${inList(allSv)})
          AND (professional_id::text IN (${inList(pr)}) OR service_id::text IN (${inList(sv)}))`)],
        ["financial_transactions", await q(sql`SELECT id::text AS id, description AS n FROM financial_transactions WHERE tenant_id = ${T} AND description LIKE 'Demo - %' ORDER BY description`)],
        ["leads", await q(sql`SELECT id::text AS id, name AS n FROM leads WHERE tenant_id = ${T} AND name LIKE 'Demo Lead %' ORDER BY name`)],
        ["packages", await q(sql`SELECT id::text AS id, name AS n FROM packages WHERE tenant_id = ${T} AND name LIKE 'Demo Pacote %' AND client_id::text IN (${inList(cl)}) ORDER BY name`)],
        ["client_records", await q(sql`SELECT id::text AS id FROM client_records WHERE tenant_id = ${T} AND client_id::text IN (${inList(cl)})`)],
        ["protocols", await q(sql`SELECT id::text AS id, name AS n FROM protocols WHERE tenant_id = ${T} AND name LIKE 'Demo %' ORDER BY name`)],
        ["protocol_sessions", await q(sql`SELECT id::text AS id FROM protocol_sessions WHERE tenant_id = ${T} AND client_id::text IN (${inList(cl)})`)],
        ["treatment_packages", await q(sql`SELECT id::text AS id, name AS n FROM treatment_packages WHERE tenant_id = ${T} AND name LIKE 'Demo Pacote %' ORDER BY name`)],
        ["package_sessions", await q(sql`SELECT id::text AS id FROM package_sessions WHERE tenant_id = ${T} AND client_id::text IN (${inList(cl)})`)],
      ];

      const batch = await repo.createBatch(tx as any, T, opts.actor, "example");
      for (const [table, list] of sets) {
        if (!list.length) continue;
        for (const r of list) await repo.addItem(tx as any, batch.id, T, table, r.id);
        report.counts[table] = list.length;
        if (list[0].n !== undefined) report.names[table] = list.map((r) => String(r.n));
      }

      // Contatos fictícios (a trava de envios reconhece DDD 00 e .invalid); sem aceite de WhatsApp/marketing.
      for (let i = 0; i < cl.length; i++) {
        await tx.execute(sql`UPDATE clients SET whatsapp = ${examplePhone(i + 1)}, email = ${exampleEmail(i + 1)},
          phone = CASE WHEN phone IS NULL THEN NULL ELSE ${examplePhone(i + 1)} END,
          accepts_whatsapp = false, accepts_marketing = false WHERE id = ${cl[i]} AND tenant_id = ${T}`);
      }
      const leads = sets.find(([tb]) => tb === "leads")![1];
      for (let i = 0; i < leads.length; i++) {
        await tx.execute(sql`UPDATE leads SET whatsapp = ${examplePhone(51 + i)},
          phone = CASE WHEN phone IS NULL THEN NULL ELSE ${examplePhone(51 + i)} END,
          email = CASE WHEN email IS NULL THEN NULL ELSE ${exampleEmail(51 + i)} END WHERE id = ${leads[i].id} AND tenant_id = ${T}`);
      }
      report.contacts = { clients: cl.length, leads: leads.length };
      await repo.finishBatch(tx as any, batch.id, "ready", report.counts);
      if (!opts.apply) throw new Rollback();
      report.applied = true;
    });
  } catch (e) {
    if (!(e instanceof Rollback)) throw e;
  }
  return report;
}
