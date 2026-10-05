# Proposta — CRM de Pilates (recebida do usuário em 03/10/2026)

Origem: conversa do usuário no claude.ai, trazida para cá em 03/10/2026. Usar junto com
`docs/pesquisa_pilates_concorrentes.md` no plano da Fase 4 em diante.

## A ideia em uma frase
"Um sistema simples para administrar alunos, aulas, planos, pagamentos e relacionamento com os alunos."
Em 30 segundos o dono responde: **quem tenho hoje, quem dá aula, quem está faltando, quem está devendo,
quem precisa renovar e quem preciso chamar de volta.**

Fluxo principal: **Lead → Aula experimental → Aluno → Matrícula → Plano → Aula → Frequência → Pagamento → Renovação → Fidelização**
Fluxos de apoio: **Falta/baixa frequência → Alerta → WhatsApp → Recuperação** · **Lead → Contato → Interesse → Experimental → Matrícula**

Princípio: adaptar o núcleo do ZenSalon e ativar só o que muda no Pilates. **Não virar sistema de clínica.**

## Os 22 itens da proposta × o que o app já tem

Legenda: ✅ já existe no Pilates · ♻️ existe no salão, falta adaptar e liberar para o Pilates · 🆕 novo · ✂️ simplificar

| # | Item da proposta | Situação | Como fazer simples |
|---|---|---|---|
| 1 | **Dashboard** (11 indicadores + alertas "Atenção") | ♻️ salão tem; Pilates na Fase 5 | ✂️ **4 números grandes** (ativos, aulas hoje, a receber, atrasados) + **lista "Atenção"** com no máx. 5 linhas, cada uma com botão de ação. O resto vai para Relatórios |
| 2 | **Alunos** (ficha, matrículas, aulas, financeiro, comunicação) | ✅ ficha, matrículas, histórico | ✂️ Ficha em **abas** (Dados · Matrículas · Aulas · Pagamentos · Mensagens). CPF, sexo, endereço, origem em "Mais dados" (opcional). Falta: foto, abas Pagamentos e Mensagens |
| 3 | **Leads** (pipeline Novo → Contatado → Interessado → Experimental → Proposta → Matriculado → Perdido) | ♻️ CRM/leads do salão (`/leads`) | ✂️ **4 etapas** só: Novo · Em conversa · Experimental · Matriculado (+ "Perdido" escondido). Campo "Próximo contato" gera alerta. Botão "Converter em aluno" |
| 4 | **Instrutores** (dados, horários, aulas, alunos, remuneração) | ✅ cadastro, foto, CREF | Falta: tela do instrutor com aulas dadas e alunos; remuneração = comissão (Fase 4) |
| 5 | **Modalidades** (nome, duração, capacidade, valor) | ✅ | Ok como está |
| 6 | **Planos** (aulas, periodicidade, valor, duração, modalidade, reposição) | ✅ frequência e pacote + regras por plano | Achado: a modalidade do plano hoje é só informativa |
| 7 | **Matrícula** como entidade própria, várias ativas por aluno | ✅ | — |
| 8 | **Agenda** dia/semana/mês; "08:00 Grupo A · Ana · 4/5"; clicar → alunos, presença, + Adicionar aluno | ✅ Agenda de aulas + painel da aula | Conferir se tem visão **mês** e o "4/5" bem visível em letra grande |
| 9 | **Turmas** (nome, modalidade, instrutor, sala, capacidade, dias, horário, alunos) | ✅ Grade semanal (um horário por linha) | Avaliar: agrupar horários com o mesmo nome ("Pilates A — seg/qua 08:00") e campo **sala** |
| 10 | **Frequência**: Presente / Falta / Cancelado / Reposição com poucos cliques | ✅ presença no painel da aula | ✂️ Um toque no nome = presente; segurar/menu = outras opções. Grava no histórico (já grava) |
| 11 | **Controle de créditos** (8 → 7 → 6…) | ✅ motor de créditos (Fase 3a) | Mostrar "**Restam 3 de 8**" grande na ficha e na busca |
| 12 | **Avaliação e evolução** simples, sem prontuário | 🆕 Fase 4 | Avaliação inicial + registros datados de evolução em texto curto; foto opcional. Prontuário clínico continua proibido no Pilates |
| 13 | **Financeiro** (contas do aluno 🟢🟡🔴⚪, receita prevista/recebida/atrasada/por plano) | ♻️ Financeiro do salão; 🆕 mensalidades | Tela "Mensalidades do mês" com as 4 cores; cobrança Asaas/Pix Automático (pesquisa) |
| 14 | **Renovação** (alerta 7 dias antes + botão "Renovar" que reaproveita plano, valor e horários) | 🆕 | Botão **Renovar** na matrícula: cria o novo período copiando plano, valor, vencimento e **horários fixos** |
| 15 | **CRM de relacionamento** (faltou 2x seguidas, matrícula vencendo, lead parado) | ♻️ "clientes em risco" do salão | Regras fixas e simples geram os itens da lista "Atenção" (item 1) |
| 16 | **WhatsApp** (confirmação, lembrete, vencimento, cobrança, ausente, lead, aniversário, renovação) | ♻️ WhatsApp e automações do salão; Fase 5 | 1º passo: botão **"Enviar WhatsApp"** com texto pronto (abre o WhatsApp). 2º passo: automático pela Evolution API |
| 17 | **Relatórios** (alunos, frequência, comercial, financeiro, retenção) | ♻️ salão; Fase 5 | ✂️ Uma tela com 5 cartões; cada um abre uma lista com Excel/PDF |
| 18 | **Pesquisa global** ("Maria" → matrícula, plano, próxima aula, faltas, vencimento) | 🆕 | Campo de busca fixo no topo; resultado em cartão com os 5 dados |
| 19 | **Permissões** (Admin, Gerente, Instrutor, Recepção) | ✅ admin / recepção / instrutor | "Gerente" não existe; avaliar se precisa (pode ser admin sem Assinatura) |
| 20 | **Automação inteligente** (detecta → alerta → WhatsApp → encerra se resolveu → novo lembrete) | 🆕 (jobs do salão leem agendamentos, não aulas) | Fase 5. Alerta some sozinho quando o aluno renova/volta |
| 21 | **Menu ideal** (Dashboard · CRM · Operação · Comercial · Financeiro · Avaliação · Relatórios · Configurações) | ✂️ comparar com o menu atual | Menu curto com grupos; no celular, barra de baixo com 4 atalhos: Hoje · Agenda · Alunos · Atenção |
| 22 | **Fluxos** (principal, recuperação, lead) | — | Guiam a ordem de construção abaixo |

## Ordem sugerida (para o plano, a aprovar)
0. **Reorganizar a ficha do aluno** (pedido do usuário em 03/10/2026: "a tela ficou muito grande"). `StudentsPage.tsx`:
   - **Abas** no topo da ficha: Dados · Matrículas · Histórico · LGPD (cada aba é uma tela curta).
   - **Aba Matrículas**: só as **ativas**, em cartões grandes (plano, período, valor, "Restam X de Y", vencimento);
     encerradas/canceladas em **"Ver anteriores (N)"**. Botões por cartão: **Horários** · **Renovar** · **Mais ▾**
     (Encerrar/Cancelar dentro do "Mais", para evitar clique por engano).
   - **Horários fixos** abrem numa janela própria (junto das caixas de dia já pedidas para `EnrollmentSlots.tsx`).
   - **"+ Nova matrícula"** vira botão que abre janela pequena (Plano, Início, Vencimento, Valor), em vez do formulário sempre aberto.
   - **Letra mínima de 14px** (hoje datas, valores e avisos estão em 12px).
   - Mais adiante: menu **"Matrículas"** com a lista geral (vencendo em 7 dias / ativas / encerradas) — complementa, não substitui a aba.
   - Achado no teste: plano chamado "Pacote 8 aulas" aparece com "Horários fixos (0 de 2 por semana)" → está cadastrado como
     **frequência 2x/semana**; o usuário vai conferir em Planos.
1. **Renovação** (botão Renovar + alerta 7 dias) e **créditos visíveis** — pequeno, muito valor.
2. **Leads** do salão adaptados ao Pilates (4 etapas, experimental, converter em aluno).
3. **Mensalidades** (4 cores) + **cobrança Asaas / Pix Automático**.
4. **Avaliação e evolução** simples.
5. **Lista "Atenção"** + **Dashboard de 4 números** + botão "Enviar WhatsApp" com texto pronto.
6. **Pesquisa global**.
7. Comissão do instrutor, relatórios, automações do WhatsApp, portal do aluno, lista de espera (ver pesquisa).

Sempre: telas simples, letra grande, bom no celular; um commit por tela; parar a cada 2 telas para o usuário testar.
