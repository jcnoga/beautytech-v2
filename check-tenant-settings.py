path = r"C:\projetos\beautytech-v2\frontend\src\TenantSettingsPage.tsx"
with open(path, "r", encoding="utf-8") as f:
    lines = f.readlines()

# Mostrar primeiras 80 linhas
for i, line in enumerate(lines[:80], start=1):
    print(f"{i}: {line}", end="")