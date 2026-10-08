// Dados de exemplo do cadastro (salão, barbearia, clínica): a conta nova nasce com profissionais, serviços, clientes,
// agendamentos etc. de exemplo, para o dono ver o sistema funcionando.
// - Tudo numa transação; cada registro é anotado num lote 'example' (test_batches.kind, 0012) NO MOMENTO em que é
//   criado, como o "gerar" dos dados de teste. Nada é achado por nome depois.
// - Contatos fictícios (DDD 00, e-mail .invalid): nunca recebem WhatsApp nem e-mail (test-data.guard), e os registros
//   anotados também são pulados pelos jobs e pela fila mesmo que alguém troque o telefone.
// - Não anota (e "Remover dados de exemplo" nunca apaga): a conta, os logins, configurações (modelos de mensagem,
//   regras do studio) e as contas/categorias do Financeiro. Ver PROTECTED_TABLES.
// - Remover: só as linhas dos lotes 'example' (anotadas + arrastadas pelas ligações do banco), numa transação; recusa
//   (409, nada apagado) se algo arrastado estiver ligado a dado real (ex.: agendamento de cliente real com
//   profissional de exemplo). Mesmo motor do apagar dos dados de teste.
import { sql } from "drizzle-orm";
import { db } from "@db/connection";
import { rows } from "../group-classes/rules";
import * as ops from "../super-admin/admin-ops.repository";
import * as repo from "../super-admin/test-data.repository";
import { AdminOpsError, deletionOrder } from "../super-admin/admin-ops.service";

/** Contatos fictícios dos dados de exemplo (formato que a trava de envios reconhece: DDD 00 e .invalid). */
export const examplePhone = (n: number) => `(00) 90001-${String(n).padStart(4, "0")}`;
export const exampleEmail = (n: number) => `exemplo.${String(n).padStart(2, "0")}@zensalon-exemplo.invalid`;

/** Tabelas que "Remover dados de exemplo" nunca apaga, mesmo se aparecerem no conjunto por alguma ligação. */
export const PROTECTED_TABLES = new Set([
  "tenants", "user_profiles", "class_settings", "message_templates", "financial_accounts", "financial_categories",
  "test_batches", "test_batch_items", "admin_operations",
]);

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Insere uma linha (SQL com RETURNING id) e anota no lote. */
async function ins(tx: Tx, batchId: string, tenantId: string, table: string, q: any, counts: Record<string, number>) {
  const created = rows(await tx.execute(q)) as { id: string }[];
  for (const r of created) {
    await repo.addItem(tx as any, batchId, tenantId, table, String(r.id));
    counts[table] = (counts[table] ?? 0) + 1;
  }
  return created;
}

const DEFAULT_WH = {"0":{"enabled":false,"start":null,"end":null},"1":{"enabled":true,"start":"08:00","end":"18:00","breakStart":"12:00","breakEnd":"13:30"},"2":{"enabled":true,"start":"08:00","end":"18:00","breakStart":"12:00","breakEnd":"13:30"},"3":{"enabled":true,"start":"08:00","end":"18:00","breakStart":"12:00","breakEnd":"13:30"},"4":{"enabled":true,"start":"08:00","end":"18:00","breakStart":"12:00","breakEnd":"13:30"},"5":{"enabled":true,"start":"08:00","end":"18:00","breakStart":"12:00","breakEnd":"13:30"},"6":{"enabled":true,"start":"08:00","end":"12:00","breakStart":null,"breakEnd":null}};

/**
 * Cria os dados de exemplo da conta (uma vez só: recusa se já houver um lote de exemplo pronto).
 * Devolve o lote e as contagens por tabela.
 */
export async function seedExampleData(tenantId: string, actor: string) {
  return db.transaction(async (tx) => {
    await repo.lockTenantBatches(tx as any, tenantId);
    if ((await repo.readyExampleBatches(tx as any, tenantId)).length) {
      throw new AdminOpsError(409, "EXAMPLE_EXISTS", "Esta conta já tem dados de exemplo.");
    }
    const [t] = rows(await tx.execute(sql`SELECT business_type AS "businessType" FROM tenants WHERE id = ${tenantId}`));
    const btype = t?.businessType ?? "beauty_salon";
    const isClinic = btype === "aesthetics_clinic";
    const isBarber = btype === "barbershop";
    const batch = await repo.createBatch(tx as any, tenantId, actor, "example");
    const counts: Record<string, number> = {};
    const add = (table: string, q: any) => ins(tx, batch.id, tenantId, table, q, counts);

    const now = new Date();
    const day = 24 * 60 * 60 * 1000;
    const tomorrow = new Date(now.getTime() + day), yesterday = new Date(now.getTime() - day);
    const lastWeek = new Date(now.getTime() - 7 * day), lastMonth = new Date(now.getTime() - 30 * day);
    const h = (d: Date, hours: number) => new Date(d.getTime() + hours * 3600000);

    // ---- PROFISSIONAIS + jornada ----
    const profData = isClinic
      ? [["Dra. Marina Demo Santos", "Esteticista", "50", "8000"], ["Julia Demo Costa", "Auxiliar de Estetica", "45", "6000"]]
      : isBarber
        ? [["Carlos Demo Silva", "Barbeiro", "50", "5000"], ["Pedro Demo Barbosa", "Barbeiro Senior", "45", "4000"]]
        : [["Marina Demo Santos", "Cabeleireira", "50", "5000"], ["Julia Demo Costa", "Manicure", "45", "4000"]];
    const profs: { id: string }[] = [];
    // (a especialidade da lista é só descrição: a tabela não tem essa coluna; o cadastro antigo também a descartava)
    for (const [name, , pct, goal] of profData) {
      const [p] = await add("professionals", sql`INSERT INTO professionals (tenant_id, full_name, commission_pct, monthly_goal, is_active, working_hours)
        VALUES (${tenantId}, ${name}, ${pct}, ${goal}, true, ${JSON.stringify(DEFAULT_WH)}::jsonb) RETURNING id`);
      profs.push(p);
      for (const [dow, working, start, end, bs, be] of [
        [0, false, "00:00", "00:00", null, null], [1, true, "08:00", "18:00", "12:00", "13:30"], [2, true, "08:00", "18:00", "12:00", "13:30"],
        [3, true, "08:00", "18:00", "12:00", "13:30"], [4, true, "08:00", "18:00", "12:00", "13:30"], [5, true, "08:00", "18:00", "12:00", "13:30"],
        [6, true, "08:00", "12:00", null, null],
      ] as const) {
        await add("professional_schedules", sql`INSERT INTO professional_schedules (professional_id, tenant_id, day_of_week, is_working, start_time, end_time, slot_minutes, break_start, break_end)
          VALUES (${p.id}, ${tenantId}, ${dow}, ${working}, ${start}, ${end}, 30, ${bs}, ${be}) RETURNING id`);
      }
    }

    // ---- CATEGORIAS E SERVIÇOS ----
    const catData = isClinic ? [["Demo Tratamentos Faciais", "#6ec9ba"], ["Demo Tratamentos Corporais", "#9b59b6"]]
      : isBarber ? [["Demo Cortes", "#3498db"], ["Demo Barba", "#e67e22"]]
      : [["Demo Cabelo", "#e91e8c"], ["Demo Unhas", "#9b59b6"]];
    const cats: { id: string }[] = [];
    for (let i = 0; i < catData.length; i++) {
      const [c] = await add("service_categories", sql`INSERT INTO service_categories (tenant_id, name, color, sort_order, is_active)
        VALUES (${tenantId}, ${catData[i][0]}, ${catData[i][1]}, ${i + 1}, true) RETURNING id`);
      cats.push(c);
    }
    const svcData: [string, number, string, boolean][] = isClinic ? [
      ["Demo Limpeza de Pele", 60, "150", true], ["Demo Microagulhamento", 90, "280", true], ["Demo Peeling", 45, "120", true],
      ["Demo Radiofrequencia", 60, "200", true], ["Demo Criolipolise", 120, "450", false],
    ] : isBarber ? [
      ["Demo Corte Masculino", 30, "35", true], ["Demo Barba Completa", 30, "25", true], ["Demo Degrade", 40, "45", true],
      ["Demo Corte + Barba", 60, "55", true], ["Demo Sobrancelha", 15, "15", true],
    ] : [
      ["Demo Corte Feminino", 45, "80", true], ["Demo Coloracao", 120, "180", true], ["Demo Escova", 60, "60", true],
      ["Demo Manicure", 60, "40", true], ["Demo Pedicure", 60, "50", false],
    ];
    const svcs: { id: string; name: string; price: string }[] = [];
    for (let i = 0; i < svcData.length; i++) {
      const [name, dur, price, online] = svcData[i];
      const [s] = await add("services", sql`INSERT INTO services (tenant_id, name, duration_minutes, price, is_active, is_online_bookable, category_id)
        VALUES (${tenantId}, ${name}, ${dur}, ${price}, true, ${online}, ${cats[i < 3 ? 0 : 1].id}) RETURNING id`);
      svcs.push({ id: s.id, name, price });
    }

    // ---- CLIENTES (contatos fictícios) ----
    const clientData: [string, string, string, number, string, boolean][] = isBarber ? [
      ["Andre Demo Silva", "active", "male", 18, "630", false], ["Bruno Demo Santos", "vip", "male", 45, "2250", true],
      ["Carlos Demo Rocha", "new", "male", 2, "70", false], ["Daniel Demo Lima", "at_risk", "male", 6, "210", false],
      ["Eduardo Demo Ferreira", "loyal", "male", 60, "3300", true],
    ] : [
      ["Ana Demo Silva", "active", "female", 12, "1500", false], ["Beatriz Demo Santos", "vip", "female", 38, "4800", true],
      ["Carla Demo Rocha", "new", "female", 2, "200", false], ["Daniela Demo Lima", "at_risk", "female", 5, "450", false],
      ["Elena Demo Ferreira", "loyal", "female", 72, "9800", true],
    ];
    const cls: { id: string }[] = [];
    for (let i = 0; i < clientData.length; i++) {
      const [name, segment, gender, visits, spent, vip] = clientData[i];
      const [c] = await add("clients", sql`INSERT INTO clients (tenant_id, full_name, whatsapp, email, gender, segment, tags, total_visits, total_spent, is_vip, accepts_whatsapp, accepts_marketing)
        VALUES (${tenantId}, ${name}, ${examplePhone(i + 1)}, ${exampleEmail(i + 1)}, ${gender}, ${segment}, ARRAY['demo']::text[], ${visits}, ${spent}, ${vip}, false, false) RETURNING id`);
      cls.push(c);
    }

    // ---- AGENDAMENTOS + serviços do agendamento ----
    const appts: [number, number, string, Date, number, number, string][] = [
      [0, 0, "confirmed", h(tomorrow, 9), 60, 0, "manual"], [1, 1, "pending", h(tomorrow, 11), 120, 1, "online"],
      [2, 0, "completed", yesterday, 45, 2, "online"], [3, 1, "completed", lastWeek, 60, 3, "manual"],
      [4, 0, "confirmed", h(tomorrow, 14), 120, 4, "manual"], [0, 0, "completed", lastMonth, 60, 0, "manual"],
    ];
    for (let i = 0; i < appts.length; i++) {
      const [ci, pi, status, at, dur, si, source] = appts[i];
      const svc = svcs[si];
      const [a] = await add("appointments", sql`INSERT INTO appointments (tenant_id, client_id, professional_id, status, scheduled_at, ends_at, duration_minutes, total_price, subtotal, source, internal_notes, created_by)
        VALUES (${tenantId}, ${cls[ci].id}, ${profs[pi].id}, ${status}, ${at.toISOString()}, ${new Date(at.getTime() + dur * 60000).toISOString()}, ${dur}, ${svc.price}, ${svc.price}, ${source}, 'demo', ${tenantId}) RETURNING id`);
      const s2 = svcs[i % svcs.length];
      await add("appointment_services", sql`INSERT INTO appointment_services (appointment_id, service_id, price, tenant_id)
        VALUES (${a.id}, ${s2.id}, ${s2.price}, ${tenantId}) RETURNING id`);
    }
    for (const p of profs) {
      for (const s of svcs.slice(0, 3)) {
        await add("professional_services", sql`INSERT INTO professional_services (professional_id, service_id, tenant_id)
          VALUES (${p.id}, ${s.id}, ${tenantId}) ON CONFLICT DO NOTHING RETURNING id`);
      }
    }

    // ---- FINANCEIRO (só lançamentos; a conta padrão é da conta e não entra no lote) ----
    const [acc] = rows(await tx.execute(sql`SELECT id FROM financial_accounts WHERE tenant_id = ${tenantId} AND is_default = true LIMIT 1`));
    if (acc) {
      const fin: [string, string, string, Date][] = [
        ["revenue", svcs[0].price, "Demo - " + svcs[0].name, yesterday], ["revenue", svcs[1].price, "Demo - " + svcs[1].name, lastWeek],
        ["revenue", svcs[2].price, "Demo - " + svcs[2].name, lastWeek], ["revenue", svcs[3].price, "Demo - " + svcs[3].name, lastMonth],
        ["expense", "120", "Demo - Produtos e insumos", lastWeek], ["expense", "80", "Demo - Material descartavel", yesterday],
      ];
      for (const [type, amount, desc, d] of fin) {
        await add("financial_transactions", sql`INSERT INTO financial_transactions (tenant_id, account_id, type, amount, description, due_date, created_by)
          VALUES (${tenantId}, ${acc.id}, ${type}, ${amount}, ${desc}, ${d.toISOString().slice(0, 10)}, ${tenantId}) RETURNING id`);
      }
    }

    // ---- CRM: interessados (contatos fictícios) ----
    const leadData: [string, string, string][] = [["Demo Lead Maria", "instagram", "new"], ["Demo Lead Paula", "indicacao", "contacted"], ["Demo Lead Sandra", "google", "new"]];
    for (let i = 0; i < leadData.length; i++) {
      await add("leads", sql`INSERT INTO leads (tenant_id, name, whatsapp, source, status)
        VALUES (${tenantId}, ${leadData[i][0]}, ${examplePhone(51 + i)}, ${leadData[i][1]}, ${leadData[i][2]}) RETURNING id`);
    }

    // ---- PACOTES ----
    await add("packages", sql`INSERT INTO packages (tenant_id, client_id, name, total_sessions, used_sessions, remaining_sessions, total_value, status)
      VALUES (${tenantId}, ${cls[0].id}, ${"Demo Pacote 5x " + svcs[0].name}, 5, 2, 3, ${String(Number(svcs[0].price) * 5 * 0.9)}, 'active') RETURNING id`);
    await add("packages", sql`INSERT INTO packages (tenant_id, client_id, name, total_sessions, used_sessions, remaining_sessions, total_value, status)
      VALUES (${tenantId}, ${cls[1].id}, ${"Demo Pacote 10x " + svcs[1].name}, 10, 7, 3, ${String(Number(svcs[1].price) * 10 * 0.85)}, 'active') RETURNING id`);

    // ---- CLÍNICA: fichas, protocolos, sessões, pacotes de tratamento ----
    if (isClinic) {
      for (const [ci, allergies, meds, skin, complaint, hist, cond, contra, obs, evo, notes] of [
        [0, ["Niquel", "Latex"], "Anticoncepcional oral", "mista", "Manchas e poros dilatados", "Limpeza de pele ha 6 meses", "Nenhuma", "Nenhuma", "Pele sensivel na regiao do nariz", "Evolucao positiva apos 2 sessoes", "Cliente assidua"],
        [1, [], "Nenhum", "oleosa", "Flacidez facial", "Radiofrequencia com bons resultados", "Hipotireoidismo controlado", "Gestacao e marcapasso", "Oleosidade moderada", "Excelente resposta ao protocolo", "VIP"],
        [2, ["Dipirona"], "Nenhum", "seca", "Primeiras rugas", "Sem procedimentos anteriores", "Nenhuma", "Nenhuma", "Pele ressecada", "Primeira sessao realizada", "Cliente nova"],
      ] as const) {
        await add("client_records", sql`INSERT INTO client_records (tenant_id, client_id, type, allergies, medications, skin_type, main_complaint, aesthetic_history, pregnancy, pre_existing_conditions, contraindications, clinical_observations, treatment_evolution, notes)
          VALUES (${tenantId}, ${cls[ci].id}, 'aesthetic', ${sql`ARRAY[${sql.join((allergies as readonly string[]).map((a) => sql`${a}`), sql`, `)}]::text[]`}, ${meds}, ${skin}, ${complaint}, ${hist}, false, ${cond}, ${contra}, ${obs}, ${evo}, ${notes}) RETURNING id`);
      }
      const protos: { id: string }[] = [];
      for (const [name, desc, total, interval] of [
        ["Demo Limpeza de Pele", "Protocolo completo de limpeza profunda", 4, 15],
        ["Demo Microagulhamento", "Protocolo de rejuvenescimento e cicatrizacao", 6, 21],
        ["Demo Radiofrequencia", "Protocolo de firmeza e reducao de flacidez", 8, 14],
      ] as const) {
        const [p] = await add("protocols", sql`INSERT INTO protocols (tenant_id, name, description, total_sessions, interval_days, nicho, is_active)
          VALUES (${tenantId}, ${name}, ${desc}, ${total}, ${interval}, 'clinic', true) RETURNING id`);
        protos.push(p);
      }
      for (const [ci, pi, n, at, by, evo, obs] of [
        [0, 0, 1, lastWeek, 0, "Pele respondeu bem. Reducao visivel de poros.", "Mascara calmante pos-procedimento"],
        [0, 0, 2, yesterday, 0, "Melhora significativa nas manchas.", "Recomendado protetor solar FPS 50"],
        [1, 1, 1, lastWeek, 1, "Primeira sessao. Leve eritema esperado.", "Cuidados pos-procedimento orientados"],
        [1, 1, 2, yesterday, 1, "Melhora na textura da pele.", "Evolucao excelente"],
      ] as const) {
        await add("protocol_sessions", sql`INSERT INTO protocol_sessions (tenant_id, client_id, protocol_id, session_number, performed_at, performed_by, evolution, observations, status)
          VALUES (${tenantId}, ${cls[ci].id}, ${protos[pi].id}, ${n}, ${(at as Date).toISOString()}, ${profs[by].id}, ${evo}, ${obs}, 'completed') RETURNING id`);
      }
      const pkgs: { id: string }[] = [];
      for (const [name, desc, pi, total, validity, price] of [
        ["Demo Pacote Limpeza 4 sessoes", "Pacote completo de limpeza de pele", 0, 4, 180, 500],
        ["Demo Pacote Microagulhamento 6 sessoes", "Pacote rejuvenescimento facial", 1, 6, 365, 1500],
        ["Demo Pacote Anual Radiofrequencia", "Manutencao anual de firmeza", 2, 12, 365, 2200],
      ] as const) {
        const [p] = await add("treatment_packages", sql`INSERT INTO treatment_packages (tenant_id, name, description, protocol_id, total_sessions, validity_days, price, is_active)
          VALUES (${tenantId}, ${name}, ${desc}, ${protos[pi].id}, ${total}, ${validity}, ${price}, true) RETURNING id`);
        pkgs.push(p);
      }
      const exp1 = new Date(now.getTime() + 180 * day).toISOString(), exp2 = new Date(now.getTime() + 365 * day).toISOString();
      for (const [ci, pi, contracted, used, exp] of [[0, 0, 4, 2, exp1], [1, 1, 6, 2, exp2], [4, 2, 12, 5, exp2]] as const) {
        await add("package_sessions", sql`INSERT INTO package_sessions (tenant_id, client_id, package_id, sessions_contracted, sessions_used, started_at, expires_at, status)
          VALUES (${tenantId}, ${cls[ci].id}, ${pkgs[pi].id}, ${contracted}, ${used}, now(), ${exp}, 'active') RETURNING id`);
      }
    }

    // ---- MODELOS DE MENSAGEM: configuração da conta (fica; não entra no lote) ----
    const [tpl] = rows(await tx.execute(sql`SELECT 1 AS x FROM message_templates WHERE tenant_id = ${tenantId} LIMIT 1`));
    if (!tpl) {
      await tx.execute(sql`INSERT INTO message_templates (tenant_id, trigger, name, message, channel, is_active) VALUES
        (${tenantId}, 'appointment_reminder_24h', 'Lembrete 24h', 'Ola, {nome}! Lembrando do seu agendamento amanha, dia {data} as {hora}. Te esperamos!', 'whatsapp', true),
        (${tenantId}, 'appointment_reminder_2h', 'Lembrete 2h', 'Ola, {nome}! Seu agendamento e daqui a pouco, as {hora}. Te esperamos!', 'whatsapp', true),
        (${tenantId}, 'birthday', 'Aniversario', 'Ola, {nome}! Feliz aniversario! Temos um presente especial para voce. Entre em contato!', 'whatsapp', true),
        (${tenantId}, 'client_reactivation', 'Reativacao', 'Ola, {nome}! Sentimos sua falta! Que tal agendar uma visita?', 'whatsapp', true)`);
    }

    await repo.finishBatch(tx as any, batch.id, "ready", counts);
    return { batchId: batch.id, businessType: btype, counts };
  });
}

/** Conjunto a remover (todos os lotes de exemplo prontos da conta), sem tabelas protegidas, e as ligações com dado real. */
async function removalPlan(exec: any, tenantId: string, edges: Awaited<ReturnType<typeof ops.fkEdges>>) {
  const batchIds = await repo.readyExampleBatches(exec, tenantId);
  const m: repo.BatchRows = new Map();
  const annotated = new Set<string>();
  for (const b of batchIds) {
    for (const [t, ids] of await repo.collectBatchRows(exec, tenantId, b, edges, PROTECTED_TABLES)) {
      if (!m.has(t)) m.set(t, new Set());
      for (const id of ids) m.get(t)!.add(id);
    }
    for (const i of await repo.batchItems(exec, b)) annotated.add(`${i.table}:${i.id}`);
  }
  for (const t of PROTECTED_TABLES) m.delete(t);
  for (const k of await repo.sharedInUse(exec, tenantId, m, edges)) m.get(k.table)?.delete(k.id);
  const linked = await repo.linkedOutside(exec, tenantId, m, annotated, edges);
  const toDelete = Object.fromEntries([...m].filter(([, ids]) => ids.size > 0).map(([t, ids]) => [t, ids.size]));
  // Só os registros anotados no lote (sem os arrastados). Com ligação a dado real, a tela mostra estes: o "toDelete"
  // incluiria o próprio dado real (ex.: o agendamento do cliente real), e ele não sai.
  const examples = Object.fromEntries([...m]
    .map(([t, ids]) => [t, [...ids].filter((id) => annotated.has(`${t}:${id}`)).length] as const)
    .filter(([, n]) => n > 0));
  return { batchIds, m, toDelete, examples, linked };
}

/** Prévia do "Remover dados de exemplo": o que sai (por tabela), o que é exemplo e o que está ligado a dados reais. Não apaga nada. */
export async function previewExampleRemoval(tenantId: string) {
  const { batchIds, toDelete, examples, linked } = await removalPlan(db, tenantId, await ops.fkEdges(db));
  return { exists: batchIds.length > 0, toDelete, examples, linkedOutside: linked };
}

/** Remove os dados de exemplo: tudo ou nada, sob a trava da conta. 409 se não houver exemplo ou se houver ligação com dado real. */
export async function removeExampleData(tenantId: string) {
  return db.transaction(async (tx) => {
    await repo.lockTenantBatches(tx as any, tenantId);
    const edges = await ops.fkEdges(tx as any);
    const plan = await removalPlan(tx, tenantId, edges);
    if (!plan.batchIds.length) throw new AdminOpsError(409, "NO_EXAMPLE", "Esta conta não tem dados de exemplo.");
    if (Object.keys(plan.linked).length) {
      throw new AdminOpsError(409, "LINKED_TO_REAL_DATA",
        `Há dados de exemplo ligados a dados reais (${Object.entries(plan.linked).map(([t, n]) => `${t}: ${n}`).join("; ")}). Nada foi apagado.`,
        { linked: plan.linked });
    }
    const deleted = await repo.deleteRows(tx as any, tenantId, plan.m, deletionOrder([...plan.m.keys()], edges));
    for (const b of plan.batchIds) await repo.setBatchStatus(tx as any, b, "deleted");
    return { deleted };
  });
}
