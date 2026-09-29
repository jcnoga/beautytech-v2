// Regras configuráveis do Pilates (Fase 3): PADRÃO DO STUDIO (pilates_settings) + EXCEÇÃO POR PLANO
// (colunas opcionais em pilates_plans; NULL = usa o padrão). Todo cálculo usa effectiveRules().
import { sql } from "drizzle-orm";

export type Exec = { execute: (q: any) => Promise<any> };
export const rows = (r: any): any[] => (Array.isArray(r) ? r : r?.rows ?? []);

/** Regras que o plano pode sobrescrever: [nome na API (camelCase), coluna]. */
export const PLAN_RULES = [
  ["allowIndividualSlot", "allow_individual_slot"],
  ["individualSlotCapacity", "individual_slot_capacity"],
  ["cancelDeadlineEnabled", "cancel_deadline_enabled"],
  ["cancelMinHours", "cancel_min_hours"],
  ["makeupEnabled", "makeup_enabled"],
  ["makeupValidityDays", "makeup_validity_days"],
  ["makeupMonthlyLimitEnabled", "makeup_monthly_limit_enabled"],
  ["makeupMaxPerMonth", "makeup_max_per_month"],
  ["unexcusedAbsenceConsumesCredit", "unexcused_absence_consumes_credit"],
  ["unexcusedAbsenceGeneratesMakeup", "unexcused_absence_generates_makeup"],
  ["excusedAbsenceGeneratesMakeup", "excused_absence_generates_makeup"],
  ["excusedAbsenceConsumesCredit", "excused_absence_consumes_credit"],
  ["timelyCancelGeneratesMakeup", "timely_cancel_generates_makeup"],
  ["lateCancelConsumesCredit", "late_cancel_consumes_credit"],
  ["pauseEnabled", "pause_enabled"],
  ["pauseMaxDays", "pause_max_days"],
] as const;

/** Regras só do studio (não têm exceção por plano). */
export const STUDIO_ONLY = [
  ["studioCancelActionPackage", "studio_cancel_action_package"],
  ["studioCancelActionFrequency", "studio_cancel_action_frequency"],
  ["instructorAttendanceScope", "instructor_attendance_scope"],
  ["instructorEditWindowHours", "instructor_edit_window_hours"],
  ["defaultClassDuration", "default_class_duration"],
  ["defaultClassCapacity", "default_class_capacity"],
] as const;

export type Rules = {
  allowIndividualSlot: boolean; individualSlotCapacity: number;
  cancelDeadlineEnabled: boolean; cancelMinHours: number;
  makeupEnabled: boolean; makeupValidityDays: number; makeupMonthlyLimitEnabled: boolean; makeupMaxPerMonth: number;
  unexcusedAbsenceConsumesCredit: boolean; unexcusedAbsenceGeneratesMakeup: boolean;
  excusedAbsenceGeneratesMakeup: boolean; excusedAbsenceConsumesCredit: boolean;
  timelyCancelGeneratesMakeup: boolean; lateCancelConsumesCredit: boolean;
  pauseEnabled: boolean; pauseMaxDays: number;
  studioCancelAction: "refund_credit" | "generate_makeup";
  /** Quais regras vieram do plano (exceção) e não do studio. */
  fromPlan: string[];
};

/** Padrões do studio (linha criada na hora se ainda não existir). Devolve a linha em snake_case. */
export async function getStudioSettings(exec: Exec, tenantId: string): Promise<Record<string, any>> {
  await exec.execute(sql`INSERT INTO pilates_settings (tenant_id) VALUES (${tenantId}) ON CONFLICT (tenant_id) DO NOTHING`);
  const [s] = rows(await exec.execute(sql`SELECT * FROM pilates_settings WHERE tenant_id = ${tenantId}`));
  return s;
}

export function settingsToApi(s: Record<string, any>) {
  const out: Record<string, any> = {};
  for (const [api, col] of [...PLAN_RULES, ...STUDIO_ONLY]) out[api] = s[col];
  return out;
}

/** Regra efetiva = exceção do plano ?? padrão do studio. `plan` em snake_case (ou null). */
export function effectiveRules(studio: Record<string, any>, plan: Record<string, any> | null): Rules {
  const r: any = { fromPlan: [] };
  for (const [api, col] of PLAN_RULES) {
    const v = plan?.[col];
    if (v !== null && v !== undefined) { r[api] = v; r.fromPlan.push(api); }
    else r[api] = studio[col];
  }
  const kind = plan?.kind ?? "package";
  if (plan?.studio_cancel_action) { r.studioCancelAction = plan.studio_cancel_action; r.fromPlan.push("studioCancelAction"); }
  else r.studioCancelAction = kind === "frequency" ? studio.studio_cancel_action_frequency : studio.studio_cancel_action_package;
  return r as Rules;
}

/** Regras efetivas de uma matrícula (plano dela + studio). Sem matrícula = só o studio. */
export async function rulesForEnrollment(exec: Exec, tenantId: string, enrollmentId: string | null) {
  const studio = await getStudioSettings(exec, tenantId);
  if (!enrollmentId) return { rules: effectiveRules(studio, null), studio, plan: null as any };
  const [plan] = rows(await exec.execute(sql`SELECT p.* FROM pilates_enrollments e JOIN pilates_plans p ON p.id = e.plan_id
    WHERE e.id = ${enrollmentId} AND e.tenant_id = ${tenantId}`));
  return { rules: effectiveRules(studio, plan ?? null), studio, plan: plan ?? null };
}
