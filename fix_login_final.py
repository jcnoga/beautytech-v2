# -*- coding: utf-8 -*-
path = r"frontend\src\App.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

changes = 0

# 1 - URLSearchParams para detectar ?tela=cadastro
old1 = "  const [showRegister, setShowRegister] = useState(false);"
new1 = "  const [showRegister, setShowRegister] = useState(() => new URLSearchParams(window.location.search).get('tela') === 'cadastro');"
if old1 in content:
    content = content.replace(old1, new1)
    changes += 1
    print("OK 1/3 URLSearchParams adicionado!")
else:
    print("ERRO 1/3 showRegister nao encontrado")

# 2 - Botao de cadastro destacado
old2 = 'border:"none", color: C.rose, fontSize:12, cursor:"pointer", fontFamily: FB, fontWeight:600 }}>\n              Nao tem conta? Cadastre seu salao gratis\n            </button>'
new2 = 'border:"1.5px solid #c9a96e", color: C.rose, fontSize:13, cursor:"pointer", fontFamily: FB, fontWeight:700, padding:"10px 20px", borderRadius:10, marginTop:4, width:"100%", background:"linear-gradient(135deg, #c9a96e22, #c9847a22)" }}>\n              \u2728 Nao tem conta? Cadastre seu salao gratis\n            </button>'
if old2 in content:
    content = content.replace(old2, new2)
    changes += 1
    print("OK 2/3 botao destacado!")
else:
    print("ERRO 2/3 botao nao encontrado")

# 3 - Import PaymentSuccessPage
import_line = "import PaymentSuccessPage from './PaymentSuccessPage';\n"
if "PaymentSuccessPage" not in content:
    idx = content.find("import ")
    idx_end = content.index("\n", idx) + 1
    content = content[:idx_end] + import_line + content[idx_end:]
    changes += 1
    print("OK 3/3 import PaymentSuccessPage adicionado!")
else:
    changes += 1
    print("OK 3/3 import PaymentSuccessPage ja existe!")

# 4 - Rota payment_success
old4 = "  if (isSuperAdmin) return <SuperAdminApp />;"
new4 = "  if (isSuperAdmin) return <SuperAdminApp />;\n  if (currentPage === \"payment_success\") return <PaymentSuccessPage onGoHome={() => setCurrentPage(\"dashboard\")} />;"
if old4 in content and 'payment_success' not in content:
    content = content.replace(old4, new4)
    print("OK 4/4 rota payment_success adicionada!")
else:
    print("OK 4/4 rota payment_success ja existe!")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
print(f"\nConcluido - {changes}/3 alteracoes aplicadas.")
