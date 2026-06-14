path = r"C:\projetos\beautytech-v2\frontend\src\App.tsx"
with open(path, "r", encoding="utf-8") as f:
    lines = f.readlines()

# Linha 3219 (idx 3218): corrigir hostname
lines[3218] = "  const isRootDomain = ['zensalon.com.br','www.zensalon.com.br'].includes(window.location.hostname);\n"

# Linha 3220 (idx 3219): adicionar isSuperAdmin ANTES de isRootDomain
lines[3219] = "  if (isSuperAdmin) return <SuperAdminApp />;\n  if (isRootDomain) return <HomePage />;\n"

# Linha 3226 (idx 3225): remover o isSuperAdmin duplicado (agora sera linha 3227 pois inserimos uma linha)
# Recalcular: adicionamos 1 linha em 3219, entao o duplicado agora esta em 3227
lines[3227] = ""

with open(path, "w", encoding="utf-8", newline="\n") as f:
    f.writelines(lines)
print("OK - routing corrigido")

# Verificar
with open(path, "r", encoding="utf-8") as f:
    ls = f.readlines()
for i, l in enumerate(ls[3215:3232], start=3216):
    print(f"{i}: {l}", end="")
