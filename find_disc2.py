path = r'C:\projetos\beautytech-v2\backend\src\modules\appointments\appointments.routes.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()
idx = content.find('public/tenants')
if idx < 0:
    idx = content.find('discovery')
print(repr(content[idx:idx+800]))
