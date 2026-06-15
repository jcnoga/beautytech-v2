path = r'C:\projetos\beautytech-v2\frontend\src\DiscoveryPage.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()
idx = content.find('calcDistKm')
while idx >= 0:
    print(repr(content[idx-50:idx+200]))
    print('---')
    idx = content.find('calcDistKm', idx+1)
