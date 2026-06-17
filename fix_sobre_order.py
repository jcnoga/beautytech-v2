# -*- coding: utf-8 -*-
path = r"C:\projetos\beautytech-v2\frontend\src\App.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Mover verificacao do /sobre para ANTES do isRootDomain
content = content.replace(
    "if (isSuperAdmin) return <SuperAdminApp />;",
    "if (isSuperAdmin) return <SuperAdminApp />;\n  if (sobreMatch) return <LandingPageSobre />;"
)

# Remover a linha duplicada que ficou depois
content = content.replace(
    "if (sobreMatch) return <LandingPageSobre />;\n  if (bookingMatch)",
    "if (bookingMatch)"
)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("OK")
