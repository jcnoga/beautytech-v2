// src/config/plan-limits.ts
export const PLAN_LIMITS: Record<string, { professionals: number; clients: number }> = {
  free:    { professionals: 1,  clients: 100   },
  trial:   { professionals: 3,  clients: 200   },
  basic:   { professionals: 1,  clients: 2000  },
  pro:     { professionals: 5,  clients: 999999 },
  super:   { professionals: 12, clients: 999999 },
};
