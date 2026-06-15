path = r'C:\projetos\beautytech-v2\frontend\src\App.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()
idx = content.find('admin@')
if idx < 0:
    idx = content.find('onLogout')
print(repr(content[idx-100:idx+400]))
