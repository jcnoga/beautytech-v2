// Dados de teste (Super Admin), service: "Gerar dados de teste" numa conta marcada como conta de teste.
// - Só em conta de teste (is_test_account) e nunca com assinatura ativa (Asaas consultado na hora).
// - Limites do plano: os dados de teste contam como reais; se não couber, recusa ANTES de criar qualquer coisa.
// - Cria pelas ROTAS do próprio app (fastify.inject, token de "acessar como" do dono): mesmas validações e regras.
//   Cada registro criado entra no lote (test_batch_items) na hora; nomes com "[TESTE]"; contatos fictícios
//   (telefone DDD 00, e-mail .invalid), que nunca recebem nada (test-data.guard).
// - Tudo ou nada: se algo falhar no meio, o que já foi criado é apagado pelos ids do lote e o lote fica "failed".
// - Auditoria em admin_operations (quem, quando, conta, contagens).
// - Apagar: só as linhas do lote (anotadas + arrastadas pelas ligações do banco), numa transação; recusa (409, nada
//   apagado) se algo arrastado estiver ligado a dado fora do lote. Gerar e apagar usam a trava da conta (clique duplo).
import jwt from "jsonwebtoken";
import type { FastifyInstance } from "fastify";
import { sql } from "drizzle-orm";
import { db } from "@db/connection";
import { rows } from "../group-classes/rules";
import { getTenantLimits } from "../billing/plan-limits.service";
import * as ops from "./admin-ops.repository";
import * as repo from "./test-data.repository";
import { AdminOpsError, deletionOrder } from "./admin-ops.service";
import { asaasSubscriptionActive } from "./tenant-deletion.service";
import { TEST_DATA_SIZES as SIZES, TEST_PREFIX } from "./test-data.config";
import { fakeEmail, fakePhone } from "./test-data.guard";

const PILATES = "pilates";
const dayPlus = (n: number) => { const d = new Date(); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
/** `count` deslocamentos de dia (a partir de `from`, andando no sentido do sinal) que caem de segunda a sexta. */
const weekdays = (from: number, count: number) => {
  const out: number[] = [];
  for (let k = from; out.length < count; k += Math.sign(from)) {
    const d = new Date(); d.setUTCDate(d.getUTCDate() + k);
    if (d.getUTCDay() >= 1 && d.getUTCDay() <= 5) out.push(k);
  }
  return out;
};
const at = (dayOffset: number, hour: number) => { const d = new Date(); d.setUTCDate(d.getUTCDate() + dayOffset); d.setUTCHours(hour + 3, 0, 0, 0); return d; }; // hora de Brasília

/** O que o lote vai ocupar nos limites do plano. */
function needs(businessType: string) {
  if (businessType === PILATES) return { clients: SIZES.pilates.students, professionals: SIZES.pilates.instructors, appointments: 0 };
  return { clients: SIZES.salon.clients, professionals: SIZES.salon.professionals, appointments: SIZES.salon.appointments };
}

/** Travas antes de gerar: conta de teste, sem assinatura ativa, sem lote em andamento e limites do plano. */
export async function generationBlocks(tenantId: string) {
  const t = await ops.findTenant(db, tenantId);
  if (!t) throw new AdminOpsError(404, "NOT_FOUND", "Conta não encontrada");
  const blocks: { code: string; message: string }[] = [];
  if (!t.isTestAccount) blocks.push({ code: "NOT_TEST_ACCOUNT", message: "A conta não está marcada como conta de teste." });
  if (t.asaasSubscriptionId) {
    try {
      if (await asaasSubscriptionActive(t.asaasSubscriptionId)) blocks.push({ code: "SUBSCRIPTION_ACTIVE", message: "Conta com assinatura ativa não recebe dados de teste." });
    } catch (e: any) { blocks.push({ code: "ASAAS_UNREACHABLE", message: `Não foi possível confirmar a assinatura no Asaas (${e.message}).` }); }
  }
  if (await repo.hasRunningBatch(db, tenantId)) blocks.push({ code: "BATCH_RUNNING", message: "Já há um lote sendo gerado nesta conta." });

  const lim = await getTenantLimits(tenantId);
  const need = needs(t.businessType);
  const [cur] = rows(await db.execute(sql`SELECT
      (SELECT count(*)::int FROM clients WHERE tenant_id = ${tenantId} AND deleted_at IS NULL) AS clients,
      (SELECT count(*)::int FROM professionals WHERE tenant_id = ${tenantId} AND is_active AND deleted_at IS NULL) AS professionals,
      (SELECT count(*)::int FROM appointments WHERE tenant_id = ${tenantId}
        AND scheduled_at >= date_trunc('month', now()) - interval '7 days') AS appointments`));
  const over: string[] = [];
  const word = t.businessType === PILATES ? ["alunos", "instrutores"] : ["clientes", "profissionais"];
  if (lim.maxClients !== null && cur.clients + need.clients > lim.maxClients) over.push(`${word[0]}: tem ${cur.clients}, o lote cria ${need.clients}, o plano permite ${lim.maxClients}`);
  if (lim.maxProfessionals !== null && cur.professionals + need.professionals > lim.maxProfessionals) over.push(`${word[1]}: tem ${cur.professionals}, o lote cria ${need.professionals}, o plano permite ${lim.maxProfessionals}`);
  if (need.appointments && lim.maxAppointmentsMonth !== null && lim.maxAppointmentsMonth >= 0 && cur.appointments + need.appointments > lim.maxAppointmentsMonth) {
    over.push(`agendamentos do mês: tem ${cur.appointments}, o lote cria ${need.appointments}, o plano permite ${lim.maxAppointmentsMonth}`);
  }
  if (over.length) blocks.push({ code: "PLAN_LIMIT", message: `Não cabe no plano (${lim.plan}): ${over.join("; ")}. Nada foi gerado.` });
  return { tenant: t, blocks, needs: need };
}

/** Token de "acessar como" o dono da conta (5 minutos), para criar pelas rotas do app. */
async function ownerToken(tenantId: string, actor: string) {
  const [o] = rows(await db.execute(sql`SELECT auth_user_id::text AS uid FROM user_profiles WHERE tenant_id = ${tenantId}
    ORDER BY (role = 'owner') DESC, created_at LIMIT 1`));
  if (!o) throw new AdminOpsError(409, "NO_OWNER", "A conta não tem usuário para criar os dados.");
  return jwt.sign({ userId: o.uid, tenantId, role: "owner", impersonation: true, impersonatedBy: `test-data:${actor}` },
    process.env.SUPER_ADMIN_SECRET!, { expiresIn: "5m" });
}

type Ctx = { app: FastifyInstance; token: string; batchId: string; tenantId: string; counts: Record<string, number> };

/** Chama uma rota do app; erro = falha da geração (o lote é desfeito). Registra o id criado no lote. */
async function create(c: Ctx, url: string, payload: unknown, table: string | null, idOf = (d: any) => d?.id): Promise<any> {
  const r = await c.app.inject({ method: "POST", url: `/api/v1${url}`, headers: { authorization: `Bearer ${c.token}` }, payload: payload as any });
  let body: any = {};
  try { body = r.json(); } catch { /* sem corpo */ }
  if (r.statusCode >= 300 || body.success === false) throw new AdminOpsError(422, "GENERATION_FAILED", `POST ${url}: ${body.error ?? r.statusCode}`);
  const data = body.data;
  if (table) {
    const id = idOf(data);
    if (!id) throw new AdminOpsError(500, "GENERATION_FAILED", `POST ${url} não devolveu o id`);
    await repo.addItem(db, c.batchId, c.tenantId, table, id);
    c.counts[table] = (c.counts[table] ?? 0) + 1;
  }
  return data;
}

async function generateSalon(c: Ctx) {
  const S = SIZES.salon;
  const pros = [], svcs = [], cls = [];
  for (let i = 1; i <= S.professionals; i++) {
    pros.push(await create(c, "/professionals", { fullName: `${TEST_PREFIX} Profissional ${i}`, phone: fakePhone(90 + i), email: fakeEmail(90 + i) }, "professionals"));
  }
  const names = ["Corte", "Escova", "Manicure", "Coloração", "Barba"];
  for (let i = 0; i < S.services; i++) {
    svcs.push(await create(c, "/services", { name: `${TEST_PREFIX} ${names[i % names.length]}`, durationMinutes: 60, price: 50 + 10 * i }, "services"));
  }
  for (let i = 1; i <= S.clients; i++) {
    cls.push(await create(c, "/clients", { fullName: `${TEST_PREFIX} Cliente ${i}`, whatsapp: fakePhone(i), email: fakeEmail(i), acceptsWhatsapp: false, acceptsMarketing: false }, "clients"));
  }
  // Dentro da jornada padrão do profissional novo (seg-sex 08-18, intervalo 12-13): dias úteis distintos, fora do
  // intervalo; a agenda recusa domingo, intervalo e choque (agenda-rules).
  const half = Math.ceil(S.appointments / 2);
  const pastDays = weekdays(-1, half), nextDays = weekdays(1, S.appointments - half);
  const HOURS = [9, 10, 11, 13, 14, 15, 16];
  for (let i = 0; i < S.appointments; i++) {
    const past = i < half;
    const start = at(past ? pastDays[i] : nextDays[i - half], HOURS[i % HOURS.length]);
    const svc = svcs[i % svcs.length], pro = pros[i % pros.length];
    await create(c, "/appointments", {
      clientId: cls[i % cls.length].id, professionalId: pro.id, status: past ? "completed" : "confirmed",
      scheduledAt: start.toISOString(), endsAt: new Date(start.getTime() + 3600_000).toISOString(),
      durationMinutes: 60, totalPrice: Number(svc.price), source: "teste",
      services: [{ serviceId: svc.id, professionalId: pro.id, price: Number(svc.price), durationMinutes: 60 }],
    }, "appointments");
  }
  const accounts = await c.app.inject({ method: "GET", url: "/api/v1/financial/accounts", headers: { authorization: `Bearer ${c.token}` } });
  let account = (accounts.json().data ?? []).find((a: any) => a.isDefault) ?? (accounts.json().data ?? [])[0];
  if (!account) account = await create(c, "/financial/accounts", { name: `${TEST_PREFIX} Caixa`, type: "cash" }, "financial_accounts");
  for (let i = 0; i < S.transactions; i++) {
    const paid = i % 2 === 0;
    await create(c, "/financial", {
      accountId: account.id, type: "revenue", status: paid ? "confirmed" : "pending", paymentMethod: paid ? "pix" : null,
      description: `${TEST_PREFIX} Receita avulsa ${i + 1}`, amount: 40 + 15 * i, dueDate: dayPlus(paid ? -i - 1 : i + 2), clientId: cls[i % cls.length].id,
    }, "financial_transactions");
  }
}

async function generatePilates(c: Ctx) {
  const P = SIZES.pilates;
  const inst = [], students = [];
  for (let i = 1; i <= P.instructors; i++) {
    inst.push(await create(c, "/class-instructors", { fullName: `${TEST_PREFIX} Instrutora ${i}`, whatsapp: fakePhone(90 + i), email: fakeEmail(90 + i) }, "professionals"));
  }
  const plans = [
    await create(c, "/memberships/plans", { name: `${TEST_PREFIX} Mensal 2x`, kind: "frequency", price: 180, classesPerWeek: 2, durationMonths: 3 }, "membership_plans"),
    await create(c, "/memberships/plans", { name: `${TEST_PREFIX} Pacote 8 aulas`, kind: "package", price: 300, totalClasses: 8, validityDays: 60 }, "membership_plans"),
  ].slice(0, P.plans);
  for (let i = 1; i <= P.students; i++) {
    students.push(await create(c, "/class-students", { fullName: `${TEST_PREFIX} Aluna ${i}`, whatsapp: fakePhone(i), email: fakeEmail(i), level: "beginner" }, "clients"));
  }
  for (let i = 0; i < P.enrollments; i++) {
    await create(c, "/memberships/enrollments", { studentId: students[i % students.length].id, planId: plans[i % plans.length].id, startDate: dayPlus(-20 + 5 * i) }, "membership_enrollments");
  }
  for (let i = 0; i < P.schedules; i++) {
    await create(c, "/classes/schedules", { instructorId: inst[i % inst.length].id, dayOfWeek: 1 + (i % 5), startTime: `${String(7 + i).padStart(2, "0")}:00`, capacity: 6 }, "class_schedules");
  }
  for (let i = 1; i <= P.leads; i++) {
    await create(c, "/class-leads", { name: `${TEST_PREFIX} Interessada ${i}`, whatsapp: fakePhone(50 + i), source: "teste", status: i === 1 ? "trial" : "interested" }, "leads");
  }
}

/** Desfaz um lote (falha na geração): apaga as linhas do lote pelos ids, na ordem das ligações do banco. */
export async function undoBatch(tenantId: string, batchId: string) {
  const edges = await ops.fkEdges(db);
  return db.transaction(async (tx) => {
    const m = await repo.collectBatchRows(tx, tenantId, batchId, edges);
    for (const k of await repo.sharedInUse(tx, tenantId, m, edges)) m.get(k.table)?.delete(k.id);
    const order = deletionOrder([...m.keys()], edges);
    const deleted = await repo.deleteRows(tx, tenantId, m, order);
    await tx.execute(sql`DELETE FROM test_batch_items WHERE batch_id = ${batchId}`);
    return deleted;
  });
}

export async function generateTestData(app: FastifyInstance, tenantId: string, actor: string, ip: string | null) {
  const { tenant, blocks } = await generationBlocks(tenantId);
  if (blocks.length) throw new AdminOpsError(409, blocks[0].code, blocks.map((b) => b.message).join(" "), { blocks });
  // Clique duplo: conferir "lote em andamento" e criar o lote sob a trava da conta; o 2º pedido espera e recebe 409.
  const batch = await db.transaction(async (tx) => {
    await repo.lockTenantBatches(tx, tenantId);
    if (await repo.hasRunningBatch(tx, tenantId)) throw new AdminOpsError(409, "BATCH_RUNNING", "Já há um lote sendo gerado nesta conta.");
    return repo.createBatch(tx, tenantId, actor);
  });
  const opId = await ops.insertOperation(db, { operation: "test_generate", tenantId, tenantName: tenant.name, actor, ip, details: { batchId: batch.id } });
  const c: Ctx = { app, token: await ownerToken(tenantId, actor), batchId: batch.id, tenantId, counts: {} };
  const sharedBefore = await repo.sharedIds(db, tenantId); // conta/categoria que a geração criar entram no lote
  try {
    if (tenant.businessType === PILATES) await generatePilates(c);
    else await generateSalon(c);
    await repo.registerNewShared(db, batch.id, tenantId, sharedBefore);
  } catch (e: any) {
    let undone: Record<string, number> | null = null;
    try {
      await repo.registerNewShared(db, batch.id, tenantId, sharedBefore);
      undone = await undoBatch(tenantId, batch.id);
    } catch { /* registrado abaixo */ }
    await repo.finishBatch(db, batch.id, "failed", c.counts);
    await ops.finishOperation(db, opId, { status: "failed", counts: c.counts, details: { error: e.message, undone } });
    if (e instanceof AdminOpsError) throw e;
    throw new AdminOpsError(500, "GENERATION_FAILED", `A geração falhou e foi desfeita (${e.message}).`);
  }
  await repo.finishBatch(db, batch.id, "ready", c.counts);
  await ops.finishOperation(db, opId, { status: "done", counts: c.counts });
  return { batchId: batch.id, counts: c.counts };
}

export async function listTestBatches(tenantId: string) {
  return repo.listBatches(db, tenantId);
}

const toCounts = (m: repo.BatchRows) => Object.fromEntries([...m].filter(([, ids]) => ids.size > 0).map(([t, ids]) => [t, ids.size]));

/** Conjunto a apagar (anotados + arrastados, sem recursos compartilhados em uso) e o que está ligado a dados fora do lote. */
async function deletionPlan(exec: any, tenantId: string, batchId: string, edges: Awaited<ReturnType<typeof ops.fkEdges>>) {
  const m = await repo.collectBatchRows(exec, tenantId, batchId, edges);
  for (const k of await repo.sharedInUse(exec, tenantId, m, edges)) m.get(k.table)?.delete(k.id);
  const annotated = new Set((await repo.batchItems(exec, batchId)).map((i) => `${i.table}:${i.id}`));
  const linked = await repo.linkedOutside(exec, tenantId, m, annotated, edges);
  return { m, counts: toCounts(m), linked };
}

/** Travas do apagar (lidas na hora; dentro da transação, depois da trava da conta). */
async function deletionBlocks(exec: any, tenantId: string, batch: any) {
  const blocks: { code: string; message: string }[] = [];
  const t = await ops.findTenant(exec, tenantId);
  if (!t?.isTestAccount) blocks.push({ code: "NOT_TEST_ACCOUNT", message: "A conta não está marcada como conta de teste." });
  if (batch.status !== "ready") blocks.push({ code: "BATCH_NOT_READY", message: `O lote não está pronto (situação: ${batch.status}).` });
  if (await repo.hasRunningBatch(exec, tenantId)) blocks.push({ code: "BATCH_RUNNING", message: "Há um lote sendo gerado nesta conta." });
  return blocks;
}

const linkedBlock = (linked: Record<string, number>) => ({
  code: "LINKED_TO_REAL_DATA",
  message: `Há registros do lote ligados a dados fora do lote (${Object.entries(linked).map(([t, n]) => `${t}: ${n}`).join("; ")}). Nada foi apagado.`,
});

/** Prévia do apagar: o que sai (por tabela) e, à parte, o que está ligado a dados fora do lote. Não apaga nada. */
export async function previewBatchDeletion(tenantId: string, batchId: string) {
  const batch = await repo.findBatch(db, tenantId, batchId);
  if (!batch) throw new AdminOpsError(404, "NOT_FOUND", "Lote não encontrado nesta conta");
  const { counts, linked } = await deletionPlan(db, tenantId, batchId, await ops.fkEdges(db));
  const blocks = await deletionBlocks(db, tenantId, batch);
  if (Object.keys(linked).length) blocks.push(linkedBlock(linked));
  return { batchId, status: batch.status, toDelete: counts, linkedOutside: linked, blocks };
}

/**
 * Apaga um lote: só as linhas do lote (anotadas + arrastadas pelas ligações), filhos antes dos pais, numa transação
 * sob a trava da conta. Qualquer trava ou ligação com dado fora do lote = 409 sem apagar nada; erro no meio = nada apagado.
 */
export async function deleteTestBatch(tenantId: string, batchId: string, actor: string, ip: string | null) {
  const t = await ops.findTenant(db, tenantId);
  if (!t) throw new AdminOpsError(404, "NOT_FOUND", "Conta não encontrada");
  const opId = await ops.insertOperation(db, { operation: "test_delete", tenantId, tenantName: t.name, actor, ip, details: { batchId } });
  try {
    const deleted = await db.transaction(async (tx) => {
      await repo.lockTenantBatches(tx, tenantId);
      const batch = await repo.findBatch(tx, tenantId, batchId);
      if (!batch) throw new AdminOpsError(404, "NOT_FOUND", "Lote não encontrado nesta conta");
      const blocks = await deletionBlocks(tx, tenantId, batch);
      if (blocks.length) throw new AdminOpsError(409, blocks[0].code, blocks.map((b) => b.message).join(" "), { blocks });
      const edges = await ops.fkEdges(tx);
      const plan = await deletionPlan(tx, tenantId, batchId, edges);
      if (Object.keys(plan.linked).length) {
        const b = linkedBlock(plan.linked);
        throw new AdminOpsError(409, b.code, b.message, { linked: plan.linked });
      }
      const out = await repo.deleteRows(tx, tenantId, plan.m, deletionOrder([...plan.m.keys()], edges));
      await repo.setBatchStatus(tx, batchId, "deleted");
      return out;
    });
    await ops.finishOperation(db, opId, { status: "done", counts: deleted });
    return { batchId, deleted };
  } catch (e: any) {
    await ops.finishOperation(db, opId, { status: "failed", details: { batchId, error: e.message, code: e.code ?? null } });
    if (e instanceof AdminOpsError) throw e;
    throw new AdminOpsError(500, "DELETE_FAILED", `O apagar falhou e nada foi removido (${e.message}).`);
  }
}
