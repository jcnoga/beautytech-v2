path = r'C:\projetos\beautytech-v2\backend\src\modules\all-modules.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()
idx = content.find('PLAN SETTINGS - GET ALL')
print(repr(content[idx:idx+300]))
