path = r"frontend\src\App.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

changes = 0

# 1 - Detectar ?tela=cadastro na inicializacao
old_state = "  const [showRegister, setShowRegister] = useState(false);"
new_state = "  const [showRegister, setShowRegister] = useState(() => new URLSearchParams(window.location.search).get('tela') === 'cadastro');"

if old_state in content:
    content = content.replace(old_state, new_state)
    changes += 1
    print("OK 1/2 - deteccao de ?tela=cadastro adicionada!")
else:
    print("ERRO 1/2 - estado showRegister nao encontrado")

# 2 - Destacar botao de cadastro
old_btn = """              <button onClick={() => setShowRegister(true)} style={{ background:"none",
border:"none", color: C.rose, fontSize:12, cursor:"pointer", fontFamily: FB, fontWeight:600 }}>
>               Nao tem conta? Cadastre seu salao gratis
              </button>"""

# Busca pelo trecho real sem o prefixo >
old_btn2 = 'border:"none", color: C.rose, fontSize:12, cursor:"pointer", fontFamily: FB, fontWeight:600 }}>\n>               Nao tem conta? Cadastre seu salao gratis'

import re
pattern = r'<button onClick=\{.*?setShowRegister\(true\).*?\}.*?style=\{\{.*?fontSize:12.*?\}\}>\s*\n\s*>?\s*Nao tem conta\? Cadastre seu salao gratis\s*\n\s*</button>'
new_btn = '''<button onClick={() => setShowRegister(true)} style={{ background:"linear-gradient(135deg, #c9a96e22, #c9847a22)", border:"1.5px solid #c9a96e", color: C.rose, fontSize:13, cursor:"pointer", fontFamily: FB, fontWeight:700, padding:"10px 20px", borderRadius:10, marginTop:4, width:"100%", letterSpacing:"0.03em" }}>
                ? Nao tem conta? Cadastre seu salao gratis
              </button>'''

result = re.sub(pattern, new_btn, content, flags=re.DOTALL)
if result != content:
    content = result
    changes += 1
    print("OK 2/2 - botao de cadastro destacado!")
else:
    print("ERRO 2/2 - botao nao encontrado via regex")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print(f"Concluido - {changes}/2 alteracoes aplicadas.")
