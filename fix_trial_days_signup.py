# -*- coding: utf-8 -*-
import io

path = r"backend\src\modules\all-modules.ts"
content = io.open(path, encoding="utf-8").read()

old = """      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 15);"""

new = """      const trialSettingsRows = await db.execute(sql`SELECT value FROM plan_settings WHERE key = 'trial_days'`);
      const trialSettingsData = (trialSettingsRows as any).rows ?? (Array.isArray(trialSettingsRows) ? trialSettingsRows : []);
      const configuredTrialDays = Number(trialSettingsData[0]?.value ?? 15);
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + configuredTrialDays);"""

count = content.count(old)
print(f"Ocorrencias encontradas: {count}")

if count == 1:
    content = content.replace(old, new, 1)
    io.open(path, "w", encoding="utf-8").write(content)
    print("OK - cadastro publico agora le trial_days do banco")
else:
    print("ERRO - ancora nao encontrada exatamente 1 vez, nada foi alterado")
