path = r'C:\projetos\beautytech-v2\frontend\src\App.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old = '        <div key={g.title} style={{ background:C.card, borderRadius:16, padding:24, marginBottom:20, border:`1px solid ${C.border}` }}>\n          <div style={{ fontSize:13, fontWeight:700, color:C.rose, marginBottom:16, fontFamily:FB }}>{g.title}</div>'
new = '        <div key={g.title} style={{ background:C.card, borderRadius:16, padding:24, marginBottom:20, border:`1px solid ${C.border}`, opacity: g.disabled ? 0.5 : 1 }}>\n          <div style={{ fontSize:13, fontWeight:700, color: g.disabled ? "#888" : C.rose, marginBottom:16, fontFamily:FB }}>{g.title}{g.disabled ? " 🔒" : ""}</div>'

if old in content:
    content = content.replace(old, new)
    print('OK - visual cinza inserido')
else:
    print('ATENCAO - trecho nao encontrado')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
