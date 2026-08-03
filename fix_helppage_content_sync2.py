path = "frontend/src/pages/HelpPage.tsx"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

changes = 0

old_list = """              {[
                'Primeiro acesso e login',
                'Criando agendamentos',
                'Cadastro de clientes',
                'Serviços e profissionais',
                'Financeiro e cobranças',
                'WhatsApp e automações',
                'Leads e prospecção',
                'Relatórios',
                'FAQ com 30 perguntas',
                'Solução de problemas',
                'Boas práticas',
                'Treinamento em 30 min',
              ].map((item) => ("""
new_list = """              {[
                'Primeiros passos e cadastro',
                'Como o sistema é organizado',
                'Dashboard e indicadores',
                'Agenda e agendamentos',
                'Vitrine digital online',
                'Clientes, LGPD e anamnese',
                'Profissionais e comissões',
                'Serviços e pacotes',
                'Financeiro e relatórios',
                'CRM, fidelidade e WhatsApp',
                'Planos e configurações',
                'FAQ com perguntas frequentes',
              ].map((item) => ("""
if old_list in content:
    content = content.replace(old_list, new_list)
    changes += 1
    print("OK: lista de topicos atualizada")
else:
    print("AVISO: lista de topicos ainda nao encontrada")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print(f"\nTotal de mudancas aplicadas: {changes}/1")
