with open("frontend/src/App.tsx", "r", encoding="utf-8") as f:
    content = f.read()

old = '''          <div style={{ textAlign:"center", marginTop:16 }}>
            <button onClick={() => setShowRegister(true)} style={{ backg'''

new = '''          <div style={{ textAlign:"center", marginTop:8 }}>
            <button onClick={() => setShowForgot(true)} style={{ background:"none", border:"none", color: C.textMuted, fontSize:13, cursor:"pointer" }}>
              Esqueci minha senha
            </button>
          </div>
          <div style={{ textAlign:"center", marginTop:16 }}>
            <button onClick={() => setShowRegister(true)} style={{ backg'''

content = content.replace(old, new, 1)

with open("frontend/src/App.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("OK" if "Esqueci minha senha" in content else "ERRO")
