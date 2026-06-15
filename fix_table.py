path = r'C:\projetos\beautytech-v2\frontend\src\App.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old = '      <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>\n        <thead>\n          <tr style={{ background: C.surface }}>\n            {cols.map((c: any) => <th key={c.key} style={{ padding:"10px 16px", textAlign:"left", color: C.textMuted, fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.07em", fontFamily: FB }}>{c.label}</th>)}'
new = '      <table style={{ width:"100%", borderCollapse:"collapse", fontSize:15 }}>\n        <thead>\n          <tr style={{ background: C.surface }}>\n            {cols.map((c: any) => <th key={c.key} style={{ padding:"14px 16px", textAlign:"left", color: C.text, fontSize:13, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.07em", fontFamily: FB }}>{c.label}</th>)}'

if old in content:
    content = content.replace(old, new)
    print('OK - tabela aumentada')
else:
    print('ATENCAO - nao encontrado')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
