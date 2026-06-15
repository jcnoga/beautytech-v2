path = r'C:\projetos\beautytech-v2\frontend\src\App.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# KpiCard - aumenta fontes
old = '      <div style={{ fontSize:26, marginBottom:6 }}>{icon}</div>\n      <div style={{ fontSize:12, color: C.textMuted, marginBottom:4, fontFamily: FB, letterSpacing:"0.06em", textTransform:"uppercase" }}>{label}</div>'
new = '      <div style={{ fontSize:32, marginBottom:8 }}>{icon}</div>\n      <div style={{ fontSize:14, color: C.textMuted, marginBottom:6, fontFamily: FB, letterSpacing:"0.06em", textTransform:"uppercase" }}>{label}</div>'

if old in content:
    content = content.replace(old, new)
    print('OK - KpiCard labels aumentados')
else:
    print('ATENCAO - KpiCard nao encontrado')

# Labels dos campos de configuracao - aumenta fonte
old2 = '                <div style={{ flex:1, fontSize:12, color:C.textMuted, fontFamily:FB }}>{labels[key] ?? key}</div>'
new2 = '                <div style={{ flex:1, fontSize:14, color:C.text, fontFamily:FB }}>{labels[key] ?? key}</div>'

if old2 in content:
    content = content.replace(old2, new2)
    print('OK - labels configuracoes aumentados')
else:
    print('ATENCAO - labels configuracoes nao encontrado')

# Titulo dos grupos - aumenta fonte
old3 = '          <div style={{ fontSize:13, fontWeight:700, color: g.disabled ? "#888" : C.rose, marginBottom:16, fontFamily:FB }}>'
new3 = '          <div style={{ fontSize:16, fontWeight:700, color: g.disabled ? "#888" : C.rose, marginBottom:20, fontFamily:FB }}>'

if old3 in content:
    content = content.replace(old3, new3)
    print('OK - titulos grupos aumentados')
else:
    print('ATENCAO - titulos grupos nao encontrado')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
