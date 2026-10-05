// Planos da assinatura do ZenSalon: campos configuráveis por nicho no Super Admin e o padrão do código.
// A leitura (nicho → geral → código) fica em modules/billing/plan-limits.service.ts (resolvePlanSetting).

export const LIMIT_PLANS = ["trial", "free", "basic", "pro", "super"] as const;
export type LimitPlan = (typeof LIMIT_PLANS)[number];

/** Campos de cada plano. max_clients VAZIO nos planos pagos = ilimitado (padrão do código é null). */
export const PLAN_FIELDS: Record<LimitPlan, readonly string[]> = {
  trial: ["days", "max_professionals", "max_clients"],
  free:  ["max_professionals", "max_clients", "max_appointments_month"],
  basic: ["monthly", "semiannual", "annual", "max_professionals", "max_clients"],
  pro:   ["monthly", "semiannual", "annual", "max_professionals", "max_clients"],
  super: ["monthly", "semiannual", "annual", "max_professionals", "max_clients"],
};
export const PRICE_FIELDS = ["monthly", "semiannual", "annual"] as const;

/** Chave geral que já existia em plan_settings (antes de haver valores por nicho). */
export const GENERAL_KEYS: Record<string, string> = {
  "trial.days": "trial_days",
  "free.max_clients": "free_max_clients",
  "free.max_appointments_month": "free_max_appointments_month",
  ...Object.fromEntries((["basic", "pro", "super"] as const).flatMap((p) => [
    [`${p}.monthly`, `plan_${p}_monthly`],
    [`${p}.semiannual`, `plan_${p}_semiannual`],
    [`${p}.annual`, `plan_${p}_annual`],
    [`${p}.max_professionals`, `plan_${p}_max_users`],
  ])),
};

/** Padrão do código (último recurso). null = sem limite / sem preço definido. */
export const CODE_DEFAULTS: Record<string, number | null> = {
  "trial.days": 60, "trial.max_professionals": 2, "trial.max_clients": 50,
  "free.max_professionals": 1, "free.max_clients": 30, "free.max_appointments_month": 50,
  "basic.monthly": 39.9, "basic.semiannual": null, "basic.annual": null, "basic.max_professionals": 1, "basic.max_clients": null,
  "pro.monthly": 59.9,   "pro.semiannual": null,   "pro.annual": null,   "pro.max_professionals": 5,   "pro.max_clients": null,
  "super.monthly": 99.9, "super.semiannual": null, "super.annual": null, "super.max_professionals": 12, "super.max_clients": null,
};

/** Chave em plan_settings do valor de um nicho. Ex.: niche.pilates.trial.days */
export const nicheKey = (businessType: string, plan: string, field: string) => `niche.${businessType}.${plan}.${field}`;
