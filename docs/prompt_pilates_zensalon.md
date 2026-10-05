NICHO PILATES NO ZENSALON — PROMPT DE EXECUÇÃO EM FASES

Você vai implementar o nicho Pilates no ZenSalon (repo beautytech-v2), seguindo a ESPECIFICAÇÃO (parte B) e o ADENDO DO ESPECIALISTA (parte C) abaixo. Onde o adendo detalha ou complementa a especificação, vale o adendo.

═══════════════════════════════════════
PARTE A — COMO EXECUTAR (obrigatório)
═══════════════════════════════════════

A1. Ramo git
- git checkout vps && git pull && git checkout -b ramo-pilates
- Todo o trabalho fica no ramo ramo-pilates.
- NÃO fazer merge no vps nem no main. NÃO publicar na VPS. NÃO reiniciar containers. NÃO rodar migrations no banco de produção.
- O ZenSalon está em semana de acompanhamento na VPS até ~06/10. Deploy só na Fase 6, com minha autorização explícita.

A2. Uma fase por vez
- Execute UMA fase por vez, na ordem abaixo.
- No início de cada fase: mostre o PLANO (tabelas/colunas novas, migrations, rotas, telas, o que muda no que já existe, testes) e ESPERE eu aprovar.
- No fim de cada fase: testes passando, commit no ramo-pilates, push só do ramo-pilates, e um resumo curto em português do que foi feito e do que falta.
- Se faltar regra de negócio, PERGUNTE. Não invente funcionalidade.

A3. Padrões técnicos
- tenant_id em toda tabela nova; todo acesso filtrado por tenant; FK para tabelas do tenant sempre conferindo o mesmo tenant.
- Validação de entrada com DTO (lista explícita de campos). Nunca gravar req.body direto.
- Migrations em SQL numeradas no padrão já usado no repo. Nunca drizzle-kit push.
- Datas gravadas em UTC; "hoje", "semana" e lembretes calculados em America/Sao_Paulo.
- Textos da interface em português; código e nomes de tabela em inglês.
- Não adicionar dependência nova sem me perguntar.
- Toda fase termina com teste de isolamento entre tenants e entre nichos.

A4. As fases
FASE 0 — Diagnóstico (SÓ LEITURA, nenhuma alteração)
  Faça o levantamento do item 40 da especificação e me entregue um relatório: o que já existe e será reaproveitado (clientes, profissionais, agenda/appointments, pacotes/package-sessions, financeiro, comissões, leads, automações, message-templates, dashboard, super admin, demo/seed), o que falta, e os riscos. Diga também como o frontend navega entre telas (há router ou não) e como isso afeta o "bloqueio por URL".

FASE 1 — Mecanismo de nichos (sem nada de Pilates ainda)
  - Coluna business_type no tenant (valores estáveis: salao, barbearia, estetica, pilates). Todos os tenants existentes recebem 'salao' (ou o valor que já estiver configurado, se houver).
  - Registro central de features (um único arquivo compartilhado de verdade para backend e frontend, ou dois espelhados com teste que garanta que são iguais), cada feature com a lista explícita de nichos.
  - Nesta fase, TODAS as funcionalidades atuais ficam liberadas para salao, barbearia e estetica exatamente como hoje (zero regressão). Pilates ainda não recebe nenhuma.
  - Guard de backend (por feature) nas rotas + guard de frontend (menu, telas, componentes).
  - Nicho escolhido no cadastro da empresa e editável só pelo Super Admin.
  - Testes: tenant de cada nicho; acesso direto à API de feature não permitida retorna 403.

FASE 2 — Base do Pilates
  Itens 3, 4, 5, 6, 7, 16, 27 (parte de configurações gerais), 37 da especificação + C1, C2, C8 do adendo.
  (menu, nomenclatura Aluno/Instrutor/Aula/Plano, campos do aluno, instrutores, planos de Pilates, nicho no Super Admin)

FASE 3 — Aulas (o coração do Pilates)
  Itens 8, 9, 10, 12, 13, 14, 15 da especificação + C3, C4, C5, C6, C7 do adendo.
  (grade semanal, ocorrências, capacidade sem overbooking, matrícula em horário fixo, presença rápida no celular, créditos, cancelamento, reposição, pausa de plano)

FASE 4 — Aluno e negócio
  Itens 17, 18, 19, 20, 22, 23 da especificação + C9, C10 do adendo.
  (avaliação inicial, evolução, aula experimental no CRM atual, segmentações, mensalidade no financeiro atual, comissão de instrutor)

FASE 5 — Visão e comunicação
  Itens 21, 24, 25, 26, 38 da especificação.
  (dashboard Pilates, modelos de WhatsApp, marketing, relatórios, dados de demonstração)

FASE 6 — Regressão e publicação (só com minha autorização, depois de ~06/10)
  Itens 41 a 46 da especificação. Checklist completo dos 4 nichos. Só então: merge ramo-pilates → vps, backup do banco, migrations na VPS, rebuild, conferência.

Comece pela FASE 0 e pare ao entregar o relatório.

═══════════════════════════════════════
PARTE B — ESPECIFICAÇÃO FUNCIONAL
═══════════════════════════════════════

IMPLEMENTAÇÃO COMPLETA DO NICHO PILATES NO ZENSALON
OBJETIVO
Adicionar Academia de Pilates como um novo nicho do ZenSalon.
O ZenSalon deverá passar a atender:
    • Salão de beleza
    • Barbearia
    • Clínica de estética
    • Academia de Pilates
A implementação deve aproveitar a arquitetura, banco de dados, autenticação, multiempresa, agenda, CRM, financeiro, equipe, WhatsApp, pagamentos, relatórios e demais recursos já existentes.
NÃO criar um sistema separado para Pilates.
NÃO duplicar funcionalidades que já existem.
NÃO quebrar ou alterar o funcionamento dos nichos existentes.

1. REGRA MAIS IMPORTANTE: ISOLAMENTO TOTAL POR NICHO
Esta é uma regra arquitetural obrigatória.
Cada empresa possui um nicho.
O nicho deve determinar quais:
    • menus;
    • páginas;
    • telas;
    • abas;
    • campos;
    • botões;
    • cards;
    • filtros;
    • relatórios;
    • dashboards;
    • configurações;
    • automações;
    • ações;
    • nomenclaturas;
    • funcionalidades;
podem ser exibidos.
REGRA
Se uma funcionalidade pertence exclusivamente a determinado nicho, ela NÃO pode aparecer em nenhum outro nicho.
Não basta esconder o item do menu.
Também deve ser impedido:
    • acesso pela URL;
    • acesso por chamada de API;
    • execução de ação;
    • exibição em dashboard;
    • exibição em configurações;
    • exibição em modal;
    • exibição em dropdown;
    • exibição em relatórios.
A validação deve existir no frontend e no backend.

2. ARQUITETURA DE FEATURES POR NICHO
Criar ou adaptar uma camada centralizada de controle de funcionalidades.
Conceitualmente:
tenant
  ↓
business_type
  ↓
features permitidas
  ↓
menus
telas
componentes
ações
relatórios
automações
Cada funcionalidade específica deve declarar explicitamente os nichos permitidos.
Exemplo:
feature: pilates_aulas
allowed_business_types:
  - pilates
Outra:
feature: agenda
allowed_business_types:
  - salao
  - barbearia
  - estetica
  - pilates
Não presumir que uma funcionalidade é global.

3. CRIAÇÃO DO NICHO
Adicionar:
Pilates
ao cadastro/configuração do estabelecimento.
Internamente utilizar um identificador estável, por exemplo:
pilates
Não utilizar o nome apresentado na interface como identificador.

4. EXPERIÊNCIA DO USUÁRIO
Quando uma empresa for configurada como Pilates, a interface deve parecer desenvolvida especificamente para uma academia de Pilates.
Não deve parecer:
"um sistema de salão com algumas funções de Pilates".
O usuário deve visualizar somente aquilo que faz sentido para Pilates.

5. MENU DO PILATES
Criar/adaptar o menu para:
    • Dashboard
    • Agenda
    • Alunos
    • Planos
    • Aulas
    • Instrutores
    • Avaliações
    • CRM
    • Financeiro
    • Marketing
    • WhatsApp
    • Relatórios
    • Configurações
Não mostrar funcionalidades exclusivas de salão, barbearia ou estética.

6. NOMENCLATURA
O sistema pode reutilizar internamente a entidade clientes, caso ela já exista.
Porém, para Pilates, a interface deve utilizar:
Aluno
em vez de:
Cliente
Da mesma forma:
    • Profissional → Instrutor, quando apropriado
    • Atendimento → Aula, quando apropriado
    • Serviço → Aula/Modalidade, quando apropriado
    • Pacote → Plano/Pacote de aulas, quando apropriado
Não duplicar entidades somente por causa da nomenclatura.

7. ALUNOS
Reutilizar o CRM/cadastro de clientes existente.
Adicionar, quando o nicho for Pilates:
    • objetivo;
    • nível;
    • data de início;
    • frequência;
    • status;
    • instrutor responsável;
    • observações;
    • contato de emergência;
    • data da avaliação inicial.
Status:
    • Ativo
    • Pausado
    • Inativo
    • Cancelado
Não criar campos médicos ou diagnósticos.
Não transformar o ZenSalon em prontuário médico.

8. AGENDA
Reutilizar integralmente a infraestrutura da agenda existente.
Adaptar para aulas de Pilates.
Tipos:
    • Aula individual
    • Aula em dupla
    • Aula em grupo
    • Aula experimental
    • Avaliação inicial
    • Reposição
Cada horário deve possuir:
    • data;
    • horário;
    • duração;
    • instrutor;
    • sala;
    • capacidade;
    • alunos inscritos;
    • vagas disponíveis;
    • status.

9. CAPACIDADE DAS AULAS
Cada modalidade/horário poderá possuir uma capacidade máxima.
Exemplo:
Pilates — 08:00
Instrutor: João
Capacidade: 4
Inscritos: 3
Vagas: 1
Nunca permitir matrícula acima da capacidade.
Quando não houver vaga:
Turma lotada
ou permitir lista de espera se essa funcionalidade já estiver disponível na arquitetura.
Não criar lista de espera complexa nesta primeira implementação se ela não existir.

10. MATRÍCULA DO ALUNO
Permitir associar:
Aluno
↓
Plano
↓
Modalidade
↓
Horários
Exemplo:
Maria
Plano: Pilates 2x por semana
Segunda 08:00
Quarta 08:00

11. PLANOS
Criar suporte para planos específicos de Pilates.
Exemplos:
    • Aula avulsa
    • Pilates 1x por semana
    • Pilates 2x por semana
    • Pilates 3x por semana
    • 10 aulas
    • 20 aulas
    • Plano mensal
    • Plano trimestral
    • Plano semestral
    • Aula experimental
Cada plano deve permitir:
    • nome;
    • descrição;
    • preço;
    • duração;
    • quantidade de aulas;
    • frequência;
    • validade;
    • modalidade;
    • regras de reposição;
    • status.
Não criar regras complexas que não sejam necessárias.

12. CRÉDITOS DE AULAS
Cada aluno poderá possuir créditos de aulas.
Exemplo:
Plano: 10 aulas

Contratadas: 10
Utilizadas: 6
Restantes: 4
Quando uma aula for efetivamente realizada:
aulas_restantes = aulas_restantes - 1
O sistema não deve descontar crédito simplesmente porque houve um agendamento.
O crédito deve ser consumido conforme a regra definida para a situação da aula.

13. PRESENÇA
Na agenda da aula permitir:
    • Presente
    • Falta
    • Falta justificada
    • Cancelada
    • Reposição
A presença deve ser simples e rápida, principalmente no celular.

14. REGRAS DE CANCELAMENTO
Criar configuração simples:
    • prazo mínimo para cancelamento;
    • se o crédito será devolvido;
    • se falta consome crédito;
    • se falta justificada devolve crédito;
    • se cancelamento pela academia devolve crédito.
As regras devem ser configuráveis pelo estabelecimento.
Não criar um sistema jurídico ou contratual complexo.

15. REPOSIÇÃO
Permitir marcar uma aula como:
Reposição
Uma aula cancelada conforme as regras poderá gerar direito à reposição.
A reposição deve aparecer separadamente no histórico.

16. INSTRUTORES
Reutilizar o cadastro de profissionais/equipe.
Para Pilates utilizar a nomenclatura:
Instrutores
Permitir:
    • nome;
    • contato;
    • especialidade;
    • horários de trabalho;
    • aulas;
    • alunos;
    • comissão, se aplicável;
    • status.
Reutilizar o sistema de permissões existente.

17. AVALIAÇÃO INICIAL
Adicionar:
Avaliação Inicial
Campos:
    • aluno;
    • data;
    • instrutor;
    • objetivo;
    • nível inicial;
    • observações;
    • recomendações internas do instrutor.
Não criar diagnóstico médico.
Não criar prescrição médica.

18. EVOLUÇÃO
Adicionar no aluno:
Evolução
Permitir registros cronológicos:
Data
Instrutor
Observação
Evolução
Mostrar histórico.
Não criar inteligência artificial nesta etapa.

19. AULA EXPERIMENTAL
Utilizar o CRM existente.
Fluxo:
Lead
↓
Aula experimental agendada
↓
Compareceu
↓
Interessado
↓
Matriculado
Não criar um segundo CRM.
A conversão deve transformar/aproveitar o cadastro existente.

20. CRM
Reutilizar o CRM atual.
Para Pilates, criar segmentações como:
    • Novo aluno
    • Aluno ativo
    • Aluno em risco
    • Aluno inativo
    • Plano próximo do vencimento
    • Sem aula agendada
    • Faltas frequentes
    • Aula experimental
Não mostrar segmentações específicas de salão para Pilates.

21. DASHBOARD DO PILATES
Criar dashboard específico.
Exibir:
Alunos ativos
Aulas de hoje
Aulas da semana
Ocupação das aulas
Vagas disponíveis
Faltas
Planos a vencer
Planos vencidos
Alunos em risco
Receita
Aulas realizadas
Exemplo:
87
ALUNOS ATIVOS

18
AULAS HOJE

82%
OCUPAÇÃO

7
PLANOS A VENCER

5
ALUNOS EM RISCO
Não mostrar KPIs específicos de salão, estética ou barbearia.

22. FINANCEIRO
Reutilizar o financeiro existente.
Permitir:
Aluno
↓
Plano
↓
Venda
↓
Pagamento
Registrar:
    • valor;
    • vencimento;
    • pagamento;
    • forma de pagamento;
    • situação.
Não duplicar o módulo financeiro.

23. COMISSÕES
Se o ZenSalon já possuir comissão por profissional, permitir sua utilização para instrutores.
Exemplo:
Instrutor
Plano/Aula
Percentual
Comissão
A implementação deve aproveitar o mecanismo existente.
Não criar um segundo sistema de comissões.

24. WHATSAPP
Reutilizar a infraestrutura existente.
Para Pilates preparar modelos para:
Confirmação
"Olá, {{nome}}! Sua aula de Pilates está confirmada para {{data}} às {{hora}}."
Lembrete 24h
Lembrete 2h
Aula experimental
Plano próximo do vencimento
Reativação
Aniversário
Ausência
IMPORTANTE:
Não considerar o WhatsApp automaticamente funcional apenas porque os modelos foram criados.
Respeitar a situação atual da conexão da Evolution API.
Se a instância estiver desconectada, não prometer envio.

25. MARKETING
Reutilizar campanhas e modelos de mensagem existentes.
Adicionar somente modelos relevantes para Pilates.
Exemplos:
    • Aula experimental
    • Plano vencendo
    • Reativação
    • Indicação
    • Aniversário
Não mostrar campanhas exclusivas de salão.

26. RELATÓRIOS
Adicionar relatórios específicos:
Alunos
    • ativos;
    • inativos;
    • novos;
    • cancelados.
Aulas
    • realizadas;
    • canceladas;
    • faltas;
    • ocupação.
Planos
    • ativos;
    • vencendo;
    • vencidos.
Instrutores
    • aulas;
    • alunos;
    • desempenho;
    • comissão.
Financeiro
Reutilizar os relatórios existentes.

27. CONFIGURAÇÕES DO PILATES
Adicionar configurações específicas:
Aulas
    • duração;
    • capacidade;
    • modalidades.
Presença
    • regras de falta;
    • regras de cancelamento.
Reposição
    • prazo;
    • quantidade;
    • validade.
Planos
    • validade;
    • créditos;
    • frequência.
Essas configurações somente devem aparecer para empresas do nicho Pilates.

28. FUNCIONALIDADES QUE NÃO DEVEM APARECER NO PILATES
Não mostrar funcionalidades exclusivas de:
Salão
    • corte;
    • coloração;
    • cabeleireiro;
    • serviços de cabelo;
    • comissão específica de cabeleireiro.
Barbearia
    • serviços específicos de barba;
    • corte masculino;
    • barbeiro.
Estética
    • protocolos de estética;
    • sessões de tratamento;
    • procedimentos estéticos específicos;
    • termos específicos que não sejam aplicáveis ao Pilates.
Da mesma forma, nenhuma funcionalidade específica de Pilates deve aparecer nos outros nichos.

29. REGRA PARA FUNCIONALIDADES FUTURAS
Esta regra deverá permanecer válida para todos os futuros nichos.
Exemplo futuro:
    • Pet Shop
    • Oficina
    • Academia
    • Clínica de fisioterapia
    • Outros
Ao criar qualquer funcionalidade nova, classificar:
GLOBAL
ou:
ESPECÍFICA DE NICHO
Se específica, definir explicitamente os nichos autorizados.
Nunca criar uma funcionalidade específica e deixá-la disponível globalmente por padrão.

30. FRONTEND
Toda tela deve verificar o nicho antes de renderizar funcionalidades específicas.
Não utilizar apenas:
if (user.role === ...)
quando o problema for de nicho.
Considerar:
tenant
business_type
feature
permission
A interface deve ser construída com base nas funcionalidades disponíveis para aquele tenant.

31. BACKEND
Toda API específica de Pilates deve validar:
tenant_id
business_type
feature
permission
Uma empresa de salão não pode acessar uma API exclusiva de Pilates alterando manualmente uma URL ou requisição.

32. BANCO DE DADOS
Não criar banco separado para Pilates.
Não duplicar:
    • usuários;
    • clientes;
    • equipe;
    • financeiro;
    • CRM;
    • agenda.
Reutilizar as estruturas existentes sempre que possível.
Toda informação pertencente a uma empresa deve continuar isolada por:
tenant_id

33. SEGURANÇA
Verificar:
    • autenticação;
    • autorização;
    • isolamento por tenant;
    • permissões;
    • acesso às APIs;
    • acesso às rotas;
    • RLS, caso existente;
    • exposição de dados entre empresas.
Não confiar somente no frontend.

34. RESPONSIVIDADE
Todas as funcionalidades de Pilates devem funcionar em:
    • desktop;
    • tablet;
    • celular.
A tela de presença das aulas deve ser especialmente rápida no celular.

35. PWA
O Pilates deve utilizar o mesmo PWA existente.
Não criar outro aplicativo.

36. ASSINATURA
O Pilates deve utilizar os mesmos planos de assinatura do ZenSalon.
Não criar sistema de cobrança separado.
Se houver diferenciação futura de preço por nicho, preparar a arquitetura para isso, mas não implementar cobrança diferenciada sem solicitação.

37. SUPER ADMIN
No painel do Super Admin:
Adicionar:
Nicho: Pilates
Permitir visualizar:
    • quantidade de academias Pilates;
    • status;
    • plano;
    • data de cadastro;
    • utilização.
Não alterar os recursos existentes dos demais nichos.

38. DADOS DE DEMONSTRAÇÃO
Criar dados de demonstração específicos para Pilates.
Exemplo:
Alunos
    • Maria Silva
    • João Santos
    • Ana Oliveira
    • Carlos Souza
Instrutores
    • Fernanda
    • Rafael
Planos
    • Pilates 2x por semana
    • Pilates 3x por semana
    • Aula experimental
Aulas
Criar horários realistas.
Os dados de demonstração devem aparecer somente quando o tenant de demonstração for Pilates.

39. NÃO IMPLEMENTAR NESTA FASE
Não implementar:
    • IA;
    • análise corporal por câmera;
    • reconhecimento de movimentos;
    • prescrição de exercícios;
    • diagnóstico;
    • prontuário médico;
    • integração com aparelhos;
    • catracas;
    • controle biométrico;
    • aplicativo nativo;
    • marketplace;
    • funcionalidades médicas.
Manter o Pilates como uma solução de gestão de academia de Pilates, não como sistema médico.

40. COMPATIBILIDADE COM O SISTEMA ATUAL
Antes de alterar qualquer código:
    1. identificar a arquitetura atual;
    2. identificar as entidades existentes;
    3. identificar o sistema de nichos existente;
    4. identificar o sistema de permissões;
    5. identificar a agenda;
    6. identificar o CRM;
    7. identificar planos/pacotes;
    8. identificar financeiro;
    9. identificar WhatsApp;
    10. identificar dashboards;
    11. identificar RLS/multi-tenancy.
Não recriar aquilo que já existe.
Adaptar a arquitetura atual.

41. NÃO ALTERAR O QUE JÁ FUNCIONA
Depois da implementação:
Salão
Deve continuar funcionando exatamente como antes.
Barbearia
Deve continuar funcionando exatamente como antes.
Clínica de estética
Deve continuar funcionando exatamente como antes.
Pilates
Deve possuir a nova experiência específica.

42. TESTE DE ISOLAMENTO
Testar obrigatoriamente quatro tenants:
TENANT SALÃO
TENANT BARBEARIA
TENANT ESTÉTICA
TENANT PILATES
Verificar cada um.
SALÃO
Não pode visualizar recursos exclusivos de Pilates.
BARBEARIA
Não pode visualizar recursos exclusivos de Pilates.
ESTÉTICA
Não pode visualizar recursos exclusivos de Pilates.
PILATES
Não pode visualizar recursos exclusivos de salão/barbearia/estética.

43. TESTE DE ACESSO DIRETO
Tentar acessar diretamente uma URL de funcionalidade de outro nicho.
Exemplo:
/estetica/protocolos
a partir de um tenant Pilates.
Resultado esperado:
ACESSO NEGADO
ou redirecionamento para uma página adequada.
Também testar diretamente as APIs.

44. TESTE DE DADOS
Garantir que:
Tenant A
nunca consiga visualizar:
dados do Tenant B
independentemente do nicho.

45. TESTE DE REGRESSÃO
Após a implementação:
    • testar login;
    • agenda;
    • CRM;
    • financeiro;
    • equipe;
    • pagamentos;
    • WhatsApp;
    • relatórios;
    • Super Admin;
    • PWA;
    • multiempresa.
Nenhuma funcionalidade existente pode ser quebrada.

46. CRITÉRIO FINAL DE ACEITAÇÃO
A implementação somente será considerada concluída quando:
PILATES
For possível:
    • cadastrar alunos;
    • cadastrar instrutores;
    • cadastrar planos;
    • criar aulas;
    • definir capacidade;
    • matricular alunos;
    • agendar aulas;
    • controlar presença;
    • controlar faltas;
    • controlar reposições;
    • controlar créditos;
    • acompanhar evolução;
    • realizar avaliação inicial;
    • realizar aula experimental;
    • converter lead em aluno;
    • controlar planos;
    • registrar pagamentos;
    • acompanhar indicadores;
    • utilizar CRM;
    • utilizar WhatsApp existente;
    • gerar relatórios.
E, simultaneamente:
ISOLAMENTO
Nenhuma funcionalidade exclusiva de Pilates aparece em:
    • Salão;
    • Barbearia;
    • Estética.
E nenhuma funcionalidade exclusiva desses nichos aparece no Pilates.

PRINCÍPIO ARQUITETURAL DEFINITIVO
O ZenSalon deve funcionar desta maneira:
                 ZENSALON
                     │
          ┌──────────┴──────────┐
          │                     │
     INFRAESTRUTURA          NICHO
       COMPARTILHADA           │
          │                     │
          │              ┌──────┼──────┐
          │              │      │      │
       Auth           Salão  Estética Pilates
       CRM
       Agenda
       Financeiro
       WhatsApp
       Multiempresa
       Pagamentos
          │
          └───────────┬───────────
                      │
              EXPERIÊNCIA ESPECÍFICA
Uma única plataforma por baixo.
Uma experiência específica por nicho por cima.
A regra é:
COMPARTILHAR A INFRAESTRUTURA. NÃO COMPARTILHAR A INTERFACE QUANDO A FUNCIONALIDADE NÃO PERTENCER AO NICHO.
E, principalmente:
NÃO ESCONDER APENAS. NÃO AUTORIZAR.
Toda funcionalidade específica deve ser protegida no frontend, nas rotas e no backend.


═══════════════════════════════════════
PARTE C — ADENDO DO ESPECIALISTA EM PILATES
(detalha regras da especificação; vale sobre ela onde houver diferença)
═══════════════════════════════════════

C1. Dois tipos de plano (é assim que os estúdios brasileiros vendem)
  a) PLANO POR FREQUÊNCIA (mensalidade): "Pilates 2x por semana". O aluno tem horários FIXOS na semana. Não é pacote de créditos: a regra é o limite de aulas por semana. Vigência mensal, trimestral ou semestral, com dia de vencimento.
  b) PACOTE DE AULAS (créditos): "10 aulas", "20 aulas", "Aula avulsa". Aulas contadas, com validade (ex.: 10 aulas em 60 dias). Aluno agenda em horários com vaga.
  - Aula experimental é um plano do tipo pacote com 1 aula e preço próprio (pode ser zero).
  - Cada plano tem o campo tipo = 'frequencia' | 'pacote'. A regra de consumo depende do tipo:
    frequencia → controla aulas por semana e o direito a reposição;
    pacote → desconta crédito conforme item 12 e as regras de cancelamento.

C2. Horário fixo é o padrão do mercado
  - Matrícula = aluno + plano + horários fixos da grade (ex.: seg 08:00 e qua 08:00).
  - A quantidade de horários fixos não pode passar da frequência do plano.
  - O horário fixo ocupa a vaga em TODAS as ocorrências futuras daquele horário, enquanto o plano estiver vigente.

C3. Grade semanal × aulas do dia (modelo de dados)
  - GRADE: modelo recorrente (dia da semana, hora, duração, instrutor, sala, capacidade, modalidade, ativa).
  - AULA (ocorrência): uma data específica gerada a partir da grade. Presença, falta e reposição ficam na ocorrência.
  - Gerar as ocorrências para uma janela à frente (ex.: 4 semanas), de forma idempotente (índice único tenant + grade + data). Nunca gerar infinitamente.
  - Mudança na grade afeta só as ocorrências futuras sem presença lançada.
  - Feriado ou estúdio fechado: permitir cancelar a ocorrência "pela academia" (regra do item 14 decide se devolve crédito ou gera reposição).
  - Reaproveitar a agenda/appointments existente para exibir as aulas se o diagnóstico mostrar que é viável sem distorcer o modelo; senão, tabela própria de aulas com exibição integrada na mesma tela de agenda. Decidir na Fase 3 e me explicar.

C4. Capacidade sem overbooking
  - A checagem de vaga e a inscrição devem acontecer na MESMA transação, com trava (SELECT ... FOR UPDATE na ocorrência ou equivalente). Dois cliques ao mesmo tempo não podem passar da capacidade.
  - Vagas da ocorrência = capacidade − (fixos ativos que não cancelaram) − (reposições e avulsos inscritos).
  - Vaga liberada por falta avisada/cancelamento fica disponível para reposição.
  - Capacidade por aparelho (Reformer, Cadillac, Chair) NÃO entra agora: só um número de capacidade por horário.

C5. Reposição (regras simples e configuráveis)
  - Gera direito de reposição: cancelamento dentro do prazo configurado, falta justificada (se configurado), cancelamento pela academia.
  - Configuração: prazo mínimo de aviso (horas), validade da reposição (dias), máximo de reposições por mês, se falta sem aviso gera reposição (padrão: não).
  - A reposição só pode ser marcada em ocorrência com vaga e dentro da vigência do plano.
  - Histórico do aluno mostra reposições separadas: geradas, usadas, vencidas.

C6. Pausa/congelamento de plano (muito comum: férias, viagem, lesão)
  - Aluno com status Pausado: suspende os horários fixos no período e ESTENDE a vigência do plano pelos dias pausados.
  - Configuração: máximo de dias de pausa por vigência (padrão 30).
  - Campos: data início, data fim, motivo (texto livre curto).

C7. Presença no celular
  - Tela "Aulas de hoje" → toque na aula → lista dos alunos com botões grandes: Presente / Falta / Falta justificada. Um toque por aluno, salva na hora.
  - Botão "Marcar todos presentes" com confirmação.
  - Aula passada sem presença lançada aparece como pendente no dashboard do instrutor.

C8. Cadastro e segurança do aluno (sem virar prontuário)
  - Manter a regra: nada de diagnóstico, CID, prescrição ou prontuário.
  - Adicionar um campo de texto livre "Restrições e cuidados informados pelo aluno" (ex.: "gestante", "cirurgia no joelho em 2024"). É informação que o próprio aluno declara e o instrutor PRECISA ver antes da aula; aparece em destaque na lista de presença.
  - Instrutores: campo opcional "Registro profissional" (CREF ou CREFITO), porque muitos estúdios exigem e exibem.
  - Consentimento LGPD no cadastro: reaproveitar o termo de consentimento existente se houver; senão, um checkbox com data do aceite.

C9. Mensalidade no financeiro existente
  - Plano por frequência gera o lançamento a receber do mês no financeiro atual (valor, vencimento, aluno, plano), sem duplicar o módulo.
  - Gerar só o próximo mês, de forma idempotente (não duplicar se rodar duas vezes).
  - Bloquear agendamento de inadimplente: configurável, PADRÃO DESLIGADO (muitos estúdios toleram atraso).
  - Cobrança automática (Pix/boleto via Asaas) para o ALUNO não entra agora.

C10. Aula experimental → matrícula (funil)
  - Lead existente → agenda experimental numa ocorrência com vaga → presença marcada → status "Compareceu" → "Matriculado" converte o lead no aluno (mesmo cadastro, sem duplicar).
  - Indicador no dashboard: taxa de conversão de experimental em matrícula no mês.

C11. Métricas de estúdio (para o dashboard da Fase 5)
  - Ocupação média = presenças + inscritos ÷ capacidade das ocorrências do período.
  - Horários com ocupação acima de 90% (sinal para abrir nova turma) e abaixo de 40% (candidatos a juntar).
  - Aluno em risco: 2 ou mais faltas nas últimas 4 semanas, ou sem presença há 14 dias, ou plano vencendo em até 7 dias sem renovação.

C12. Fica para uma fase futura (NÃO implementar agora)
  - Aluno agendar/remarcar reposição sozinho pelo link público.
  - Confirmação de presença pelo WhatsApp ("responda 1 para confirmar").
  - Capacidade por aparelho, lista de espera, contrato digital, cobrança recorrente automática do aluno.
