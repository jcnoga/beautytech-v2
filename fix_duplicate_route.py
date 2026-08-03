# -*- coding: utf-8 -*-
import io

path = r"backend\src\modules\all-modules.ts"
content = io.open(path, encoding="utf-8").read()

block = '''  // PUBLIC PLAN SETTINGS (somente precos e limites, sem dados sensiveis)
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

count = content.count(block)
print(f"Ocorrencias encontradas: {count}")

if count >= 2:
    # Substitui as duas (ou mais) ocorrencias coladas por apenas uma
    doubled = block + block
    if doubled in content:
        content = content.replace(doubled, block)
        io.open(path, "w", encoding="utf-8").write(content)
        print("OK - duplicata removida, restou apenas 1 ocorrencia da rota")
    else:
        print("AVISO - ocorrencias nao estao coladas uma na outra, revisar manualmente")
elif count == 1:
    print("Nada a fazer - so existe 1 ocorrencia")
else:
    print("ERRO - bloco nao encontrado exatamente, revisar manualmente")
