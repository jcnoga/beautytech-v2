path = r"frontend\src\App.tsx"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = 'if (isSuperAdmin) return <SuperAdminApp />;'
new = '''if (isSuperAdmin) return <SuperAdminApp />;
  if (currentPage === "payment_success") return <PaymentSuccessPage onGoHome={() => setCurrentPage("dashboard")} />;'''

if old in content:
    content = content.replace(old, new, 1)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("OK rota payment_success inserida com sucesso!")
else:
    print("ERRO ponto de insercao nao encontrado")
