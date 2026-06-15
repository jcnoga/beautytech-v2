path = r'C:\projetos\beautytech-v2\frontend\src\App.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old = 'opacity: g.disabled ? 0.5 : 1'
new = 'opacity: g.disabled ? 0.75 : 1'

if old in content:
    content = content.replace(old, new)
    print('OK')
else:
    print('ATENCAO')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
