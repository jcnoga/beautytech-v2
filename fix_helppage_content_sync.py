path = "frontend/src/pages/HelpPage.tsx"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

changes = 0

# 1. Atualizar cabecalho do card (capitulos e versao)
old_header = """                <h2 className="font-semibold text-gray-800">Manual Completo do Usuário</h2>
                <p className="text-xs text-gray-500">18 capítulos · PDF · Versão 1.0</p>"""
new_header = """                <h2 className="font-semibold text-gray-800">Manual Completo do Usuário</h2>
                <p className="text-xs text-gray-500">13 capítulos · PDF · Versão 1.0</p>"""
if old_header in content:
    content = content.replace(old_header, new_header)
    changes += 1
    print("OK: cabecalho atualizado (13 capitulos)")
else:
    print("AVISO: cabecalho nao encontrado")

# 2. Atualizar a lista "O que voce encontra no manual" para bater com os capitulos reais
old_list = """                {[
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
new_list = """                {[
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
    print("AVISO: lista de topicos nao encontrada")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print(f"\nTotal de mudancas aplicadas: {changes}/2")
