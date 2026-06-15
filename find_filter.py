path = r'C:\projetos\beautytech-v2\frontend\src\App.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()
idx = content.find('g.keys.filter')
print('filter encontrado:', idx >= 0)
idx2 = content.find('keys.filter')
print('keys.filter encontrado:', idx2 >= 0)
if idx2 >= 0:
    print(repr(content[idx2:idx2+100]))
