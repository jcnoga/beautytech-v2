path = r'C:\projetos\beautytech-v2\frontend\src\DiscoveryPage.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old = '\\uD83D\\uDCCD {[t.addressStreet, t.addressCity, t.addressState].filter(Boolean).join(", ")}'
new = '\U0001F4CD {[t.addressStreet, t.addressCity, t.addressState].filter(Boolean).join(", ")}'

if old in content:
    content = content.replace(old, new)
    print('OK - emoji corrigido')
else:
    print('ATENCAO - nao encontrado')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
