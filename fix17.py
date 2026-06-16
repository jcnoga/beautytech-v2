content = open('backend/src/modules/billing/billing.routes.ts', 'r', encoding='latin-1').read()
old = '  // GET /billing/plans\n  fastify.get("/billing/plans", async (_req: any, reply: any) => {\n    return reply.send({ success: true, data: PLANS });\n  });'
new = '''  // GET /billing/plans
  fastify.get("/billing/plans", async (_req: any, reply: any) => {
    try {
      const { db } = await import("@db/connection.js");
      const { sql } = await import("drizzle-orm");
      const result = await db.execute(sql`SELECT key, value FROM plan_settings WHERE key LIKE 'plan_%'`);
      const rows = (result as any).rows ?? (Array.isArray(result) ? result : []);
      const s: Record<string, number> = {};
      rows.forEach((r: any) => { s[r.key] = parseFloat(r.value) || 0; });
      const plans = {
        free:  { tier:"free",  name:"Free",   monthlyPrice:0,                                           professionals: 1,  clients:30     },
        basic: { tier:"basic", name:"Basico", monthlyPrice:s["plan_basic_monthly"] ?? 39.90,            professionals: s["plan_basic_max_users"] ?? 1,  clients:999999 },
        pro:   { tier:"pro",   name:"Pro",    monthlyPrice:s["plan_pro_monthly"]   ?? 59.90,            professionals: s["plan_pro_max_users"]   ?? 5,  clients:999999 },
        super: { tier:"super", name:"Super",  monthlyPrice:s["plan_super_monthly"] ?? 99.90,            professionals: s["plan_super_max_users"] ?? 12, clients:999999 },
      };
      return reply.send({ success: true, data: plans });
    } catch(e) {
      return reply.send({ success: true, data: PLANS });
    }
  });'''
content = content.replace(old, new, 1)
open('backend/src/modules/billing/billing.routes.ts', 'w', encoding='latin-1').write(content)
print('OK')
