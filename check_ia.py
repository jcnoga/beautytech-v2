path = r'C:\projetos\beautytech-v2\frontend\src\App.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()
print('IA grupo:', 'SIM' if 'Inteligencia Artificial' in content else 'NAO')
print('ai_monthly:', 'SIM' if 'ai_monthly_budget_brl' in content else 'NAO')
idx = content.find('Inteligencia Artificial')
if idx >= 0:
    print(repr(content[idx:idx+200]))
