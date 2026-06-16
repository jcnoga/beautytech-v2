content = open('frontend/src/App.tsx', 'r', encoding='latin-1').read()
old = '''    const labels: any = {
      free_max_clients: "Limite de clientes (Free)",
      free_max_appointments_month: "Limite agendamentos/mes (Free)",
      trial_days: "Dias de trial",
      whatsapp_min_interval_seconds: "Intervalo minimo entre msgs (seg)",
      whatsapp_max_interval_seconds: "Intervalo maximo entre msgs (seg)",'''
new = '''    const labels: any = {
      free_max_clients: "Limite de clientes (Free)",
      free_max_appointments_month: "Limite agendamentos/mes (Free)",
      trial_days: "Dias de trial",
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
      plan_super_max_users: "Super - Max profissionais",
      whatsapp_min_interval_seconds: "Intervalo minimo entre msgs (seg)",
      whatsapp_max_interval_seconds: "Intervalo maximo entre msgs (seg)",'''
content = content.replace(old, new)

old2 = '      { title: "Plano Gratuito", keys: ["free_max_clients","free_max_appointments_month","trial_days"] },'
new2 = '''      { title: "Plano Gratuito & Trial", keys: ["free_max_clients","free_max_appointments_month","trial_days"] },
      { title: "Plano Basico", keys: ["plan_basic_monthly","plan_basic_semiannual","plan_basic_annual","plan_basic_max_users"] },
      { title: "Plano Pro", keys: ["plan_pro_monthly","plan_pro_semiannual","plan_pro_annual","plan_pro_max_users"] },
      { title: "Plano Super", keys: ["plan_super_monthly","plan_super_semiannual","plan_super_annual","plan_super_max_users"] },'''
content = content.replace(old2, new2)
open('frontend/src/App.tsx', 'w', encoding='latin-1').write(content)
print('OK')
