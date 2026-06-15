path = r'C:\projetos\beautytech-v2\backend\src\db\schema\index.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()
idx = content.find('maxClients')
print(repr(content[idx-50:idx+100]))
