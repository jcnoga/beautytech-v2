content = open('frontend/src/App.tsx', 'r', encoding='latin-1').read()
old = '      plan_basic_monthly: "Basico - Preco mensal (R$)",\n      plan_basic_semiannual: "Basico - Preco semestral (R$)",\n      plan_basic_annual: "Basico - Preco anual (R$)",\n      plan_basic_max_users: "Basico - Max profissionais",\n      plan_pro_monthly: "Pro - Preco mensal (R$)",\n      plan_pro_semiannual: "Pro - Preco semestral (R$)",\n      plan_pro_annual: "Pro - Preco anual (R$)",\n      plan_pro_max_users: "Pro - Max profissionais",\n      plan_super_monthly: "Super - Preco mensal (R$)",\n      plan_super_semiannual: "Super - Preco semestral (R$)",\n      plan_super_annual: "Super - Preco anual (R$)",\n      plan_super_max_users: "Super - Max profissionais",\n      free_max_clients: "Limite de clientes (Free)",'
new = '      free_max_clients: "Limite de clientes (Free)",'
content = content.replace(old, new, 1)
open('frontend/src/App.tsx', 'w', encoding='latin-1').write(content)
print('OK count:', content.count('plan_basic_monthly:'))
