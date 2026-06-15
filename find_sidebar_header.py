path = r'C:\projetos\beautytech-v2\frontend\src\App.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()
idx = content.find('function Sidebar')
print(repr(content[idx+1100:idx+1600]))
