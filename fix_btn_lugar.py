path = r"frontend\src\App.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Remove o botao do lugar errado (dentro do Modal)
old_wrong = '          <button onClick={() => setShowRegister(true)} style={{ background:"linear-gradient(135deg, #c9a96e22, #c9847a22)", border:"1.5px solid #c9a96e", color: C.rose, fontSize:13, cursor:"pointer", fontFamily: FB, fontWeight:700, padding:"10px 20px", borderRadius:10, marginTop:4, width:"100%", letterSpacing:"0.03em" }}>Nao tem conta? Cadastre seu salao gratis</button>'
new_close = '          <button onClick={onClose} style={{ background:"none", border:"none", color: C.textMuted, fontSize:22, cursor:"pointer", lineHeight:1 }}>&times;</button>'

if old_wrong in content:
    content = content.replace(old_wrong, new_close)
    print("OK botao errado removido e botao fechar restaurado!")
else:
    print("ERRO trecho nao encontrado")

# Agora busca o botao correto de cadastro e destaca
old_login_btn = 'border:"none", color: C.rose, fontSize:12, cursor:"pointer", fontFamily: FB, fontWeight:600 }}>\n              Nao tem conta? Cadastre seu salao gratis\n            </button>'
new_login_btn = 'border:"1.5px solid #c9a96e", color: C.rose, fontSize:13, cursor:"pointer", fontFamily: FB, fontWeight:700, padding:"10px 20px", borderRadius:10, marginTop:4, width:"100%", background:"linear-gradient(135deg, #c9a96e22, #c9847a22)" }}>\n              ? Nao tem conta? Cadastre seu salao gratis\n            </button>'

if old_login_btn in content:
    content = content.replace(old_login_btn, new_login_btn)
    print("OK botao de cadastro destacado!")
else:
    print("INFO botao de cadastro nao encontrado - pode ja estar correto")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
print("Arquivo salvo.")
