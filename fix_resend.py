content = open('C:/projetos/beautytech-v2/backend/src/modules/resend.module.ts', encoding='utf-8').read()
# Corrige encoding corrompido nos emojis e acentos
fixes = [
    ('ï¿½', 'ã'), ('Gestï¿½o', 'Gestão'), ('salï¿½es', 'salões'),
    ('Olï¿½', 'Olá'), ('Vocï¿½', 'Você'), ('estï¿½', 'está'),
    ('perï¿½odo', 'período'), ('ï¿½ plataforma', 'à plataforma'),
    ('serviï¿½os', 'serviços'), ('preï¿½os', 'preços'),
    ('automï¿½tico', 'automático'), ('Dï¿½vidas', 'Dúvidas'),
    ('Obrigado', 'Obrigado'), ('receberÃ¡', 'receberá'),
    ('?? Plano Pro ativado ï¿½', '🎉 Plano Pro ativado —'),
    ('?? Pagamento pendente ï¿½', '⚠️ Pagamento pendente —'),
    ('Bem-vindo ao BeautyTech, ${salonName}! ??', 'Bem-vindo ao BeautyTech, ${salonName}!'),
    ('? BeautyTech', '✨ BeautyTech'),
    ('?? O que vocï¿½ pode fazer agora:', '👉 O que você pode fazer agora:'),
    ('?? Pagamento pendente', '⚠️ Pagamento pendente'),
    ('Acessar meu painel ?', 'Acessar meu painel →'),
    ('Regularizar pagamento ?', 'Regularizar pagamento →'),
    ('??', '🎉'), ('?', '✨'),
]
for old, new in fixes:
    content = content.replace(old, new)
open('C:/projetos/beautytech-v2/backend/src/modules/resend.module.ts', 'w', encoding='utf-8').write(content)
print("OK - encoding corrigido")
