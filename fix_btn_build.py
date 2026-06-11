path = r"frontend\src\App.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Remove qualquer botao corrompido e substitui pela versao correta
import re
pattern = r'<button onClick=\{[^}]*setShowRegister\(true\)[^}]*\}[^>]*style=\{\{[^}]*\}\}>[^<]*</button>'
new_btn = '''<button onClick={() => setShowRegister(true)} style={{ background:"linear-gradient(135deg, #c9a96e22, #c9847a22)", border:"1.5px solid #c9a96e", color: C.rose, fontSize:13, cursor:"pointer", fontFamily: FB, fontWeight:700, padding:"10px 20px", borderRadius:10, marginTop:4, width:"100%", letterSpacing:"0.03em" }}>Nao tem conta? Cadastre seu salao gratis</button>'''

result = re.sub(pattern, new_btn, content, flags=re.DOTALL)
if result != content:
    with open(path, "w", encoding="utf-8") as f:
        f.write(result)
    print("OK botao corrigido!")
else:
    print("ERRO padrao nao encontrado - verificando linha 128...")
    lines = content.split("\n")
    for i in range(124, 134):
        print(f"{i+1}: {lines[i]}")
