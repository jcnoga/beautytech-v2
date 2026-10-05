// Interessados do Pilates (repository): acesso à tabela leads, sempre filtrado por tenant_id e sem os apagados.
// Sem regra de negócio — etapas, permissões e conversão ficam em leads.service.ts.
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { leads } from "@db/schema/index";
import { TZ } from "./classes.service";

type Db = any; // db ou tx do drizzle

const leadFields = {
  id: leads.id,
  name: leads.name,
  whatsapp: leads.whatsapp,
  source: leads.source,
  status: leads.status,
  notes: leads.notes,
  followUpDate: sql<string | null>`to_char(${leads.followUpAt} AT TIME ZONE ${TZ}, 'YYYY-MM-DD')`,
  followUpPast: sql<boolean>`coalesce((${leads.followUpAt} AT TIME ZONE ${TZ})::date < (now() AT TIME ZONE ${TZ})::date, false)`,
  convertedTo: leads.convertedTo,
  convertedAt: leads.convertedAt,
  createdAt: leads.createdAt,
  updatedAt: leads.updatedAt,
};
export type LeadRow = { [K in keyof typeof leadFields]: any };

const scope = (tenantId: string) => and(eq(leads.tenantId, tenantId), isNull(leads.deletedAt));

export async function listLeads(exec: Db, tenantId: string, stages: readonly string[]): Promise<LeadRow[]> {
  if (!stages.length) return [];
  return exec.select(leadFields).from(leads)
    .where(and(scope(tenantId), inArray(leads.status, stages as string[])))
    .orderBy(sql`${leads.followUpAt} ASC NULLS LAST`, desc(leads.createdAt));
}

export async function countLeadsByStage(exec: Db, tenantId: string): Promise<Record<string, number>> {
  const r = await exec.select({ status: leads.status, n: sql<number>`count(*)::int` }).from(leads)
    .where(scope(tenantId)).groupBy(leads.status);
  return Object.fromEntries(r.map((x: any) => [x.status, x.n]));
}

export async function findLead(exec: Db, tenantId: string, id: string, forUpdate = false): Promise<LeadRow | undefined> {
  const q = exec.select(leadFields).from(leads).where(and(scope(tenantId), eq(leads.id, id)));
  const [row] = await (forUpdate ? q.for("update") : q);
  return row;
}

export async function insertLead(exec: Db, values: Record<string, unknown>): Promise<string> {
  const [row] = await exec.insert(leads).values(values).returning({ id: leads.id });
  return row.id;
}

export async function updateLead(exec: Db, tenantId: string, id: string, values: Record<string, unknown>) {
  await exec.update(leads).set({ ...values, updatedAt: new Date() }).where(and(scope(tenantId), eq(leads.id, id)));
}
