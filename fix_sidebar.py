path = r'C:\projetos\beautytech-v2\frontend\src\App.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old = 'style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"9px 14px", borderRadius:10, border:"none", background: active ? `${C.rose}12` : "transparent", color: active ? C.rose : locked ? C.textMuted : C.textMuted, fontSize:14, fontWeight: active ? 600 : 400, cursor: locked ? "not-allowed" : "pointer", marginBottom:2, transition:"all .15s", fontFamily: FB, textAlign:"left", opacity: locked ? 0.5 : 1 }}'
new = 'style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"12px 16px", borderRadius:10, border:"none", background: active ? `${C.rose}12` : "transparent", color: active ? C.rose : locked ? C.textMuted : C.textMuted, fontSize:16, fontWeight: active ? 600 : 400, cursor: locked ? "not-allowed" : "pointer", marginBottom:4, transition:"all .15s", fontFamily: FB, textAlign:"left", opacity: locked ? 0.5 : 1 }}'

if old in content:
    content = content.replace(old, new)
    print('OK - menu aumentado')
else:
    print('ATENCAO - nao encontrado')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
