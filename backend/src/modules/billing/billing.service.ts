// ============================================================
// BILLING SERVICE - Planos, Prorate e Assinaturas
// ============================================================

export type PlanTier = "free" | "basic" | "pro" | "super";
export type PlanPeriod = "monthly" | "semiannual" | "annual";

export interface PlanConfig {
  tier: PlanTier;
  name: string;
  monthlyPrice: number;
  professionals: number;
  clients: number;
}

export const PLANS: Record<PlanTier, PlanConfig> = {
  free:  { tier: "free",  name: "Free",   monthlyPrice: 0,     professionals: 1,  clients: 30     },
  basic: { tier: "basic", name: "Basico", monthlyPrice: 39.90, professionals: 1,  clients: 999999 },
  pro:   { tier: "pro",   name: "Pro",    monthlyPrice: 59.90, professionals: 5,  clients: 999999 },
  super: { tier: "super", name: "Super",  monthlyPrice: 99.90, professionals: 12, clients: 999999 },
};

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
