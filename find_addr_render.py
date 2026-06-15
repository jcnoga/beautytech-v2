path = r'C:\projetos\beautytech-v2\frontend\src\DiscoveryPage.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()
idx = content.find('addressCity')
while idx >= 0:
    trecho = content[idx:idx+200]
    if 'jsx' in trecho.lower() or '>' in trecho or 'style' in trecho:
        print(repr(content[idx-50:idx+300]))
        print('---')
    idx = content.find('addressCity', idx+1)
