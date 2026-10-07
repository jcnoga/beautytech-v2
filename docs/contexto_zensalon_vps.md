# Contexto — ZenSalon na VPS + nicho Pilates ("Aulas em turma")

Atualizado em 07/10/2026. Colar no início da próxima conversa.

## ONDE PARAMOS (07/10)
**Produção = `origin/vps` = `origin/main` = `ramo-pilates` = `cfa1373`** (deploy 07/10 ~13h51 VPS): dados de teste no
Super Admin (gerar, prévia, apagar, tela "Dados de teste..." na janela da conta) + nenhum envio externo para contatos de
teste. Sem migration nova (0011 já estava aplicada). Backup antes: `/opt/backups/diario/2026-10-07_1347` (zensalon.dump
370.663 bytes). Imagens anteriores na VPS: `zensalon-api:antes-0710` e `zensalon-web:antes-0710` (apagar depois de
1–2 dias estáveis). Testes manuais do usuário: 8 de 8 OK; conferência da produção OK.
- Regra do apagar: registro arrastado ligado a dado fora do lote bloqueia (409 LINKED_TO_REAL_DATA). **Inscrição
  cancelada de aluno real também bloqueia** (faz parte do histórico dele); só sai apagando a inscrição no banco.
- Rotina hoje: **173 testes** no backend (inclui `planos-cobranca`, que veio do `vps`), check com base **12**, build.

**Railway, Vercel e Supabase desligados (07/10, pelo usuário):**
- Railway: repositório desconectado (era o `main`), serviço offline. Vercel: repositório desconectado; domínios
  zensalon.com.br, www, beautytech.zensalon.com.br e websitelog.com.br removidos (sobrou beautytech-v2.vercel.app).
  Supabase: projeto pausado; backup do banco e dos arquivos baixado no computador do usuário.
- **`vps` juntado no `main` (07/10)**, avanço simples. **Fim da regra "não fazer push no `main`"** (nada mais faz deploy
  a partir dele). A produção continua saindo do ramo `vps`.
- **Excluir os projetos do Railway e da Vercel em ~14/10; o Supabase depois de ~29/10.**
- **`/opt/backups/zensalon/` fica guardado até o fim de 2026**: é a única cópia do Supabase na VPS (dumps do schema
  public de 28 e 29/09 + contagens: 56 tabelas, 1.758 registros, iguais às da VPS). NÃO apagar na limpeza.
- Conferido antes: DNS dos 3 nomes → VPS; nenhum `.env` da VPS, nem o site publicado, nem o banco apontam para
  Railway/Supabase/Vercel; webhooks da Evolution → zensalon.com.br.

**PRÓXIMO:** segurança da VPS (`agrolab_app`, porta 32768 do n8n, chave do Asaas), backup no R2, configurar trial/preços
do Pilates na produção, WhatsApp. Opcional: apagar `railway.toml`, `vercel.json` e o endereço reserva do Railway em
`HomePage.tsx`.

## ONDE PARAMOS (06/10, ~17h50 Brasília)
**Produção = `origin/vps` `bba92c4`** (deploy 06/10 ~17h45): mensalidades do Pilates (parcelas no Financeiro, aba
Pagamentos com "Receber", painel A receber/Atrasados), "Excluir conta" no Super Admin (prévia, nome + senha,
backup em `/opt/backups/contas` 700, transação, limpeza externa, `scripts/restaurar-conta.ts`), botão "Deletar" antigo
DESATIVADO (rota responde 410; ela apagava sem transação nem backup), datas sem hora corrigidas (Financeiro/nascimento).
- Migrations **0010 e 0011 aplicadas** no `zensalon` (backup antes: `/opt/backups/diario/2026-10-06_2043`; ensaio antes
  na estrutura da produção, ida e volta). Conferido: /health, 410 na rota antiga, prévia numa conta real sem bloqueio,
  preços/limites iguais.
- `backup-bancos.sh` agora apaga backups de contas com mais de 90 dias (cron diário, root).
- `ramo-pilates` = `bc33f38` (com push). Teste do usuário das mensalidades: OK (06/10).

**06/10 ~19h55: produção = `origin/vps` `2069d31`** — correção do `::jsonb` (plan_settings gravado como número; só a
API foi reconstruída) + `backend/scripts/consertar-plan-settings.sql` APLICADO no `zensalon` (backup antes:
`/opt/backups/diario/2026-10-06_2253`): 42 valores de texto viraram número, todas as 43 chaves são number,
`ai_monthly_budget_brl` = 0. Preços/limites/trial conferidos iguais antes e depois.

**PRÓXIMO:**
1. Dados de teste no Super Admin: commits 5 a 8 (bloqueio de envios externos → gerar → apagar → tela). Decisões
   padrão aceitas pelo usuário (ver conversa de 06/10): protegida/conta de teste, 90 dias, sem assinatura com lote ativo.
- Usuário não tem nenhuma conta pagante (06/10).

## ONDE PARAMOS (05/10, fim do dia) — retomar em 06/10
**Produção (www.zensalon.com.br) = `origin/vps` `f7e6cac`** — Pilates NO AR desde 05/10:
- Merge do `ramo-pilates` no `vps` + migrations **0003 a 0009 aplicadas no banco `zensalon`** (backup antes:
  `/opt/backups/diario/2026-10-05_1929/zensalon.dump`). Ensaio feito antes num banco descartável (já apagado).
- Também no ar: busca pública com Pilates (botão "Agendar aula experimental" → página do studio → WhatsApp),
  aba Landing Page do studio (logo + foto da landing page; sem prévia), cache do PWA corrigido no nginx
  (index/sw.js/registerSW/manifest = no-cache), Financeiro liberado para o Pilates, correção da cobrança
  semestral/anual (preço por mês × meses) e Básico pago ≠ gratuito.
- Primeira conta Pilates real: "Studio Equilibrio Pilates" (em teste, 30 dias = valor geral da produção).
- Fluxo de deploy usado: merge do `ramo-pilates` no `vps` numa worktree separada (`../beautytech-v2-merge`, com
  junctions para o node_modules — remover as junctions ANTES do `git worktree remove`), rotina, push, na VPS
  `git pull` + `build --no-cache` + `up -d --no-deps` só do que mudou; migrations com `scripts/migrar.ts` num
  container descartável (`docker run --rm ... zensalon-api`, só `POSTGRES_URL`, confere `current_database()`).

**`ramo-pilates` = `bf33780` (tudo com push; o painel `4718bd6` está SEM deploy):**
- `4718bd6` **Painel do studio** (`GET /classes/dashboard`, tela "Painel" = inicial do Pilates): Alunos ativos
  (matrícula ativa valendo hoje) e Aulas hoje (com ocupação). Testes em `tests/pilates-painel.test.ts`
  (inclui 5 chamadas simultâneas: geração de aulas idempotente pelas restrições únicas). 122 testes ok.

**PRÓXIMO (06/10): mensalidades gerando lançamento no Financeiro — plano apresentado, AGUARDA 4 decisões:**
- a) 1ª parcela vence na data de início e as demais no dia de vencimento? (sugestão: sim)
- b) Pausa continua cobrando? (sugestão: sim, sem mudança automática)
- c) Ao cancelar, parcelas atrasadas seguem como dívida? (sugestão: sim)
- d) Mudança de valor da matrícula afeta só parcelas pendentes futuras? (sugestão: sim)
- Plano: migration 0010 (financial_transactions.enrollment_id + installment_no, único por matrícula+parcela);
  gerar todas as parcelas ao matricular (frequência: 1 por mês de vigência; pacote: parcela única; valor 0: nada);
  receita pendente, categoria "Mensalidades", conta padrão; encerrar/cancelar cancela pendentes futuras;
  botão "Gerar mensalidades das matrículas ativas" (idempotente); ficha mostra parcelas + "Receber";
  depois o painel ganha "A receber" e "Atrasados". 4 commits, parar depois do 2.
- Depois: WhatsApp (o usuário reconecta a instância pelo QR e testa um envio antes de liberar para o Pilates),
  Automações, Contrato PDF. Comissões só quando um cliente pedir.

**Pendências soltas:**
- Super Admin da produção: "Dias de trial" geral = 30 (usuário quer 60) e preços do Pilates ainda não configurados.
- Backup sem cópia externa (R2 não configurado); aviso de "collation version mismatch" no Postgres da VPS.
- AgroLab: `WHATSAPP_API_URL=http://localhost:8080` não alcança a Evolution (já não funcionava antes).
- n8n: chave de API nova a criar (a antiga pode ter sumido no reset de 05/10); n8n-mcp aponta para ngrok fora do ar.
- Portas fechadas em 05/10: Evolution 8080 e n8n (agora `127.0.0.1:5678`); backups dos composes com data no nome.

## 05/10 — Preparação do merge do Pilates na produção (parte A)
- **Diferenças da produção (vinda do Railway) em relação às migrations**, achadas comparando a estrutura (só leitura):
  - `tenants.business_type` é o enum `business_type_enum` (beauty_salon, aesthetics_clinic, barbershop), sem `pilates`; nas migrations é `varchar(50)`.
  - `plan_tier` tem só free, basic, pro, super (sem `trial` e `enterprise`); conta nova nasce em `trial` → o cadastro quebraria.
  - Outras (tabelas do n8n, colunas do auto-reply) não afetam o Pilates.
- **A migration `0003_business_type_check` foi ALTERADA antes de ir para a produção (05/10)**: no início, um bloco `DO` converte `business_type` para `varchar(50)` só se ainda for enum; sem isso a comparação com `'pilates'` falharia e o deploy pararia. Nos bancos onde já é texto (local, testes) nada muda; quem já aplicou a 0003 não a roda de novo (o Drizzle compara só a data). Reversão em `migrations-down/0003...down.sql`.
- **Nova `0009_plan_tier_trial`**: `ALTER TYPE plan_tier ADD VALUE IF NOT EXISTS 'trial'` e `'enterprise'`. O Drizzle aplica todas as pendentes numa única transação; no Postgres 15 o ADD VALUE roda dentro dela, mas o valor só pode ser usado depois do COMMIT. Nenhuma migration de 0003 a 0009 usa `'trial'`/`'enterprise'` (nem em DEFAULT) e a 0009 é a última.
- **`backend/scripts/migrar.ts`**: lista as pendentes; só aplica com `ZS_CONFIRMAR_MIGRACAO=sim`.
- Simulação local da produção (enum + plan_tier sem trial): 0003 a 0009 aplicadas, contas preservadas, conta Pilates em Trial gravada.
- VPS: 30 arquivos soltos (saída de um build colado) removidos com `git clean -f` em `/opt/apps/zensalon` (05/10); `.env` intactos.

## 05/10 — Funil de interessados do Pilates (em andamento no `ramo-pilates`)
- Plano aprovado: 4 commits (backend etapas, conversão em aluno, tela, botão converter); parar depois do 4 para teste no navegador.
- Reaproveita a tabela `leads` do salão com rotas próprias `/class-leads` (feature `class_leads`, só Pilates). Etapas numa lista única: `backend/src/modules/group-classes/lead-stages.ts` (interested, trial, converted, lost).
- **Migration `0006_leads_status_text`** (`leads.status` enum → `varchar(30)`, valores preservados; reversão em `backend/src/db/migrations-down/0006_leads_status_text.down.sql`, testada):
  - **NÃO aplicar na VPS agora.** Só entra no merge do `ramo-pilates` com o `vps`, e **com backup do banco antes** (`deploy/backup-bancos.sh`).
  - Journal do Drizzle: o `vps` tem só 0000–0002; o `ramo-pilates` tem 0003–0006 (timestamps 1790700000000…1791000000000, em ordem). Sem conflito no merge enquanto o `vps` não criar migration própria; se criar, renumerar a dele para depois da 0006.
  - A VPS registrou 0000–0002 como aplicadas (`deploy/copiar-banco.sh`); no merge, o migrator aplica 0003–0006 (Pilates inteiro) de uma vez.
- **Migration `0007_tenant_limits_nullable`** (limites por nicho, 05/10): `tenants.max_clients` e `max_professionals` podem ficar vazios (= segue o plano do nicho); contas com `max_clients = 100` (padrão antigo) passam a vazio; `max_professionals` atuais não mudam (só o padrão da conta nova vira vazio). Reversão em `backend/src/db/migrations-down/0007_tenant_limits_nullable.down.sql`, testada ida e volta. **Mesma regra da 0006: NÃO aplicar na VPS antes do merge com o `vps`, e só com backup.** Timestamp 1791100000000.
- **Migration `0008_tenant_max_professionals_plan`**: `max_professionals = 1` (padrão antigo) passa a vazio = segue o plano. Reversão em `migrations-down/0008...down.sql` (rodar antes da reversão da 0007), testada ida e volta. **NÃO aplicar na VPS antes do merge, e só com backup.** Timestamp 1791200000000.
- Planos por nicho: chaves `niche.<nicho>.<plano>.<campo>` em `plan_settings`; leitura nicho → geral antigo → padrão do código em `billing/plan-limits.service.ts` (`resolvePlanSetting`). Conta nova nasce em `trial`.
- Conversão em aluno: WhatsApp já usado por cliente do tenant (só dígitos) → 409 `DUPLICATE_WHATSAPP` com id e nome; `confirmDuplicate: true` cria mesmo assim.
- Depois do funil (só leitura): ver se n8n ou outro serviço usa `IP:8080` da Evolution em vez de `https://evolution.zensalon.com.br`, e propor fechar a porta 8080 (hoje aberta em `0.0.0.0`; container `evolution-api` em `/root/evolution-v2`).

## ONDE PARAMOS (02/10, ~17h Brasília — parado com o uso semanal em 92%)
- **Duas correções prontas no `ramo-pilates`, SEM COMMIT** (aguardam o teste do usuário; não commitar antes do OK):
  1. Profissionais (`App.tsx`, `ProfessionalsPage`): `emptyForm` + `closeForm`/`openNew`; Cancelar, X, clique fora e salvar zeram o formulário; "+ Nova Profissional" abre vazio.
  2. `/auth/me` (`App.tsx`, `loadTenant`; `api/client.ts`): falha de rede, demora acima de 15 s, 5xx ou 403 mostram "Não foi possível carregar sua conta" com "Tentar de novo" e "Sair", sem menu nem telas (não assume salão); 401 volta para o login; na renovação do token, a falha mantém o nicho já conhecido. `client.ts`: corpo vazio vira "Servidor indisponível (erro N)" e o erro leva `status`.
  - Rotina já rodada: 86 testes ok, `npm run check` (base 12) ok, build ok. Este arquivo (contexto) também está sem commit.
  - **Roteiro de teste**: A) salão: Profissionais → Editar → Cancelar → "+ Nova Profissional" vazio (também pelo X e clicando fora). B) Pilates com a API parada: tela de erro, nunca o sistema de salão; "Tentar de novo" com a API parada repete a tela. C) API de volta + "Tentar de novo": abre o menu do Pilates.
  - Com A, B e C ok: commit das duas correções + contexto no `ramo-pilates` e push para `origin/ramo-pilates` (nunca `main`). Depois, levar as duas correções para o `vps` (o `vps` tem o mesmo `.catch(() => {})` no `/auth/me`) — só com aprovação.
- **Ícone de ajuda ("?") em cada campo** (o usuário autorizou continuar acima de 90%): `Field` com `help`, `HelpIcon`, `HelpBox` e `CheckField` em `group-classes/ui.tsx`. Feito, commitado e **sem push** (aguarda o teste do usuário): **Planos `fc4cfd5`**, **Alunos `c959bf8`**. Faltam: Instrutores, Grade, Agenda, Aula (`SessionPanel`), Modalidades, Regras do studio/exceções do plano (`ruleFields.ts` já tem `hint`; ajuda iria ali) e, se o usuário quiser, o salão (`Inp` do `App.tsx`, 76 campos). Achado: a **modalidade do plano é só informativa** (o backend não restringe o uso por modalidade).
- **Pedidos novos, ainda não começados** (decidir no sábado junto com o plano da Fase 4):
  - **Caixas de dia nos Horários fixos da matrícula** (`EnrollmentSlots.tsx`): trocar a lista "um horário por vez" por caixas com os horários da grade e um "Adicionar N horários"; o backend grava tudo ou nada e confere vaga e limite do plano. Decidido: os dias ficam na matrícula, não no plano.
- Produção: `origin/vps` = `73a58d9`, implantado e conferido em 02/10 (ver abaixo).

## ONDE PARAMOS (01/10, fim do dia)
- Último commit no `ramo-pilates`: **`64d96f3`** (foto do instrutor). Base do tsc: **12**. Push feito em 02/10.
- **Próxima sessão: plano da Fase 4 no sábado 04/10** (quando o limite semanal renova). Começar mostrando o PLANO e esperar aprovação.

## 01/10 — o que entrou depois dos 3 bugs (ramo-pilates)
| Commit | O quê |
|---|---|
| `7642a00` | **"Usar Sessão" voltou a descontar a sessão do pacote**: a rota `POST /packages/:id/use-session` tinha perdido o UPDATE e a resposta (só validava; a tela mostrava "Unexpected end of JSON input"). Agora desconta com trava `remaining > 0`, marca `completed` na última sessão e devolve o pacote. Teste novo em `tests/isolamento.test.ts` |
| `329dcae` | **Logo do studio** na aba Identidade de Configurações quando o nicho é Pilates (antes só na aba Landing Page, escondida no Pilates). Envio de imagem e salvar mostram aviso ao falhar |
| `64d96f3` | **Foto do instrutor** no cadastro e na listagem (`/class-instructors` aceita e devolve `avatarUrl`; envio pelo mesmo `/uploads?kind=professional`). Teste: PATCH grava e remove a foto |
| `65829e6`, `60258fd`, `88bacd4`, `cc2488c` | Formulários: título do campo em negrito (700), conteúdo e dica em peso normal (400), sem maiúsculas |
| `881e877` | Ambiente local: Vite serve `/uploads`; `dev-local/trocar-senhas.sh` |

## 01/10 — 3 bugs de produção corrigidos
- Commit `0b0735f` no `vps` (upgrade da faixa do teste grátis, cancelamento de assinatura, foto do profissional), trazido para o `ramo-pilates` por cherry-pick (`c8bc19a`). Testado pelo usuário no ambiente local: OK.
- Base do tsc no `ramo-pilates`: **17 → 12**. No `vps` (sem `npm run check`), o tsc caiu de 16 para 11.
- Deploy na VPS: ver "Atualizar" em `deploy/README.md`.
- **Em produção desde 02/10, 14h15 (Brasília):** `origin/vps` = `73a58d9` (os 3 bugs + "Usar Sessão" + rótulos + aviso de erro no envio de imagem). Conferido dentro do container da API; containers recriados com `--no-cache`. Ainda não está no `vps`: a correção do `/auth/me` (mesmo `.catch(() => {})`; lá o efeito é só visual, porque o `vps` não tem o bloqueio por nicho) e a de Profissionais (Cancelar não limpava o formulário).

## ONDE PARAMOS (30/09, fim do dia)
- **Fase 3b aprovada pelo usuário** (Agenda de aulas, Aulas de hoje e Histórico testados no navegador: OK).
- Último commit no `ramo-pilates`: **`03ea0e3`** (apagado `frontend/src/App_HEAD.tsx`; base do tsc continua **17**).
- **85 testes** no backend, todos passando. Uso semanal do Claude em **82%** ao encerrar (renova em 04/10, ~01h de Brasília).
- **Próxima sessão: Fase 4** — avaliação inicial, evolução, aula experimental, mensalidade no financeiro (C9) e comissão. Começar mostrando o PLANO e esperar aprovação.
- Erros antigos de TypeScript que parecem bugs reais (lista abaixo, em "Bugs antigos"): **não corrigir sem pedido**; todos também estão no ramo `vps` (produção).

## Onde paramos (resumo)
- **Virada feita em 29/09/2026.** O ZenSalon oficial roda na VPS: **https://zensalon.com.br**, **https://www.zensalon.com.br** e **https://vps.zensalon.com.br** (mesmo sistema nos três). Roteiro e plano de volta: `docs/virada.md`.
- Railway **pausado** (deployment `3c0cc9d6` removido; serviço e variáveis mantidos). Vercel e Supabase de reserva até ~06/10.
- **Nicho Pilates, ramo `ramo-pilates`: Fase 3b (telas) concluída e aprovada em 30/09; ajustes de 01/10 até `64d96f3`. NADA publicado na VPS.** Próximo passo: Fase 4 (plano em 04/10).

## Regras (atualizadas em 07/10)
- Repo `jcnoga/beautytech-v2`, pasta `C:\projetos\beautytech-v2`. Produção = ramo **`vps`**; Pilates = ramo **`ramo-pilates`**.
- ~~Não fazer push no `main`~~: **regra encerrada em 07/10** (Railway e Vercel desconectados do repositório; `main` = `vps`).
- ~~Não desligar Supabase nem Vercel~~: desligados em 07/10 (ver "ONDE PARAMOS (07/10)").
- ~~Plano de volta para Vercel/Railway~~: não existe mais. Volta agora = imagens `antes-*` na VPS e backups em `/opt/backups/diario/`.

## Nicho Pilates — ramo `ramo-pilates`
- Especificação: `docs/prompt_pilates_zensalon.md` (itens numerados + adendo C1–C10). Matriz funcionalidades × nichos: `docs/matriz_nichos.md`.
- Fases: 0 diagnóstico ✅ · 1 mecanismo de nichos ✅ · 2 base Pilates ✅ · 3a motor das aulas ✅ (`9394358`) · **3b telas ✅ (30/09)** · 4 avaliação/evolução/experimental/mensalidade/comissão · 5 dashboard/relatórios/WhatsApp/página pública/demo · 6 regressão + publicação (só depois de ~06/10).
- **Nome genérico "Aulas em turma"** (para servir depois a yoga, dança, funcional): tabelas `class_*`, `membership_*`, `student_profiles`; features `group_classes`, `memberships`, `class_students`, `class_settings`, `class_instructors`; rotas `/classes`, `/memberships`, `/class-students`, `/class-instructors`; código em `backend/src/modules/group-classes` e `frontend/src/group-classes`. Só o nicho `pilates` tem essas features hoje.
- Nichos: `beauty_salon`, `barbershop`, `aesthetics_clinic`, `pilates`. Funções de conta (login, perfil, assinatura, configurações, ajuda, log) são globais; feature sem lista de nichos = negada; o bloqueio real é o 403 do backend.
- Regras configuráveis: padrão do studio + exceção por plano (vazio = usa o do studio), com log de valor antigo → novo. Padrões: cancelar com 12 h, reposição válida por 30 dias, no máximo 2 por mês, pausa de até 30 dias, instrutor lança presença só nas aulas dele até 24 h depois.
- Regras de negócio: pacote × frequência consomem aula de formas diferentes; no pacote, falta que não desconta crédito não gera reposição; aula extra = matrícula avulsa; vaga protegida com trava grade → aula (10 cliques em 4 vagas = 4 aceitos).

### Fase 3b — o que foi entregue (30/09)
| Commit | O quê |
|---|---|
| `63f63e8` | Backend da 3b: prévia (`?preview=1`), histórico do aluno com motivo e regra, mensagens em português |
| `86887cb`, `c70cd71`, `24a974a` | Renomeação Pilates → "Aulas em turma" |
| `7d69b95` | Tela Grade semanal |
| `89d9c64`, `3dd55ea` | Regras do studio (aba em Configurações, dono/gerente) |
| `90b74de` | Exceções de regra por plano |
| `76676ee` | Horários fixos da matrícula |
| `da71576`, `02b929a` | Rota de aulas pendentes; tela Agenda de aulas |
| `023839a` | Tela Aulas de hoje (presença no celular, "Marcar todos presentes" com prévia, bloco Pendentes) — **testada pelo usuário: OK** |
| `28cd9dc` | Correção: import da Agenda de aulas colidia com a `AgendaPage` do salão (no build, o menu "Agenda de aulas" abria a agenda do salão; no `vite dev` a tela quebrava) |
| `1fd908a` | `npm run check` no frontend (ver abaixo) |
| `cdfcb5c` | **Histórico do aluno** na ficha (Alunos → aluno → seção Histórico): créditos do pacote e reposições separadas (disponíveis, geradas, usadas, vencidas), filtro Tudo/Créditos/Reposições; a rota `/classes/bookings/history` ganhou o campo `event` — **falta o teste do usuário** |

### Rotina de todo commit (desde 30/09)
1. `sh backend/scripts/test-db.sh` — **85 testes** passando.
2. `npm run check` (em `frontend/`) — analisa todo `src` com o mesmo parser do `vite dev` (Babel: sintaxe e nome repetido) + `tsc --noEmit` contra uma base de erros antigos. **Base hoje: 12 erros** (era 17 até 01/10) (`frontend/scripts/tsc-baseline.json`); o check falha se aumentar. Se cair: `npm run check -- --update-baseline`.
3. `npm run build`.
- Motivo: o `vite build` (esbuild + Rollup) aceitou calado um nome repetido que quebrava o `vite dev`.
- Um commit por tela; push só no `ramo-pilates`; parar a cada 2 telas para o usuário testar.

### Próximos passos
1. ~~Teste do Histórico~~ — aprovado em 30/09.
2. **Fase 4 (próxima sessão):** avaliação inicial, evolução, aula experimental (CRM), mensalidade no financeiro (C9), comissão. Começar mostrando o PLANO e esperar aprovação.
3. **Bugs antigos** (achados pelo tsc em 30/09; NÃO corrigidos; o mesmo código está no ramo `vps`, em produção):
   | Arquivo:linha | Tela | Problema | Efeito |
   |---|---|---|---|
   | `App.tsx` 1602–1640 | Profissionais (`ProfessionalsPage`) | `exportXLSX`/`exportPDF` usam `filtered` e `summary`, que não existem ali (cópia do Financeiro) | Nenhum botão chama essas funções: código morto |
   | `App.tsx` 2375–2410 | CRM (`CRMPage`) | Mesma cópia com `filtered`/`summary` | Também sem botão: código morto |
   | ~~`App.tsx:1733`~~ | Profissionais, formulário | `form.avatarUrl` não está no estado do formulário | **Corrigido em 01/10** (`0b0735f` / `c8bc19a`) |
   | ~~`App.tsx:3967`~~ | Faixa do teste grátis (`TrialBanner`) | `setCurrentPage` e `setPage` não existem nesse componente | **Corrigido em 01/10**: Upgrade abre Planos |
   | ~~`PricingPage.tsx:148`~~ | Planos, "Cancelar assinatura" (`handleCancel`) | `activeToken` não existe | **Corrigido em 01/10** |
   | `App.tsx:455` | Login, botão "Cadastre seu salão" | `background` repetido no mesmo estilo | Só visual: vale o último |
   | `group-classes/StudentsPage.tsx:102` | Alunos, termo LGPD | `.data` em `unknown` | Só tipo; funciona |
4. **Corrigir antes do primeiro cliente:**
   - "+ Nova Profissional" depois de Editar → Cancelar abre com os dados (e agora a foto) do profissional anterior (o Cancelar do modal não limpa o formulário).
   - Busca pública (`/buscar`, `DiscoveryPage.tsx`): não há filtro nem rótulo/ícone para Pilates (o studio aparece como "pilates" com ícone de casa). Encaixa na Fase 5 (página pública).
   - Login do Super Admin: a mensagem "Credenciais inválidas" aparece com o acento corrompido (anotado em 02/10).
   - **Carga que falha calada (`.catch(() => {})`)**: quando a carga falhar, estas telas devem mostrar erro com "Tentar de novo", e não dados vazios nem valores fixos do código (anotado em 02/10):
     - `PricingPage.tsx:90`: preços dos planos (cai nos preços fixos do código);
     - `PricingPage.tsx:108`: `/billing/status` (assinante vê "Assinar" e não vê "Cancelar");
     - `group-classes/StudentsPage.tsx:48-49`: instrutores e planos ativos (listas vazias na matrícula);
     - `group-classes/StudentsPage.tsx:59`: matrículas do aluno (ficha mostra "sem matrícula");
     - `group-classes/StudentsPage.tsx:60`: termo LGPD (mostra "sem termo assinado");
     - `group-classes/PlansPage.tsx:42`: regras padrão do studio (exceções sem o padrão de referência).
6. **Baixa prioridade — demais `.catch(() => {})` do frontend** (levantados em 02/10): `App.tsx` `/plan-info` do menu lateral, Super Admin (configurações dos planos e dias de trial padrão, que cai em "15" fixo), listas de instrutores/modalidades em `PlansPage:41`, `AgendaPage:36-37`, `SchedulesPage:42-44`, `EnrollmentSlots:43`, `SessionPanel:93`, e o slug do `OnboardingWizard:60`.
5. **Observações:**
   - `PricingPage` lê o token uma vez só, ao abrir; se a sessão expirar com a página aberta, o cancelamento falha.
   - Ambiente local: desde 01/10 o Vite (`dev-local/web.sh`) serve `dev-local/uploads` em `/uploads` (na VPS é o nginx do `zensalon-web`). Senhas dos logins de teste: `sh dev-local/trocar-senhas.sh`.
   - Pagar no ambiente local dá "Internal Server Error": o Asaas local aponta para `http://127.0.0.1:9` de propósito.

### Ambiente local
- Docker Desktop; `sh dev-local/start.sh` (Postgres na porta 55433 + GoTrue na 9998 + migrations). Backend e frontend: configurações `zensalon-api-local` (porta 3301) e `zensalon-web-local` (http://localhost:5273/app) em `.claude/launch.json` (ou `sh dev-local/api.sh` / `sh dev-local/web.sh`).
- Logins de teste em `dev-local/.env.test-users` (dono do salão e dono do Pilates).
- Antes de testar no navegador, aplicar as migrations novas no banco local (o `start.sh` aplica).

## Feito na virada (29/09)
- Código (ramo vps): Traefik com vários domínios (`ROTEADOR_HOSTS` no `.env`); web com URLs relativas (`/api/v1`, GoTrue no próprio domínio); removidas 5 URLs fixas do Railway/Vercel no frontend (`39642cb`); webhook do Asaas ignora referência sem UUID e log não mostra parte da chave (`63e3293`).
- Cópia final Supabase → VPS: 56 tabelas iguais, 5 logins (as 5 donas), 45 arquivos.
- DNS no Registro.br: `@` e `www` → A `187.77.236.36` (TTL 3600). Certificado Let's Encrypt único para os 3 nomes (vence 28/12/2026, renova sozinho).
- `.env.api` com os valores reais do Railway (Resend, Asaas, Evolution/WhatsApp, avisos), `JOBS_ENABLED=true`, `WHATSAPP_SEND_ENABLED=true`. `ASAAS_BASE_URL` não existia no Railway (padrão produção). `ASAAS_ENV=sandbox` não tem efeito.
- Asaas (conta websitelogx@gmail.com, compartilhada com o AgroConsult): webhook **"ZenSalon"** → `https://zensalon.com.br/api/v1/billing/webhook` (pagamento confirmado/recebido/vencido, token = `ASAAS_WEBHOOK_TOKEN`).
- Evolution: instâncias `zensalon` e `salon-d664018e-1783523748765` com webhook → `https://zensalon.com.br/api/v1/webhooks/evolution/<instância>`.
- n8n (https://n8n-k7u5.srv1769674.hstgr.cloud): senha do owner → `/root/n8n-owner.txt`; credencial "Postgres account 3" → `vps-migrator-postgres:5432`, banco `zensalon`, usuário `zensalon_bot` (só `sessoes_salao` e `atendimentos_humanos`).
- Backup diário (03:10 de Brasília, `/etc/cron.d/backup-bancos`): `deploy/backup-bancos.sh`, todos os bancos + uploads, 7 dias em `/opt/backups/diario/`. Restauração testada (`deploy/testar-restauracao.sh`). Log: `/var/log/backup-bancos.log`.
- **Marca e e-mails:** "BeautyTech" → "ZenSalon" em tudo que o usuário vê (`4fc01aa`, `d8f2ba4`, publicados). Remetente único `EMAIL_FROM` = ZenSalon <noreply@99labpro.com.br> (zensalon.com.br **não** está verificado no Resend). **Não mandar e-mail de teste para contas de exemplo** (@beleza.com etc.): testar com jcnvap@gmail.com.

## Estado da VPS (187.77.236.36)
- `/opt/apps/zensalon` (ramo vps). Containers `zensalon-web`, `zensalon-api`, `zensalon-gotrue`. Bancos `zensalon` e `gotrue_zensalon` no `vps-migrator-postgres`.
- Um container Postgres com um banco por sistema: `zensalon`, `agroconsult`, `apps_production` (AgroLab). O AgroLab conecta direto no banco do AgroConsult.
- Segredos (chmod 600): `/root/zensalon-superadmin.txt`, `/root/zensalon-bot-db.txt`, `/root/n8n-owner.txt`, `/root/zensalon-supabase.env`.
- Backups pontuais: `.env.bak-*` e `.env.api.bak-*` em `/opt/apps/zensalon`; `/opt/backups/n8n/20260929T123222Z/`; `/opt/backups/removidos/2026-09-29/` (OdontoPro e AgroNexo) → apagar em ~29/10/2026. **`/opt/backups/zensalon/` (cópia do Supabase) → guardar até o fim de 2026.**

## PENDÊNCIAS (VPS)
1. **WhatsApp desconectado** desde 04/08: reconectar as instâncias pelo QR code na tela de WhatsApp e testar a resposta automática.
2. **Fluxo n8n "💜 ZenSalon — Atendimento WhatsApp"** nunca rodou. Recomendação: deixar parado (a resposta automática já está na API; os dois juntos respondem em dobro).
3. **Limpeza de disco da VPS:** aprovados `docker builder prune`, cache do apt e temporários em /tmp. A imagem postgres:17-alpine fica até 06/10.
4. **Backup fora da VPS (Cloudflare R2):** criar bucket e token (passo a passo em `docs/virada.md` e em `deploy/backup-bancos.sh`). Hoje todos os backups ficam no mesmo disco.
5. **~06/10:** criar `agrolab_app` e fechar as conexões abertas (AgroLab e gotrue-test usam o superusuário e enxergam o banco do ZenSalon; bancos do AgroConsult aceitam qualquer usuário); ~~desligar Railway e Vercel; desativar o Supabase; juntar `vps` → `main`~~ (feito em 07/10; excluir Railway/Vercel em ~14/10 e Supabase depois de ~29/10); apagar os `.bak-*` antigos (`/opt/backups/zensalon/` fica até o fim de 2026).
6. **Chave do Asaas:** um pedaço apareceu em logs. Trocar numa sessão própria, junto com o AgroConsult (mesma conta). O webhook do AgroConsult no Asaas está "Interrompido".
7. **Domínios próprios de teste** (`websitelog.com.br`, `www.dominioteste-nogueira.com.br`) ainda apontam para a Vercel. Rota de domínio próprio na VPS fica para depois.
8. Registro.br (zona 99labpro.com.br), falta você apagar: `agronexo`, `api-agronexo`, `gotrue-agronexo`, `api.odontopro`, `gotrue-odontopro`. DNS do 99labpro conferido e OK; única dúvida é o MX (contato@/suporte@).
9. **Porta do n8n (32768)** publicada: fechar numa próxima rodada.
10. Melhorias opcionais: painel mostrar "conta sem salão vinculado" em vez de zeros; exclusão de salão pelo super admin apagar os logins; evento `SUBSCRIPTION_INACTIVATED` do Asaas nunca funciona.

## Depois
- Pet Shop como nicho, usando o mesmo mecanismo de nichos. PetShop antigo (repo `jcnoga/petshop`, petshop.99labpro.com.br): decidir se desliga.
- Para vender: fechar "concluir atendimento → financeiro + comissão" no salão e reconectar o WhatsApp.

## Como trabalhar
- Claude Code pelo **Claude Desktop**, pasta `C:\projetos\beautytech-v2`, modo **Manual**. Respostas em português.
- Rótulos: **win** = Git Bash; **vps** = Git Bash após `ssh root@187.77.236.36`; **claude** = caixa do Claude Desktop.
- No Git Bash, `clip` e `nslookup` não são encontrados: usar `> /dev/clipboard` e `/c/Windows/System32/nslookup.exe`.
- Senha para a área de transferência sem aparecer na tela: `ssh root@187.77.236.36 cat /root/ARQUIVO.txt | tr -d '\n' > /dev/clipboard`. Não tirar print entre copiar algo e colar.
- No PowerShell 5.1, mensagem de commit com aspas duplas quebra: usar Git Bash + `git commit -F arquivo`.
- "Permitir uma vez" para tudo que altera a VPS.
