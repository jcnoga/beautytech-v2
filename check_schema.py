path = r'C:\projetos\beautytech-v2\backend\src\db\schema\index.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()
idx = content.find('maxProfessionals')
print('Encontrado no schema' if idx >= 0 else 'NAO encontrado - precisa adicionar no schema')
