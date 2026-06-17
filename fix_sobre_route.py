# -*- coding: utf-8 -*-
path = r"C:\projetos\beautytech-v2\frontend\src\App.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Adiciona import da LandingPageSobre
content = content.replace(
    "const bookingMatch = window.location.pathname.match",
    "const sobreMatch = window.location.pathname === '/sobre';\n  const bookingMatch = window.location.pathname.match"
)

# Adiciona rota /sobre antes da rota /buscar
content = content.replace(
    "if (discoveryMatch) return <DiscoveryPage />;",
    "if (sobreMatch) return <LandingPageSobre />;\n  if (discoveryMatch) return <DiscoveryPage />;"
)

# Adiciona import do componente
content = content.replace(
    'import { useEffect, useState } from "react";',
    'import { useEffect, useState } from "react";\nimport LandingPageSobre from "./LandingPageSobre";'
)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("OK")
