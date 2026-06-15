path = r'C:\projetos\beautytech-v2\frontend\src\App.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old = '      <div style={{ padding:32 }}>\n        <PageHeader title="Painel Super Admin"'
new = '      <div style={{ padding:"32px 48px 32px 32px" }}>\n        <PageHeader title="Painel Super Admin"'

if old in content:
    content = content.replace(old, new)
    print('OK - padding direito aumentado')
else:
    print('ATENCAO - nao encontrado')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
