# -*- coding: utf-8 -*-
path = r"C:\projetos\beautytech-v2\backend\src\modules\all-modules.ts"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Corrige encoding corrompido
content = content.replace(
    "Erro ao criar usu\u251c\u00c2\u00e3\u00c6\u251c\u00e5\u00d4\u00c7\u00d6\u251c\u00c2\u00d4\u00c7\u00dc\u251c\u00e9\u00ac\u00ad\u00b4rio",
    "Erro ao criar usu\u00e1rio"
)
content = content.replace(
    "Criar usu\u251c\u00c2\u00e3\u00c6\u251c\u00e5\u00d4\u00c7\u00d6\u251c\u00c2\u00d4\u00c7\u00dc\u251c\u00e9\u00ac\u00ad\u00b4rio",
    "Criar usu\u00e1rio"
)
content = content.replace(
    "Remover usu\u251c\u00c2\u00e3\u00c6\u251c\u00e5\u00d4\u00c7\u00d6\u251c\u00c2\u00d4\u00c7\u00dc\u251c\u00e9\u00ac\u00ad\u00b4rio",
    "Remover usu\u00e1rio"
)

# Expoe o erro real do Supabase
content = content.replace(
    'error: authData.message ?? "Erro ao criar usu\u00e1rio"',
    'error: authData.message || authData.error?.message || "Erro ao criar usu\u00e1rio"'
)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("OK")
