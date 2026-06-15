path = r'C:\projetos\beautytech-v2\frontend\src\DiscoveryPage.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()
idx = content.find('userCoords')
while idx >= 0:
    print(repr(content[idx:idx+150]))
    print('---')
    idx = content.find('userCoords', idx+1)
    if idx > 0 and content.count('userCoords', 0, idx) > 8:
        break
