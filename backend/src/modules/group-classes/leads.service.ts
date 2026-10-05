// Interessados do Pilates (service): regras do funil, sem HTTP. Usado por leads.routes.ts.
// - Etapas: só as de lead-stages.ts. "Matriculado" só pela conversão em aluno; interessado convertido não muda de etapa.
// - Lista padrão sem as etapas escondidas (Perdido); com ?status= mostra só aquela etapa.
// - Próximo contato vencido (alerta) só nas etapas que não são finais.
// - Conversão: cria o aluno com os dados do interessado; WhatsApp já usado por cliente do tenant exige confirmação.
import { ClassError } from "./classes.service";
import {
  type LeadStage, PILATES_LEAD_STAGES, LEAD_STAGE_KEYS, INITIAL_LEAD_STAGE, CONVERTED_LEAD_STAGE, findLeadStage,
} from "./lead-stages";
import * as repo from "./leads.repository";
import { assertStudentLimit, insertStudent } from "./students.service";

const fail = (status: number, code: string, message: string): never => { throw new ClassError(status, code, message); };
type Db = any;

/** Dia AAAA-MM-DD (Brasília) → meio-dia de Brasília, para o dia nunca mudar com o fuso. */
const followUpTs = (day: string | null | undefined) => (day === undefined ? undefined : day === null ? null : new Date(`${day}T12:00:00-03:00`));

function toApi(row: repo.LeadRow) {
  const { followUpPast, ...rest } = row;
  return { ...rest, followUpOverdue: !!followUpPast && !findLeadStage(row.status)?.final };
}

function checkStage(status: string) {
  const stage = findLeadStage(status);
  if (!stage) fail(400, "INVALID_STAGE", `Etapa inválida. Use: ${LEAD_STAGE_KEYS.join(", ")}`);
  if (stage!.onlyByConversion) fail(400, "STAGE_ONLY_BY_CONVERSION", `"${stage!.label}" só pela conversão em aluno`);
}

export const listStages = () => PILATES_LEAD_STAGES;

export async function listLeads(exec: Db, tenantId: string, status?: string) {
  if (status !== undefined && !findLeadStage(status)) fail(400, "INVALID_STAGE", `Etapa inválida. Use: ${LEAD_STAGE_KEYS.join(", ")}`);
  const stages = status !== undefined ? [status] : PILATES_LEAD_STAGES.filter((s: LeadStage) => !s.hidden).map((s) => s.key);
  const [data, counts] = await Promise.all([repo.listLeads(exec, tenantId, stages), repo.countLeadsByStage(exec, tenantId)]);
  return { data: data.map(toApi), counts };
}

export async function getLead(exec: Db, tenantId: string, id: string) {
  const row = await repo.findLead(exec, tenantId, id);
  if (!row) fail(404, "NOT_FOUND", "Interessado não encontrado");
  return toApi(row!);
}

type LeadInput = { name?: string; whatsapp?: string | null; source?: string | null; status?: string; followUpAt?: string | null; notes?: string | null };

export async function createLead(exec: Db, tenantId: string, userId: string, body: LeadInput & { name: string }) {
  const status = body.status ?? INITIAL_LEAD_STAGE;
  checkStage(status);
  const id = await repo.insertLead(exec, {
    tenantId, name: body.name, whatsapp: body.whatsapp ?? null, source: body.source ?? null, notes: body.notes ?? null,
    status, followUpAt: followUpTs(body.followUpAt) ?? null, createdBy: userId, updatedBy: userId,
  });
  return getLead(exec, tenantId, id);
}

export async function updateLead(exec: Db, tenantId: string, userId: string, id: string, body: LeadInput) {
  const current = await repo.findLead(exec, tenantId, id, true);
  if (!current) fail(404, "NOT_FOUND", "Interessado não encontrado");
  if (body.status !== undefined && body.status !== current!.status) {
    if (current!.status === CONVERTED_LEAD_STAGE) fail(409, "LEAD_CONVERTED", "Este interessado já virou aluno; a etapa não muda mais");
    checkStage(body.status);
  }
  const values = Object.fromEntries(Object.entries({
    name: body.name, whatsapp: body.whatsapp, source: body.source, notes: body.notes,
    status: body.status, followUpAt: followUpTs(body.followUpAt),
  }).filter(([, v]) => v !== undefined));
  await repo.updateLead(exec, tenantId, id, { ...values, updatedBy: userId });
  return getLead(exec, tenantId, id);
}

/**
 * Converte o interessado em aluno (clients + student_profiles) e o marca como Matriculado, na mesma transação.
 * WhatsApp igual ao de um cliente do tenant (só dígitos): 409 DUPLICATE_WHATSAPP com o cliente, sem gravar nada,
 * a menos que confirmDuplicate venha true.
 */
export async function convertLead(tx: Db, tenantId: string, userId: string, id: string, opts: { confirmDuplicate?: boolean }) {
  const lead = await repo.findLead(tx, tenantId, id, true);
  if (!lead) fail(404, "NOT_FOUND", "Interessado não encontrado");
  if (lead!.status === CONVERTED_LEAD_STAGE) fail(409, "LEAD_CONVERTED", "Este interessado já virou aluno");
  const digits = (lead!.whatsapp ?? "").replace(/\D/g, "");
  if (digits && !opts.confirmDuplicate) {
    const dup = await repo.findClientByWhatsappDigits(tx, tenantId, digits);
    if (dup) throw new ClassError(409, "DUPLICATE_WHATSAPP", `Já existe ${dup.fullName} com este WhatsApp`, { clientId: dup.id, clientName: dup.fullName });
  }
  await assertStudentLimit(tenantId);
  const studentId = await insertStudent(tx, tenantId, userId,
    { fullName: lead!.name, whatsapp: lead!.whatsapp ?? undefined, phone: lead!.phone ?? undefined, email: lead!.email ?? undefined },
    { source: "lead" });
  await repo.updateLead(tx, tenantId, id, { status: CONVERTED_LEAD_STAGE, convertedTo: studentId, convertedAt: new Date(), updatedBy: userId });
  return { studentId, lead: await getLead(tx, tenantId, id) };
}
