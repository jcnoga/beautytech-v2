# -*- coding: utf-8 -*-
import io

path = r"backend\src\modules\all-modules.ts"
content = io.open(path, encoding="utf-8").read()

anchor = 'fastify.patch("/super-admin/plan-settings/:key"'

new_route = '''  // PUBLIC PLAN SETTINGS (somente precos e limites, sem dados sensiveis)
  fastify.get("/public/plan-settings", async (_req: any, reply: any) => {
    const data = await db.execute(sql`SELECT key, value FROM plan_settings`);
    const rows = (data as any).rows ?? (Array.isArray(data) ? data : []);
    const allowedKeys = new Set([
      "plan_basic_monthly", "plan_basic_semiannual", "plan_basic_annual", "plan_basic_max_users",
      "plan_pro_monthly", "plan_pro_semiannual", "plan_pro_annual", "plan_pro_max_users",
      "plan_super_monthly", "plan_super_semiannual", "plan_super_annual", "plan_super_max_users",
      "free_max_clients", "free_max_appointments_month", "trial_days",
    ]);
    const settings: Record<string, string> = {};
    for (const row of rows as any[]) {
      if (allowedKeys.has(row.key)) settings[row.key] = row.value;
    }
    return reply.send({ success: true, data: settings });
  });

  '''

if anchor in content:
    content = content.replace(anchor, new_route + anchor, 1)
    io.open(path, "w", encoding="utf-8").write(content)
    print("OK - rota /public/plan-settings adicionada")
else:
    print("ERRO - ancora nao encontrada, nada foi alterado")
