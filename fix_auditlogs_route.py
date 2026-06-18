# -*- coding: utf-8 -*-
path = r"C:\projetos\beautytech-v2\frontend\src\App.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Adiciona import
content = content.replace(
    "import BookingPage from './BookingPage';",
    "import BookingPage from './BookingPage';\nimport AuditLogsPage from './AuditLogsPage';"
)

# Adiciona no PAGES
content = content.replace(
    "    settings: TenantSettingsPage,",
    "    settings: TenantSettingsPage,\n    auditlogs: AuditLogsPage,"
)

# Adiciona no menu SISTEMA
content = content.replace(
    "      { id:\"pricing\",  label:\"Planos\",        icon:\"$\", premium:false },\n      { id:\"settings\", label:\"Configuracoes\", icon:\"?\", premium:false },",
    "      { id:\"pricing\",  label:\"Planos\",        icon:\"$\", premium:false },\n      { id:\"settings\", label:\"Configuracoes\", icon:\"?\", premium:false },\n      { id:\"auditlogs\", label:\"Log de Acoes\",  icon:\"L\", premium:false },"
)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("OK")
