// Isolamento entre tenants: antes de gravar, confere que os clientes, profissionais,
// serviços e agendamentos citados na requisição pertencem ao tenant do usuário.
// As FKs do banco só apontam para (id), então sem esta checagem um tenant poderia
// ligar (ou, via ON CONFLICT, alterar) registros de outro.
import { and, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@db/connection";
import { clients, professionals, services, appointments } from "@db/schema/index";

type Id = string | null | undefined;
export interface TenantRefs {
  clients?: Id[];
  professionals?: Id[];
  services?: Id[];
  appointments?: Id[];
}

const TABLES = {
  clients:       { table: clients,       label: "Cliente" },
  professionals: { table: professionals, label: "Profissional" },
  services:      { table: services,      label: "Servico" },
  appointments:  { table: appointments,  label: "Agendamento" },
} as const;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Devolve a mensagem de erro do primeiro registro que não é do tenant (ou não existe), ou null. */
export async function findForeignRef(tenantId: string, refs: TenantRefs): Promise<string | null> {
  for (const key of Object.keys(TABLES) as (keyof TenantRefs)[]) {
    const raw = (refs[key] ?? []).filter((v) => v !== null && v !== undefined && v !== "");
    if (!raw.length) continue;
    const { table, label } = TABLES[key];
    const ids = [...new Set(raw)];
    if (ids.some((v) => typeof v !== "string" || !UUID.test(v))) return `${label} nao encontrado`;
    const found = await db.select({ id: table.id }).from(table)
      .where(and(eq(table.tenantId, tenantId), inArray(table.id, ids as string[]), isNull(table.deletedAt)));
    if (found.length !== ids.length) return `${label} nao encontrado`;
  }
  return null;
}

/** Responde 404 e devolve true se algum registro citado não for do tenant. */
export async function rejectForeignRefs(reply: any, tenantId: string, refs: TenantRefs): Promise<boolean> {
  const error = await findForeignRef(tenantId, refs);
  if (!error) return false;
  reply.status(404).send({ success: false, error, code: "NOT_FOUND" });
  return true;
}
