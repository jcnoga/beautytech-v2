content = open('frontend/src/App.tsx', 'r', encoding='latin-1').read()
old = '    free_max_clients: "Limite de clientes (Free)",'
new = '''    free_max_clients: "Limite de clientes (Free)",
    plan_basic_monthly: "Basico - Preco mensal (R$)",
    plan_basic_semiannual: "Basico - Preco semestral (R$)",
    plan_basic_annual: "Basico - Preco anual (R$)",
    plan_basic_max_users: "Basico - Max profissionais",
    plan_pro_monthly: "Pro - Preco mensal (R$)",
    plan_pro_semiannual: "Pro - Preco semestral (R$)",
    plan_pro_annual: "Pro - Preco anual (R$)",
    plan_pro_max_users: "Pro - Max profissionais",
    plan_super_monthly: "Super - Preco mensal (R$)",
    plan_super_semiannual: "Super - Preco semestral (R$)",
    plan_super_annual: "Super - Preco anual (R$)",
    plan_super_max_users: "Super - Max profissionais",'''
content = content.replace(old, new, 1)
open('frontend/src/App.tsx', 'w', encoding='latin-1').write(content)
print('OK count:', content.count('plan_basic_monthly:'))
