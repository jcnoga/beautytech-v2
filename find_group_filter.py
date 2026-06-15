path = r'C:\projetos\beautytech-v2\frontend\src\App.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()
idx = content.find('g.keys.map(key =>')
print(repr(content[idx-300:idx+100]))
