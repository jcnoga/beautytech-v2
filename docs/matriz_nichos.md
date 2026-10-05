# Matriz de funcionalidades × nichos (ZenSalon)

Levantamento de 29/09/2026 (ramo `ramo-pilates`, após a Fase 2 do Pilates). Fonte: `config/features.ts`
(controle por nicho), as 199 rotas da API (`api-modules.ts`) e as telas do frontend.

**Classes**
- **CONTA** — da conta da empresa, vale para todos os nichos (login, assinatura, configurações…).
- **COMUM** — funcionalidade de gestão reaproveitável por qualquer nicho; cada nicho pode ter nomes próprios
  (ex.: Cliente → Aluno).
- **ESPECÍFICA** — pertence a um nicho (diz qual).

**Legenda:** ✅ liberada · 🔜 prevista (fase) · ⛔ não se aplica / proibida · ❓ não prevista (ver recomendação)
Salão = `beauty_salon`, Barbearia = `barbershop`, Estética = `aesthetics_clinic`, Pilates = `pilates`.

> Observação: nos 3 nichos atuais tudo continua liberado exatamente como antes (Fase 1, "zero regressão"),
> inclusive as funções de estética em salão e barbearia (decisão futura sua).

## 1. Conta (global)

| Funcionalidade | Onde | Classe | Salão | Barb. | Estét. | Pilates |
|---|---|---|---|---|---|---|
| Login, perfil da empresa, CPF/CNPJ | `/auth/me*`, tela de login | CONTA | ✅ | ✅ | ✅ | ✅ (Fase 1) |
| Esqueci / redefinir senha | `/auth/forgot-password`, `/reset-password` | CONTA | ✅ | ✅ | ✅ | ✅ |
| Cadastro da empresa (escolha do nicho) | `/auth/register` | CONTA | ✅ | ✅ | ✅ | ✅ (Fase 2) |
| Assinatura ZenSalon, checkout Pix/cartão, limites do plano, aviso de trial | `/billing/*`, `/plan-info`, Planos | CONTA | ✅ | ✅ | ✅ | ✅ ("Assinatura ZenSalon") |
| Configurações: identidade, contato, endereço, logo | Configurações, `/uploads` | CONTA | ✅ | ✅ | ✅ | ✅ ("Configurações do Studio") |
| Configurações: aba Landing Page (capa da página pública) | Configurações | CONTA | ✅ | ✅ | ✅ | 🔜 escondida até existir página pública (C12) |
| Equipe: convite, papéis (admin/recepção/profissional), ativar/remover | `/team*` | CONTA | ✅ | ✅ | ✅ | ✅ ("Instrutor" no lugar de "Profissional") |
| Log de ações | `/audit-logs` | CONTA | ✅ | ✅ | ✅ | ✅ |
| Ajuda / manual, temas, instalar app (PWA) | frontend | CONTA | ✅ | ✅ | ✅ | ✅ |
| Super Admin (empresas, nicho, planos, domínio próprio, prospecção) | `/super-admin/*` | plataforma | — | — | — | — (ferramenta interna, não é do tenant) |

## 2. Comuns

| Funcionalidade | Onde | Salão | Barb. | Estét. | Pilates | Nome no Pilates |
|---|---|---|---|---|---|---|
| Cadastro de clientes | Clientes, `/clients*` | ✅ | ✅ | ✅ | ✅ Fase 2 (`/pilates/students`, mesmo cadastro) | Alunos |
| Aniversariantes / clientes em risco | `/clients/birthdays`, `/clients/at-risk`, dashboard | ✅ | ✅ | ✅ | 🔜 Fase 5 (dashboard, C11) | Alunos em risco |
| Profissionais (cadastro, jornada, comissão %) | Profissionais, `/professionals*` | ✅ | ✅ | ✅ | ✅ Fase 2 (`/pilates/instructors`) | Instrutores |
| Bloqueios/folgas do profissional | `/professionals/:id/blocks` | ✅ | ✅ | ✅ | 🔜 Fase 3: trocar o instrutor de **uma** aula e cancelar pelo studio · Fase 4: férias/folga por período | Folga / férias do instrutor |
| Serviços por profissional (preço/comissão por serviço) | `/professionals/:id/services` | ✅ | ✅ | ✅ | ⛔ | — |
| Serviços e categorias | Serviços, `/services`, `/service-categories` | ✅ | ✅ | ✅ | ✅ Fase 2 (sem categorias) | Modalidades |
| Agenda / agendamentos 1:1 (check-in, concluir, falta) | Agenda, `/appointments*` | ✅ | ✅ | ✅ | ⛔ substituída por Aulas (C3) → 🔜 Fase 3 | Agenda / Aulas |
| Horários livres do profissional | `/professionals/:id/slots`, `/available` | ✅ | ✅ | ✅ | ⛔ (a grade de aulas faz esse papel) | — |
| Pacotes de sessões do cliente | Pacotes, `/packages*` | ✅ | ✅ | ✅ | ⛔ substituído por Planos/Matrículas (Fase 2) | Planos |
| Termo LGPD | botão LGPD, `/consent-forms*` | ✅ | ✅ | ✅ | ✅ Fase 2 (C8) | Termo LGPD |
| CRM / leads e conversão em cliente | CRM, `/leads*` | ✅ | ✅ | ✅ | 🔜 Fase 4 (itens 19-20, C10) | CRM / Aula experimental |
| Financeiro (lançamentos, contas, categorias, resumo) | Financeiro, `/financial*` | ✅ | ✅ | ✅ | 🔜 Fase 4 (item 22, C9) | Financeiro |
| Comissões | Comissões, `/commissions*` | ✅ | ✅ | ✅ | 🔜 Fase 4 (item 23) | Comissão de instrutor |
| Dashboard | Dashboard, `/dashboard/*` | ✅ | ✅ | ✅ | 🔜 Fase 5 (item 21, dashboard próprio) | Dashboard |
| Desempenho por profissional | Desempenho | ✅ | ✅ | ✅ | 🔜 Fase 5 (item 26, instrutores) | Relatórios |
| Relatórios PDF/Excel (clientes, financeiro, comissões) | botões nas telas | ✅ | ✅ | ✅ | 🔜 Fase 4 (financeiro/comissão) e Fase 5 (item 26) | Relatórios |
| WhatsApp: conexão, envio, resposta automática | WhatsApp, `/whatsapp/*`, `/auto-reply/*` | ✅ | ✅ | ✅ | 🔜 Fase 5 (item 24) | WhatsApp |
| Automações (lembrete 24h/2h, aniversário, reativação, pós-atendimento) e modelos | Automações, `/automations/*` | ✅ | ✅ | ✅ | 🔜 Fase 5 (itens 24-25; hoje os jobs leem `appointments`, precisam ler aulas) | Automações |
| Notificações (fila, reenviar, envio manual) | Notificações | ✅ | ✅ | ✅ | 🔜 Fase 5 (junto com WhatsApp) | Notificações |
| Campanhas | `/campaigns` (**sem tela**) | ✅ rota | ✅ rota | ✅ rota | 🔜 Fase 5 (item 25) | Marketing |
| Fidelidade: pontos, níveis, cashback | Fidelidade, `/loyalty*` | ✅ | ✅ | ✅ | ⛔ não se aplica agora (ver seção 4) | — |
| Indicações | Fidelidade, `/referrals` | ✅ | ✅ | ✅ | 🔜 Fase 5 (com Marketing, item 25) | Indicação |
| Metas | `/goals` (**sem tela**) | ✅ rota | ✅ rota | ✅ rota | ⛔ não se aplica agora (ver seção 4) | — |
| Estoque: produtos, fornecedores, movimentação | `/products`, `/suppliers`, `/stock-movements` (**sem tela**) | ✅ rota | ✅ rota | ✅ rota | ⛔ não se aplica agora (ver seção 4) | — |
| Dados de demonstração | `/demo/*` | ✅ | ✅ | ✅ | 🔜 Fase 5 (item 38, dados de Pilates) | Demonstração |
| Assistente de primeiros passos (onboarding) | tela ao entrar sem profissionais/serviços | ✅ | ✅ | ✅ | 🔜 Fase 5 (versão Pilates) | Primeiros passos |
| Página pública (vitrine: perfil, portfólio, depoimentos, promoções) | `/agendar/:slug`, `/public/tenants/:slug*` | ✅ | ✅ | ✅ | 🔜 Fase 5, só informativa (sem agendamento; C12 é futuro) | Página do studio |
| Agendamento online pelo cliente | `/agendar/:slug/booking`, `/public/appointments` | ✅ | ✅ | ✅ | ⛔ nesta implementação (C12: fase futura) | — |
| Busca pública de estabelecimentos | `/buscar`, `/public/tenants` | ✅ | ✅ | ✅ | 🔜 Fase 5 (junto com a página pública) | — |

## 3. Específicas

| Funcionalidade | Onde | Nicho | Salão | Barb. | Estét. | Pilates |
|---|---|---|---|---|---|---|
| Prontuário / anamnese clínica | botões Clínica/Anamnese, `/client-records*` | Estética | ✅ (hoje) | ✅ (hoje) | ✅ | ⛔ proibido (itens 7, 39) |
| Protocolos e sessões de tratamento | Clínica, `/protocols*`, `/protocol-sessions*` | Estética | ✅ (hoje) | ✅ (hoje) | ✅ | ⛔ |
| Fotos antes/depois | Clínica, `/appointment-photos*` | Estética | ✅ (hoje) | ✅ (hoje) | ✅ | ⛔ |
| Pacotes de tratamento | `/treatment-packages*`, `/package-sessions*` | Estética | ✅ (hoje) | ✅ (hoje) | ✅ | ⛔ |
| Perfil de cabelo / pele do cliente | campos do cliente | Salão / Estética | ✅ | ✅ | ✅ | ⛔ (não aparece na ficha do aluno) |
| Ficha do aluno (objetivo, nível, restrições declaradas…) | Alunos | Pilates | ⛔ | ⛔ | ⛔ | ✅ Fase 2 |
| Instrutor com CREF/CREFITO e login | Instrutores | Pilates | ⛔ | ⛔ | ⛔ | ✅ Fase 2 (login: Fase 3) |
| Planos (frequência × pacote) e matrículas (várias por aluno) | Planos, ficha do aluno | Pilates | ⛔ | ⛔ | ⛔ | ✅ Fase 2 |
| Modalidades | Configurações do Studio | Pilates | ⛔ | ⛔ | ⛔ | ✅ Fase 2 |
| Grade, aulas, capacidade, horário fixo, presença, créditos, reposição, pausa, regras | Agenda / Aulas | Pilates | ⛔ | ⛔ | ⛔ | 🔜 Fase 3 |
| Avaliação inicial e evolução | ficha do aluno | Pilates | ⛔ | ⛔ | ⛔ | 🔜 Fase 4 |
| Dashboard, relatórios, modelos de mensagem e demonstração do Pilates | — | Pilates | ⛔ | ⛔ | ⛔ | 🔜 Fase 5 |

## 4. Decisões sobre as COMUNS que não estavam previstas no Pilates (decididas em 29/09/2026)

| Funcionalidade | Decisão | Por quê |
|---|---|---|
| **Bloqueios/folgas do instrutor** | **Fase 3:** trocar o instrutor de uma aula (uma ocorrência) e cancelar pelo studio. **Fase 4:** férias/folga por período (várias aulas de uma vez) | Na Fase 3 resolve o dia a dia; o fluxo por período fica para depois |
| **Indicações** | **Fase 5** (junto com Marketing, item 25) | O próprio documento cita campanha de "Indicação"; é canal forte de captação em studio |
| **Fidelidade (pontos/níveis/cashback)** | **Não se aplica agora** | Em studio o vínculo é a mensalidade/plano; pontos por visita não fazem sentido e confundem com créditos de aula. Reavaliar com clientes reais |
| **Metas** | **Não se aplica agora** | Não tem tela em nenhum nicho hoje; quando ganhar tela, entra como COMUM (meta de alunos ativos/receita) para todos |
| **Estoque / produtos / fornecedores** | **Não se aplica agora** | Não tem tela em nenhum nicho; studio raramente vende produto. Se um dia ganhar tela, liberar como COMUM opcional |
| **Assistente de primeiros passos** | **Fase 5**, versão Pilates: modalidade → instrutor → plano → grade | O de salão pede profissionais/serviços; um studio novo hoje cai numa tela vazia de Alunos sem orientação |
| **Página pública do studio (vitrine)** | **Fase 5, só informativa**: perfil, modalidades, grade de horários e botão de WhatsApp, **sem** agendamento | Ajuda na captação (aula experimental via WhatsApp) sem antecipar o C12 (aluno agendar sozinho) |
| **Busca pública (`/buscar`)** | **Fase 5**, junto com a vitrine, com o filtro "Studio de Pilates" | Só faz sentido quando existir a página do studio para abrir |

## 5. Observações para as próximas fases
- As rotas de salão continuam **bloqueadas (403)** para o Pilates; cada item acima que for liberado ganha
  rota/feature própria do Pilates (como foi feito em Alunos/Instrutores) ou a feature comum passa a incluir
  `pilates`, sempre com teste de isolamento.
- Automações, lembretes e notificações hoje dependem de `appointments`; para o Pilates precisarão ler as
  aulas da Fase 3 (por isso ficam na Fase 5, depois das aulas existirem).
- Funções de estética liberadas hoje em salão/barbearia: decisão pendente sua (sem pressa).
