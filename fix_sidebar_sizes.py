path = r'C:\projetos\beautytech-v2\frontend\src\App.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Topo - nome do salao
old1 = '<div style={{ fontSize:17, fontWeight:700, color:C.text, fontFamily:FD, marginBottom:2 }}>{tenantInfo?.name ?? "ZenSalon"}</div>\n        <div style={{ fontSize:10, color:C.rose, textTransform:"uppercase", letterSpacing:"0.15em", opacity:0.8 }}>'
new1 = '<div style={{ fontSize:20, fontWeight:700, color:C.text, fontFamily:FD, marginBottom:4 }}>{tenantInfo?.name ?? "ZenSalon"}</div>\n        <div style={{ fontSize:13, color:C.rose, textTransform:"uppercase", letterSpacing:"0.15em", opacity:0.8 }}>'

if old1 in content:
    content = content.replace(old1, new1)
    print('OK - nome salao aumentado')
else:
    print('ATENCAO - nome salao nao encontrado')

# Rodape - email e Sair
old2 = 'color:C.textMuted, marginBottom:4, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{user?.email}</div>\n        <button onClick={onLogout} style={{ background:"none", border:"none", color:C.ruby, fontSize:12, cursor:"pointer", padding:0, fontFamily:FB }}>Sair</button>'
new2 = 'color:C.textMuted, marginBottom:6, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", fontSize:13 }}>{user?.email}</div>\n        <button onClick={onLogout} style={{ background:"none", border:"none", color:C.ruby, fontSize:14, cursor:"pointer", padding:0, fontFamily:FB }}>Sair</button>'

if old2 in content:
    content = content.replace(old2, new2)
    print('OK - rodape aumentado')
else:
    print('ATENCAO - rodape nao encontrado')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
