// Limites e preços dos planos da assinatura, por nicho. Toda regra de limite passa por aqui.
// Ordem de leitura (resolvePlanSetting, função única): valor do nicho (niche.<nicho>.<plano>.<campo>)
//   → valor geral antigo de plan_settings (ex.: trial_days, plan_pro_max_users) → padrão do código (config/plan-limits.ts).
// Limite individual da conta (tenants.max_clients / max_professionals) vence o do plano; vazio = segue o plano.
// Ao atingir o limite, só o cadastro de NOVOS é recusado; quem já existe nunca é apagado nem escondido.
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@db/connection";
import { tenants, clients, professionals } from "@db/schema/index";
import { normalizeBusinessType } from "../../config/features";
import {
  type LimitPlan, LIMIT_PLANS, PLAN_FIELDS, PRICE_FIELDS, GENERAL_KEYS, CODE_DEFAULTS, nicheKey,
} from "../../config/plan-limits";

export type Settings = Map<string, unknown>;
export type Source = "niche" | "general" | "code";

/** Valor de plan_settings (jsonb: número, texto, texto com aspas) → número; vazio/ inválido → undefined (= não definido). */
export function parseSetting(raw: unknown): number | undefined {
  let v = raw;
  for (let i = 0; i < 3 && typeof v === "string"; i++) {
    const s = v.trim();
    if (s === "") return undefined;
    if (/^".*"$/.test(s) || /^'.*'$/.test(s)) { v = s.slice(1, -1); continue; }
    v = s;
    break;
  }
  if (v === null || v === undefined || v === "") return undefined;
  const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Valor para GRAVAR em plan_settings: número quando for número (tira camadas de aspas: "\"30\"" → 30), objeto como está,
 * texto sem as aspas extras. Gravar sempre com `${JSON.stringify(v)}::text::jsonb`: só `::jsonb` faz o driver
 * codificar de novo e salvar uma string JSON (era assim até 06/10/2026; ver scripts/consertar-plan-settings.sql).
 */
export function settingValueToStore(raw: unknown): unknown {
  if (raw !== null && typeof raw === "object") return raw;
  if (typeof raw === "number") return raw;
  let s = raw === null || raw === undefined ? "" : String(raw).trim();
  for (let i = 0; i < 10 && /^".*"$/s.test(s); i++) { try { s = String(JSON.parse(s)).trim(); } catch { break; } }
  const n = parseSetting(s);
  return n !== undefined ? n : s;
}

/** Lê um campo de um plano: nicho → geral → código. Única função com essa ordem. */
export function resolvePlanSetting(settings: Settings, businessType: string, plan: LimitPlan, field: string): { value: number | null; source: Source } {
  const niche = parseSetting(settings.get(nicheKey(businessType, plan, field)));
  if (niche !== undefined) return { value: niche, source: "niche" };
  const generalKey = GENERAL_KEYS[`${plan}.${field}`];
  const general = generalKey ? parseSetting(settings.get(generalKey)) : undefined;
  if (general !== undefined) return { value: general, source: "general" };
  return { value: CODE_DEFAULTS[`${plan}.${field}`] ?? null, source: "code" };
}

export async function loadSettings(exec: any = db): Promise<Settings> {
  const r = await exec.execute(sql`SELECT key, value FROM plan_settings`);
  const rows = (r as any).rows ?? (Array.isArray(r) ? r : []);
  return new Map(rows.map((x: any) => [x.key, x.value]));
}

/** Todos os campos de um plano de um nicho, com a origem de cada valor. */
export function nichePlan(settings: Settings, businessType: string, plan: LimitPlan) {
  return Object.fromEntries(PLAN_FIELDS[plan].map((f) => [f, resolvePlanSetting(settings, businessType, plan, f)])) as Record<string, { value: number | null; source: Source }>;
}

/** Plano que vale para os limites: trial em dia → trial; trial/free vencido → free (gratuito); pago → ele mesmo. */
export function limitPlanOf(t: { planTier: string | null; trialEndsAt: Date | string | null }, now = new Date()): LimitPlan {
  const tier = t.planTier ?? "free";
  if (tier === "trial" || tier === "free") {
    const end = t.trialEndsAt ? new Date(t.trialEndsAt) : null;
    return end && end > now ? "trial" : "free";
  }
  if (tier === "enterprise") return "super";
  return (LIMIT_PLANS as readonly string[]).includes(tier) ? (tier as LimitPlan) : "free";
}

const nicheOf = (bt: string | null | undefined) => normalizeBusinessType(bt) ?? "beauty_salon";

/** Plano e dias de teste de uma conta nova do nicho. */
export async function newTenantPlan(businessType: string | null | undefined, now = new Date()) {
  const settings = await loadSettings();
  const days = resolvePlanSetting(settings, nicheOf(businessType), "trial", "days").value ?? 60;
  const trialEndsAt = new Date(now.getTime() + days * 86_400_000);
  return { planTier: "trial" as const, trialEndsAt, trialDays: days };
}

/** Limites que valem hoje para a conta (override da conta → plano do nicho). null = ilimitado. */
export async function getTenantLimits(tenantId: string) {
  const [t] = await db.select({
    planTier: tenants.planTier, trialEndsAt: tenants.trialEndsAt, businessType: tenants.businessType,
    maxClients: tenants.maxClients, maxProfessionals: tenants.maxProfessionals,
  }).from(tenants).where(eq(tenants.id, tenantId));
  const settings = await loadSettings();
  const plan = limitPlanOf({ planTier: t?.planTier ?? null, trialEndsAt: t?.trialEndsAt ?? null });
  const niche = nicheOf(t?.businessType);
  const get = (f: string) => (PLAN_FIELDS[plan].includes(f) ? resolvePlanSetting(settings, niche, plan, f).value : null);
  return {
    plan, businessType: niche,
    maxProfessionals: t?.maxProfessionals ?? get("max_professionals"),
    maxClients: t?.maxClients ?? get("max_clients"),
    maxAppointmentsMonth: get("max_appointments_month"),
  };
}

export async function checkProfessionalLimit(tenantId: string) {
  const lim = await getTenantLimits(tenantId);
  const [{ count }] = await db.select({ count: sql`count(*)` }).from(professionals)
    .where(and(eq(professionals.tenantId, tenantId), eq(professionals.isActive, true), isNull(professionals.deletedAt)));
  const current = Number(count);
  return { allowed: lim.maxProfessionals === null || current < lim.maxProfessionals, limit: lim.maxProfessionals, current, plan: lim.plan };
}

export async function checkClientLimit(tenantId: string) {
  const lim = await getTenantLimits(tenantId);
  const [{ count }] = await db.select({ count: sql`count(*)` }).from(clients).where(and(eq(clients.tenantId, tenantId), isNull(clients.deletedAt)));
  const current = Number(count);
  return { allowed: lim.maxClients === null || current < lim.maxClients, limit: lim.maxClients, current, plan: lim.plan };
}

/** Mensagem do 403 PLAN_LIMIT: deixa claro que só o cadastro de novos foi bloqueado. */
const SINGULAR: Record<string, string> = { clientes: "cliente", profissionais: "profissional", alunos: "aluno", instrutores: "instrutor" };
export const limitMessage = (what: string, lim: { current: number; limit: number | null }) => {
  const word = (n: number | null) => (n === 1 ? SINGULAR[what] ?? what : what);
  return `Seu plano permite até ${lim.limit} ${word(lim.limit)} e você já tem ${lim.current}. Os cadastrados continuam normais; para cadastrar mais, faça upgrade do plano.`;
};

// ─── Super Admin: valores por nicho ─────────────────────────────────────────
export class PlanSettingsError extends Error { constructor(public status: number, public code: string, message: string) { super(message); } }

/** Tela do Super Admin: os 5 planos de um nicho com valor e origem. */
export async function getNicheSettings(businessType: string) {
  const niche = normalizeBusinessType(businessType);
  if (!niche) throw new PlanSettingsError(400, "INVALID_BUSINESS_TYPE", "Nicho inválido");
  const settings = await loadSettings();
  return Object.fromEntries(LIMIT_PLANS.map((p) => [p, nichePlan(settings, niche, p)]));
}

/**
 * Grava valores de um nicho: { "trial.days": 60, "pro.max_clients": null, ... }.
 * null ou "" apaga o valor do nicho (volta a valer o geral/padrão; em max_clients pago = ilimitado).
 */
export async function saveNicheSettings(businessType: string, values: Record<string, unknown>) {
  const niche = normalizeBusinessType(businessType);
  if (!niche) throw new PlanSettingsError(400, "INVALID_BUSINESS_TYPE", "Nicho inválido");
  const ops: { key: string; value: number | null }[] = [];
  for (const [k, raw] of Object.entries(values ?? {})) {
    const [plan, field] = k.split(".");
    if (!(LIMIT_PLANS as readonly string[]).includes(plan) || !PLAN_FIELDS[plan as LimitPlan].includes(field)) {
      throw new PlanSettingsError(400, "INVALID_FIELD", `Campo inválido: ${k}`);
    }
    if (raw === null || raw === "") { ops.push({ key: nicheKey(niche, plan, field), value: null }); continue; }
    const n = parseSetting(raw);
    const isPrice = (PRICE_FIELDS as readonly string[]).includes(field);
    if (n === undefined || n < 0 || (!isPrice && !Number.isInteger(n)) || (field === "days" && (n < 1 || n > 365))) {
      throw new PlanSettingsError(400, "INVALID_VALUE", `Valor inválido em ${k}`);
    }
    ops.push({ key: nicheKey(niche, plan, field), value: n });
  }
  await db.transaction(async (tx) => {
    for (const op of ops) {
      if (op.value === null) await tx.execute(sql`DELETE FROM plan_settings WHERE key = ${op.key}`);
      else await tx.execute(sql`INSERT INTO plan_settings (key, value, updated_at) VALUES (${op.key}, ${JSON.stringify(op.value)}::text::jsonb, now())
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`);
    }
  });
  return getNicheSettings(niche);
}

// ─── preços por nicho (página de preços e checkout) ─────────────────────────
const PLAN_NAMES: Record<string, string> = { free: "Free", basic: "Basico", pro: "Pro", super: "Super" };

/** Planos do nicho no formato da cobrança. semiannualPrice/annualPrice = preço POR MÊS no período (null = desconto padrão). */
export function plansForNiche(settings: Settings, businessType: string | null | undefined) {
  const niche = nicheOf(businessType);
  const get = (plan: LimitPlan, f: string) => resolvePlanSetting(settings, niche, plan, f).value;
  const paid = (tier: "basic" | "pro" | "super") => ({
    tier, name: PLAN_NAMES[tier],
    monthlyPrice: get(tier, "monthly") ?? 0,
    semiannualPrice: get(tier, "semiannual"),
    annualPrice: get(tier, "annual"),
    professionals: get(tier, "max_professionals"),
    clients: get(tier, "max_clients"),
  });
  return {
    free: { tier: "free", name: PLAN_NAMES.free, monthlyPrice: 0, semiannualPrice: 0, annualPrice: 0,
      professionals: get("free", "max_professionals"), clients: get("free", "max_clients") },
    basic: paid("basic"), pro: paid("pro"), super: paid("super"),
  };
}
export type NichePlans = ReturnType<typeof plansForNiche>;
export const loadNichePlans = async (businessType: string | null | undefined) => plansForNiche(await loadSettings(), businessType);
