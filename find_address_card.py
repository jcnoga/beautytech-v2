path = r'C:\projetos\beautytech-v2\frontend\src\DiscoveryPage.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()
idx = content.find('addressStreet')
print(repr(content[idx-100:idx+400]))
