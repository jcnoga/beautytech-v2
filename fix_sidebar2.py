content = open('C:/projetos/beautytech-v2/frontend/src/App.tsx', encoding='utf-8').read()

old = "        {MENU.map(m => {\n          const active = page === m.id;\n          return (\n            <button key={m.id} onClick={() => setPage(m.id)}\n              style={{ width:\"100%\", display:\"flex\", alignItems:\"center\", gap:10, padding:\"9px 14px\", borderRadius:10, border:\"none\", background: active ? `${C.rose}12` : \"transparent\", color: active ? C.rose : C.textMuted, fontSize:13, fontWeight: active ? 600 : 400, cursor:\"pointer\", marginBottom:2, transition:\"all .15s\", fontFamily: FB, textAlign:\"left\" }}>\n              <span style={{ fontSize:16, color: active ? C.rose : C.textMuted, opacity: active ? 1 : 0.5 }}>{m.icon}</span>\n              {m.label}\n              {active && <div style={{ marginLeft:\"auto\", width:4, height:4, borderRadius:\"50%\", background: C.rose }} />}\n            </button>\n          );\n        })}"

new = """        {MENU.map(m => {
          const active = page === m.id;
          const locked = isFree && m.premium;
          return (
            <button key={m.id} onClick={() => { if (locked) { alert("Este recurso esta disponivel apenas no Plano Profissional. Faca upgrade para continuar."); return; } setPage(m.id); }}
              style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"9px 14px", borderRadius:10, border:"none", background: active ? `${C.rose}12` : "transparent", color: active ? C.rose : locked ? C.textMuted : C.textMuted, fontSize:13, fontWeight: active ? 600 : 400, cursor: locked ? "not-allowed" : "pointer", marginBottom:2, transition:"all .15s", fontFamily: FB, textAlign:"left", opacity: locked ? 0.5 : 1 }}>
              <span style={{ fontSize:16, color: active ? C.rose : C.textMuted, opacity: active ? 1 : 0.5 }}>{m.icon}</span>
              {m.label}
              {locked && <span style={{ marginLeft:"auto", fontSize:10 }}>?</span>}
              {active && !locked && <div style={{ marginLeft:"auto", width:4, height:4, borderRadius:"50%", background: C.rose }} />}
            </button>
          );
        })}"""

if old in content:
    open('C:/projetos/beautytech-v2/frontend/src/App.tsx', 'w', encoding='utf-8').write(content.replace(old, new, 1))
    print('CORRIGIDO')
else:
    print('TRECHO NAO ENCONTRADO')
