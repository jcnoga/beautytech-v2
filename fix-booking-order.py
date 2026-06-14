path = r"C:\projetos\beautytech-v2\frontend\src\App.tsx"
with open(path, "r", encoding="utf-8") as f:
    lines = f.readlines()

# Linha 3220 (idx 3219): isSuperAdmin
# Linha 3221 (idx 3220): isRootDomain -> HomePage
# Linha 3222 (idx 3221): isSubdomain -> LandingPage
# Linha 3226 (idx 3225): bookingMatch

# Nova ordem: isSuperAdmin, bookingMatch, discoveryMatch, isRootDomain, isSubdomain
lines[3219] = "  if (isSuperAdmin) return <SuperAdminApp />;\n"
lines[3220] = "  if (bookingMatch) return <BookingPage slug={bookingMatch[1]} />;\n"
lines[3221] = "  if (discoveryMatch) return <DiscoveryPage />;\n"
lines[3222] = "  if (isRootDomain) return <HomePage />;\n"
lines[3223] = "  if (isSubdomain) return <LandingPage />;\n"
lines[3224] = "  const PageComponent = PAGES[page] ?? PAGES[\"dashboard\"];\n"

# Remover as linhas duplicadas que ficaram abaixo (3224-3226)
# discoveryMatch estava na linha 3224, bookingMatch na 3226
lines[3225] = ""  # era "  // Returns condicionais DEPOIS de todos os hooks"
lines[3226] = ""  # era o bookingMatch duplicado

with open(path, "w", encoding="utf-8", newline="\n") as f:
    f.writelines(lines)
print("OK - ordem de routing corrigida")

# Verificar resultado
with open(path, "r", encoding="utf-8") as f:
    ls = f.readlines()
for i, l in enumerate(ls[3217:3232], start=3218):
    print(f"{i}: {l}", end="")