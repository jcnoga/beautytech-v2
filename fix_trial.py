path = r'C:\projetos\beautytech-v2\backend\src\config\plan-limits.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace(
    'trial:   { professionals: 3,  clients: 200   },',
    'trial:   { professionals: 2,  clients: 200   },'
)
with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('OK - trial limitado a 2 profissionais')
