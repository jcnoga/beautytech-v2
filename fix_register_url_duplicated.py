path = "frontend/src/App.tsx"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = 'const res = await fetch(`${import.meta.env["VITE_API_URL"]}/api/v1/auth/register`, {'
new = 'const res = await fetch(`${import.meta.env["VITE_API_URL"]}/auth/register`, {'

if old in content:
    content = content.replace(old, new)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("OK: URL de registro corrigida (removido /api/v1 duplicado)")
else:
    print("AVISO: trecho nao encontrado, nenhuma alteracao feita")
