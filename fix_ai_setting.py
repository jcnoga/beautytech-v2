path = r'C:\projetos\beautytech-v2\frontend\src\App.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Adiciona label
old_label = '  whatsapp_send_end_hour: "Hora fim envio WhatsApp",\n  };'
new_label = '  whatsapp_send_end_hour: "Hora fim envio WhatsApp",\n  ai_monthly_budget_brl: "Limite mensal IA por tenant (R$)",\n  };'

if old_label in content:
    content = content.replace(old_label, new_label)
    print('OK - label inserido')
else:
    print('ATENCAO - label nao encontrado')

# Adiciona grupo IA
old_group = '    { title: "Plano Gratuito",'
new_group = '    { title: "Inteligencia Artificial (em breve)", keys: ["ai_monthly_budget_brl"], disabled: true },\n    { title: "Plano Gratuito",'

if old_group in content:
    content = content.replace(old_group, new_group)
    print('OK - grupo IA inserido')
else:
    print('ATENCAO - grupo nao encontrado')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
