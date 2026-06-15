path = r'C:\projetos\beautytech-v2\frontend\src\App.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()
print('grupo IA:', 'SIM' if 'Inteligencia Artificial' in content else 'NAO')
print('ai_monthly_budget_brl label:', 'SIM' if 'ai_monthly_budget_brl' in content else 'NAO')
