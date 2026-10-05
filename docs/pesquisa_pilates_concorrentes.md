# Pesquisa — sistemas de gestão para studio de Pilates (03/10/2026)

Objetivo: escolher as melhores funcionalidades para o ZenSalon Pilates **sem deixar o app pesado**.
Usar como base do plano da Fase 4 (quando o limite semanal renovar).

## Regra de ouro do usuário para as telas
- **Simples, prático e funcional.** Nada de tela cheia.
- **Letra grande** (nada de caracteres pequenos). Botões grandes, fáceis de tocar no celular.
- Uma tarefa por tela; o resto fica escondido em "Mais opções" ou no "?".
- Tudo que o instrutor faz no dia a dia (presença, remarcar aluno) tem que funcionar **bem no celular**.

## Concorrentes

### Brasil
| Sistema | Destaques | Preço |
|---|---|---|
| **Next Fit** | App do aluno (agenda aulas, vê resultados), avaliação física com gráficos, linha do tempo de evolução, cobrança automática de atrasados ("assistente financeiro 24h"), Wellhub e TotalPass na agenda, site de vendas grátis, 70+ relatórios | ~R$ 170 a 300/mês por faixa de alunos |
| **Tecnofit Studio** | App do aluno (reserva vaga, paga), integração com catraca e Gympass, relatórios | ~R$ 2 a 3,40 por aluno/mês |
| **Seufisio** | Aluno **remarca sozinho pelo app** dentro da grade, check-in pelo app com aviso de falta, cobrança automática de mensalidade, prontuário com evolução, mensagens prontas no WhatsApp | R$ 129 a 329/mês (por nº de profissionais) |
| **PilTech** | Venda online, cobrança pelo WhatsApp, relatórios | não divulgado |
| **Software Pilates** | Check-in facial, Pix e cartão, Wellhub, prontuário | teste com 5 alunos |

### Exterior
| Sistema | Destaques |
|---|---|
| **Momence** | Reserva por aparelho (reformer, cadillac, chair), **lista de espera automática** que preenche a vaga sozinha |
| **OfferingTree** | Reserva por aparelho + lista de espera + planos; app com a marca do studio; US$ 26 a 225/mês |
| **Mindbody, Glofox, WellnessLiving** | Completos, mas caros e com curva de aprendizado alta |

## Modelo: Seufisio (site público lido em 03/10/2026)
Fontes: página inicial, /funcionalidades, /planos-e-precos, /faq, /depoimentos e o blog. O interior do sistema não foi visto
(exige login; o teste grátis de 7 dias exige cadastro com a equipe deles).

**Posicionamento:** Pilates, fisioterapia e estética; **alunos ilimitados em todos os planos**; o preço sobe pelo
**número de profissionais**. Site em BR e PT. Treinamento por vídeos e acompanhamento da equipe nos 7 dias grátis.

**Planos (por mês):** Unique (1 profissional) R$ 154 · Double (2) R$ 209 · Team (4) R$ 259 · Full (ilimitado) R$ 329.
Desconto de 8% no semestral e de 16% no anual (R$ 129 / 175 / 217 / 276).
- Todos: prontuário e avaliações, CRM de vendas (funil), app do aluno, cobrança automática, Wellhub + TotalPass,
  contas a pagar e receber, avisos por SMS e e-mail, contratos, logins ilimitados, 1 GB de arquivos.
- Team: + CRM com tarefas e lembretes, check-in facial, 4 GB.
- Full: + nota fiscal (NFSe), site grátis, catraca física, 5 GB.

### Funcionalidades do Seufisio × ZenSalon Pilates
| Seufisio | ZenSalon hoje | Observação |
|---|---|---|
| Cadastro do aluno com observações, imagens e fichas | ✅ ficha (sem imagens) | Anexos ficam com a avaliação (Fase 4) |
| **App do aluno**: confirmar presença, avisar falta, **remarcar** em horário livre, receber avisos | ❌ | Prioridade 1 (portal do aluno) |
| **Cobrança automática** por boleto, cartão ou link | ❌ (Asaas só na assinatura do salão) | Prioridade 1 (+ Pix Automático, que eles não citam) |
| Avaliações e **prontuário de evolução** personalizáveis | ❌ | Fase 4; deixar o dono montar os campos da ficha |
| Arquivos, exames e imagens na nuvem (1 a 5 GB) | ❌ | Fase 4, junto da avaliação |
| Controle financeiro, contas a pagar e receber | ✅ no salão (Financeiro) | Liberar ou adaptar para o Pilates |
| Agendamento online pelo cliente | ✅ no salão, ❌ nas turmas | Portal do aluno |
| Comanda (vários serviços, uma cobrança) | ✅ no salão | Não é para o Pilates |
| **Wellhub (booking + check-in automático)** e **TotalPass** | ❌ | Prioridade 3; depende de credenciamento |
| Check-in simples | ✅ presença lançada pelo instrutor | Melhorar: um toque no nome do aluno |
| Check-in facial / catraca | ❌ | Não fazer agora |
| CRM de vendas (funil, tarefas, lembretes) | ❌ | Versão simples: lista "interessados → experimental → matriculado" |
| Avisos por SMS, e-mail e **mensagens prontas no WhatsApp** | WhatsApp no salão | Fase 5 |
| **Contratos personalizados** | ❌ (só o aceite LGPD) | Modelo de contrato com os dados da matrícula, em PDF |
| Nota fiscal (NFSe) | ❌ | Mais adiante |
| Site grátis | ✅ página pública do salão | Fase 5 para o Pilates |
| Lembretes que reduzem falta; relatório de ocupação | Parcial | Fase 5 (painel + WhatsApp) |
| Planos mensais e longos; controle de pacotes | ✅ | — |

**Onde já estamos à frente do Seufisio** (pelo que o site mostra): regras detalhadas de cancelamento, falta, reposição
e pausa por plano; grade semanal com horário fixo e controle de vaga; histórico do aluno com o motivo e a regra aplicada.

**O que os clientes deles mais elogiam:** o aluno remarcar e fazer check-in sozinho, o financeiro organizado,
o prontuário com evolução, a facilidade de uso e o suporte rápido.

**Lições para copiar:**
1. Cobrar por **número de instrutores**, com **alunos ilimitados**: simples de entender.
2. O app do aluno com só 3 ações (**confirmar, avisar falta, remarcar**) é o recurso mais elogiado.
3. **Mensagens prontas no WhatsApp** (um toque abre a conversa com o texto pronto) já resolvem muito antes de automatizar tudo.
4. Teste grátis acompanhado + vídeos curtos por função (temos o "?" e o manual; vídeos podem vir depois).

## O que os donos de studio reclamam (oportunidade para nós)
- Sistemas **complicados demais** para studio pequeno, cheios de funções que ninguém usa.
- **Custo total alto** (mensalidade + taxas + módulos extras).
- Reclamação no Reclame Aqui sobre o Tecnofit: tarefas simples (trocar horário do aluno, ver a aula) **só funcionam bem no computador**, não no celular; cálculo de comissão errado.
- Funcionários demoram a aprender.

=> **Nosso diferencial: simples, barato, feito para o celular, em português claro.**

## O que é padrão no mercado e o ZenSalon Pilates já tem
Planos por frequência e pacotes · grade semanal que gera as aulas · horário fixo com controle de vaga · regras de cancelamento, falta, reposição e pausa · presença · histórico · ficha com restrições · aula experimental/avulsa · termo LGPD.

## Funcionalidades a adicionar — prioridade sugerida

### Prioridade 1 (todo concorrente forte tem)
1. **Cobrança recorrente automática** pelo Asaas (já integrado no salão).
   - **Pix Automático**: o aluno autoriza uma vez e paga todo mês sozinho. Na API do Asaas: `paymentCreationMode: SUBSCRIPTION` (desde 19/05/2026). Também cartão recorrente.
   - Tela simples: "Mensalidades do mês" com 3 cores — **Pago**, **A vencer**, **Atrasado** — e um botão "Cobrar no WhatsApp".
   - Opção (desligada por padrão): bloquear agendamento de quem está atrasado.
2. **Portal do aluno** (página no celular, sem instalar app; pode ser PWA):
   - Ver as próximas aulas e os créditos/reposições que tem.
   - **Desmarcar** (respeitando o prazo das regras) e **marcar reposição** numa turma com vaga.
   - Pagar a mensalidade (link do Pix).
   - Telas com no máximo 3 a 4 botões grandes.
3. **Lista de espera** na turma lotada: quando alguém desmarca, o primeiro da fila é avisado (WhatsApp) e a vaga fica reservada por X horas.
4. **Lembretes no WhatsApp** (Fase 5): aula de amanhã, mensalidade vencendo, aniversário, aluno sumido há 2 semanas.

### Prioridade 2 (diferencia, já previsto nas fases)
5. **Avaliação física e evolução** (Fase 4): poucos campos por vez, gráfico simples, foto opcional.
6. **Comissão do instrutor** (Fase 4): por aula dada ou % — conferir o cálculo com testes (é reclamação real de concorrente).
7. **Check-in rápido**: na tela "Hoje", o instrutor toca no nome do aluno = presente.
8. **Painel do dono** (Fase 5): só 4 números grandes — alunos ativos, vagas livres na semana, a receber, atrasados.
8b. **Funil simples de interessados** (inspirado no CRM do Seufisio): Interessado → Fez experimental → Matriculado, com "chamar no WhatsApp".
8c. **Contrato da matrícula em PDF** gerado com os dados do aluno e do plano (o Seufisio tem em todos os planos).

### Prioridade 3 (mais adiante)
9. **Wellhub e TotalPass** — muito pedido no Brasil; depende de parceria/credenciamento deles.
10. **Reserva por aparelho** (reformer, cadillac, chair) — útil para studio com aparelhos diferentes na mesma turma.
11. Contrato com assinatura digital.
12. Página pública com venda do plano e da aula experimental (Fase 5).

### Não fazer agora (pesa e quase ninguém usa em studio pequeno)
Catraca/reconhecimento facial, biblioteca de vídeos, IA de treino, marketplace, 70 relatórios.

## Também já pedido pelo usuário
- Caixas de dia nos Horários fixos da matrícula (`EnrollmentSlots.tsx`): marcar vários horários de uma vez.
- Terminar o "?" de ajuda nas telas que faltam (Instrutores, Grade, Agenda, Aula, Modalidades, Regras).

## Fontes
- Next Fit: https://nextfit.com.br/sistema-para-estudio-pilates/
- Tecnofit Studio: https://www.tecnofit.com.br/tipos-de-negocio/studios/
- Seufisio: https://www.seufisio.com/ · https://www.seufisio.com/funcionalidades · https://www.seufisio.com/planos-e-precos · https://www.seufisio.com/faq · https://www.seufisio.com/depoimentos
- Top 5 Brasil (GV8): https://blog.gv8.com.br/destaque-dicas-digitais/top-5-melhores-softwares-para-studios-de-pilates-no-brasil/
- Comparativo Pacto: https://blog.sistemapacto.com.br/melhores-sistemas-para-academias/
- OfferingTree: https://www.offeringtree.com/blog/best-pilates-studio-software/
- Time2book: https://www.time2book.me/blog/best-pilates-software
- Reclame Aqui (Tecnofit/Pilates): https://www.reclameaqui.com.br/tecnofit/nao-serve-para-studios-de-pilates_dS8cLwkCNwDuXCNl/
- Asaas Pix Automático: https://docs.asaas.com/docs/pix-automatico e https://docs.asaas.com/changelog/pix-autom%C3%A1tico-cobran%C3%A7as-recorrentes-automatizadas
