// ============================================================
// BILLING SERVICE - Planos, Prorate e Assinaturas
// ============================================================
import { db } from "@db/connection.js";
import { sql } from "drizzle-orm";

export type PlanTier = "free" | "basic" | "pro" | "super";
export type PlanPeriod = "monthly" | "semiannual" | "annual";

export interface PlanConfig {
  tier: PlanTier;
  name: string;
  monthlyPrice: number;
  professionals: number;
  clients: number;
}

// Valores padrao caso o banco nao retorne
export const PLANS_DEFAULT: Record<PlanTier, PlanConfig> = {
  free:  { tier: "free",  name: "Free",   monthlyPrice: 0,     professionals: 1,  clients: 30     },
  basic: { tier: "basic", name: "Basico", monthlyPrice: 39.90, professionals: 1,  clients: 999999 },
  pro:   { tier: "pro",   name: "Pro",    monthlyPrice: 59.90, professionals: 5,  clients: 999999 },
  super: { tier: "super", name: "Super",  monthlyPrice: 99.90, professionals: 12, clients: 999999 },
};

export let PLANS: Record<PlanTier, PlanConfig> = { ...PLANS_DEFAULT };

export async function loadPlansFromDb(): Promise<void> {
  try {
    const result = await db.execute(sql`SELECT key, value FROM plan_settings WHERE key LIKE 'plan_%'`);
    const rows = (result as any).rows ?? (Array.isArray(result) ? result : []);
    const settings: Record<string, number> = {};
    rows.forEach((r: any) => {
      // Remove aspas extras se o valor foi salvo com JSON.stringify
      let raw = r.value;
      try { while (typeof raw === 'string' && (raw.startsWith('"') || raw.startsWith('\''))){ raw = JSON.parse(raw); } } catch {}
      settings[r.key] = parseFloat(raw) || 0;
    });

    PLANS = {
      free:  { ...PLANS_DEFAULT.free },
      basic: {
        ...PLANS_DEFAULT.basic,
        monthlyPrice:     settings["plan_basic_monthly"]     ?? PLANS_DEFAULT.basic.monthlyPrice,
        semiannualPrice:  settings["plan_basic_semiannual"]  ?? null,
        annualPrice:      settings["plan_basic_annual"]       ?? null,
        professionals:    settings["plan_basic_max_users"]   ?? PLANS_DEFAULT.basic.professionals,
      },
      pro: {
        ...PLANS_DEFAULT.pro,
        monthlyPrice:     settings["plan_pro_monthly"]       ?? PLANS_DEFAULT.pro.monthlyPrice,
        semiannualPrice:  settings["plan_pro_semiannual"]    ?? null,
        annualPrice:      settings["plan_pro_annual"]         ?? null,
        professionals:    settings["plan_pro_max_users"]     ?? PLANS_DEFAULT.pro.professionals,
      },
      super: {
        ...PLANS_DEFAULT.super,
        monthlyPrice:     settings["plan_super_monthly"]     ?? PLANS_DEFAULT.super.monthlyPrice,
        semiannualPrice:  settings["plan_super_semiannual"]  ?? null,
        annualPrice:      settings["plan_super_annual"]       ?? null,
        professionals:    settings["plan_super_max_users"]   ?? PLANS_DEFAULT.super.professionals,
      },
    };
    console.log("[BILLING] Planos carregados do banco:", JSON.stringify(PLANS));
  } catch (e) {
    console.error("[BILLING] Erro ao carregar planos do banco, usando defaults:", e);
  }
}

export const PERIOD_DISCOUNT: Record<PlanPeriod, number> = {
  monthly:    0,
  semiannual: 0.10,
  annual:     0.20,
};

export const PERIOD_MONTHS: Record<PlanPeriod, number> = {
  monthly:    1,
  semiannual: 6,
  annual:     12,
};

export const ASAAS_CYCLE: Record<PlanPeriod, string> = {
  monthly:    "MONTHLY",
  semiannual: "SEMIANNUALLY",
  annual:     "YEARLY",
};

export function calcPlanAmount(tier: PlanTier, period: PlanPeriod): number {
  const plan = PLANS[tier];
  const plan2 = plan as any;
  if (period === 'semiannual' && plan2.semiannualPrice) return parseFloat(Number(plan2.semiannualPrice).toFixed(2));
  if (period === 'annual' && plan2.annualPrice) return parseFloat(Number(plan2.annualPrice).toFixed(2));
  const discount = PERIOD_DISCOUNT[period];
  const months = PERIOD_MONTHS[period];
  const monthly = plan.monthlyPrice * (1 - discount);
  return parseFloat((monthly * months).toFixed(2));
}

export function calcPlanExpiry(period: PlanPeriod, from: Date = new Date()): Date {
  const months = PERIOD_MONTHS[period];
  const d = new Date(from);
  d.setMonth(d.getMonth() + months);
  return d;
}

export function calcProrate(
  currentPlanTier: PlanTier,
  currentPlanPeriod: PlanPeriod,
  currentStartedAt: Date,
  currentExpiresAt: Date,
): number {
  const now = new Date();
  const totalMs = currentExpiresAt.getTime() - currentStartedAt.getTime();
  const usedMs  = now.getTime() - currentStartedAt.getTime();
  const remainingRatio = Math.max(0, 1 - usedMs / totalMs);
  const totalPaid = calcPlanAmount(currentPlanTier, currentPlanPeriod);
  const credit = totalPaid * remainingRatio;
  return parseFloat(credit.toFixed(2));
}
