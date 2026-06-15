path = r'C:\projetos\beautytech-v2\frontend\src\App.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old = '                <input type="number" value={vals[key] ?? ""} onChange={e => setVals((v: any) => ({ ...v, [key]: e.target.value }))}\n                  style={{ width:80, padding:"6px 10px", borderRadius:8, border:`1px solid ${C.border}`, background:C.bg, color:C.text, fontFamily:FB, fontSize:13, textAlign:"center" }} />'
new = '                <input type="number" value={vals[key] ?? ""} onChange={e => !g.disabled && setVals((v: any) => ({ ...v, [key]: e.target.value }))}\n                  disabled={g.disabled}\n                  style={{ width:80, padding:"6px 10px", borderRadius:8, border:`1px solid ${C.border}`, background: g.disabled ? "#333" : C.bg, color: g.disabled ? "#666" : C.text, fontFamily:FB, fontSize:13, textAlign:"center", cursor: g.disabled ? "not-allowed" : "text" }} />'

if old in content:
    content = content.replace(old, new)
    print('OK - input desabilitado para grupo IA')
else:
    print('ATENCAO - trecho nao encontrado')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
