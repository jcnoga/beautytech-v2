content = open('frontend/src/App.tsx', 'r', encoding='latin-1').read()
old = '    { title: "Plano Gratuito", keys: ["free_max_clients","free_max_appointments_month","trial_days"] },'
new = '''    { title: "Plano Gratuito & Trial", keys: ["free_max_clients","free_max_appointments_month","trial_days"] },
    { title: "Plano Basico", keys: ["plan_basic_monthly","plan_basic_semiannual","plan_basic_annual","plan_basic_max_users"] },
    { title: "Plano Pro", keys: ["plan_pro_monthly","plan_pro_semiannual","plan_pro_annual","plan_pro_max_users"] },
    { title: "Plano Super", keys: ["plan_super_monthly","plan_super_semiannual","plan_super_annual","plan_super_max_users"] },'''
content = content.replace(old, new)
open('frontend/src/App.tsx', 'w', encoding='latin-1').write(content)
print('replaced:', content.count('Plano Basico'))
