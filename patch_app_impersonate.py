with open("frontend/src/App.tsx", "r", encoding="utf-8") as f:
    content = f.read()

fixes = [
    # 1. Corrigir redirect ao sair da impersonation
    (
        'window.location.href = "/?superadmin=1";',
        'window.location.href = "/super-admin";'
    ),
    # 2. Logout nao deve limpar sa_token restaurado - preservar impersonation_sa_token logica
    (
        'const logout = async () => {\n  await supabase.auth.signOut();\n  setUser(null);\n  localStorage.clear();\n  sessionStorage.clear();\n  window.location.href = \'/\';\n};',
        'const logout = async () => {\n  await supabase.auth.signOut();\n  setUser(null);\n  localStorage.clear();\n  sessionStorage.removeItem("impersonation_token");\n  sessionStorage.removeItem("impersonation_tenant_name");\n  sessionStorage.removeItem("impersonation_sa_token");\n  window.location.href = \'/\';\n};'
    ),
    # 3. Permitir acesso ao dashboard com impersonation_token mesmo sem user Supabase
    (
        '  if (!user) return <LoginPage onLogin={(data: any) => { setUser(data.user); }} />;',
        '  const isImpersonating = !!sessionStorage.getItem("impersonation_token");\n  if (!user && !isImpersonating) return <LoginPage onLogin={(data: any) => { setUser(data.user); }} />;'
    ),
]

errors = []
for old, new in fixes:
    if old in content:
        content = content.replace(old, new, 1)
        print(f"OK: substituicao aplicada")
    else:
        errors.append(f"ERRO: marcador nao encontrado:\n  {old[:80]}...")

with open("frontend/src/App.tsx", "w", encoding="utf-8") as f:
    f.write(content)

if errors:
    for e in errors:
        print(e)
else:
    print("DONE: todos os patches aplicados com sucesso")
