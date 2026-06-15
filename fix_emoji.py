path = r'C:\projetos\beautytech-v2\frontend\src\DiscoveryPage.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()
idx = content.find('uD83D')
if idx < 0:
    idx = content.find('address')
print(repr(content[idx-50:idx+300]))
