# -*- coding: utf-8 -*-
path = r"frontend\src\App.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Remove a linha mal posicionada
old = "  if (isSuperAdmin) return <SuperAdminApp />;\n  if (currentPage === \"payment_success\") return <PaymentSuccessPage onGoHome={() => setCurrentPage(\"dashboard\")} />;"
new = "  if (isSuperAdmin) return <SuperAdminApp />;"

if old in content:
    content = content.replace(old, new)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("OK linha removida!")
else:
    print("ERRO trecho nao encontrado")
    idx = content.find("isSuperAdmin")
    print(repr(content[idx-20:idx+200]))
