// Alunos do Pilates (service): criação do aluno = clients + student_profiles, numa transação.
// Usado pelo cadastro de aluno (POST /class-students) e pela conversão de interessado (leads.service.ts).
import { clients, studentProfiles } from "@db/schema/index";
import { checkClientLimit, getPlanInfo } from "../all-modules";
import { ClassError } from "./classes.service";
import { STUDENT_CLIENT_FIELDS } from "./group-classes.dto";

const defined = (o: Record<string, unknown>) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));

/** Mesmos limites da assinatura do cadastro de clientes (item 36). Falha com 403 PLAN_LIMIT. */
export async function assertStudentLimit(tenantId: string) {
  const lim = await checkClientLimit(tenantId);
  if (!lim.allowed) throw new ClassError(403, "PLAN_LIMIT", `Limite do plano: ${lim.current}/${lim.limit} alunos. Faca upgrade.`);
  const plan = await getPlanInfo(tenantId);
  if (plan.isFree && lim.current >= plan.maxClients) {
    throw new ClassError(403, "PLAN_LIMIT", `Limite de ${plan.maxClients} alunos atingido no plano gratuito. Faca upgrade.`);
  }
}

/** Grava o aluno (dados do cadastro em clients, ficha em student_profiles) e devolve o id. Use dentro de uma transação. */
export async function insertStudent(tx: any, tenantId: string, userId: string, body: Record<string, unknown>, clientExtra: Record<string, unknown> = {}) {
  const clientData: Record<string, unknown> = {};
  const profileData: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) ((STUDENT_CLIENT_FIELDS as readonly string[]).includes(k) ? clientData : profileData)[k] = v;
  const [c] = await tx.insert(clients).values({ ...defined(clientData), ...clientExtra, tenantId, createdBy: userId, updatedBy: userId }).returning({ id: clients.id });
  await tx.insert(studentProfiles).values({ ...defined(profileData), tenantId, clientId: c.id });
  return c.id as string;
}
