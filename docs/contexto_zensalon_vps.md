# Contexto — ZenSalon na VPS + nicho Pilates ("Aulas em turma")

Atualizado em 01/10/2026 (3 bugs de produção corrigidos). Colar no início da próxima conversa.

## 01/10 — 3 bugs de produção corrigidos
- Commit `0b0735f` no `vps` (upgrade da faixa do teste grátis, cancelamento de assinatura, foto do profissional), trazido para o `ramo-pilates` por cherry-pick (`c8bc19a`). Testado pelo usuário no ambiente local: OK.
- Base do tsc no `ramo-pilates`: **17 → 12**. No `vps` (sem `npm run check`), o tsc caiu de 16 para 11.
- Deploy na VPS: ver "Atualizar" em `deploy/README.md` (só o `zensalon-web` mudou).

## ONDE PARAMOS (30/09, fim do dia)
- **Fase 3b aprovada pelo usuário** (Agenda de aulas, Aulas de hoje e Histórico testados no navegador: OK).
- Último commit no `ramo-pilates`: **`03ea0e3`** (apagado `frontend/src/App_HEAD.tsx`; base do tsc continua **17**).
- **85 testes** no backend, todos passando. Uso semanal do Claude em **82%** ao encerrar (renova em 04/10, ~01h de Brasília).
- **Próxima sessão: Fase 4** — avaliação inicial, evolução, aula experimental, mensalidade no financeiro (C9) e comissão. Começar mostrando o PLANO e esperar aprovação.
- Erros antigos de TypeScript que parecem bugs reais (lista abaixo, em "Bugs antigos"): **não corrigir sem pedido**; todos também estão no ramo `vps` (produção).

## Onde paramos (resumo)
- **Virada feita em 29/09/2026.** O ZenSalon oficial roda na VPS: **https://zensalon.com.br**, **https://www.zensalon.com.br** e **https://vps.zensalon.com.br** (mesmo sistema nos três). Roteiro e plano de volta: `docs/virada.md`.
- Railway **pausado** (deployment `3c0cc9d6` removido; serviço e variáveis mantidos). Vercel e Supabase de reserva até ~06/10.
- **Nicho Pilates, ramo `ramo-pilates`: Fase 3b (telas) concluída e aprovada em 30/09, último commit `03ea0e3`. NADA publicado na VPS.** Próximo passo: Fase 4.

## Regras até ~06/10
- Repo `jcnoga/beautytech-v2`, pasta `C:\projetos\beautytech-v2`. Produção = ramo **`vps`**; Pilates = ramo **`ramo-pilates`**.
- **Não fazer push no `main`**: o Railway está ligado ao repo e pode subir sozinho. **Não clicar em "Criar PR".**
- Não desligar Supabase nem Vercel. Usar o sistema e anotar erros.
- **Plano de volta:** DNS no Registro.br `@` A → `76.76.21.21` e `www` CNAME → `cname.vercel-dns.com`; Railway: Deployments → ⋮ → Redeploy no `3c0cc9d6`.

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
5. **Observações:**
   - `PricingPage` lê o token uma vez só, ao abrir; se a sessão expirar com a página aberta, o cancelamento falha.
   - Ambiente local: ninguém serve `/uploads` (na VPS é o nginx do `zensalon-web`); a foto/logo enviada é gravada, mas aparece quebrada (404) no localhost. No teste de 01/10 foi contornado com um config temporário do Vite.
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
- Backups pontuais: `.env.bak-*` e `.env.api.bak-*` em `/opt/apps/zensalon`; `/opt/backups/zensalon/`; `/opt/backups/n8n/20260929T123222Z/`; `/opt/backups/removidos/2026-09-29/` (OdontoPro e AgroNexo) → apagar em ~29/10/2026.

## PENDÊNCIAS (VPS)
1. **WhatsApp desconectado** desde 04/08: reconectar as instâncias pelo QR code na tela de WhatsApp e testar a resposta automática.
2. **Fluxo n8n "💜 ZenSalon — Atendimento WhatsApp"** nunca rodou. Recomendação: deixar parado (a resposta automática já está na API; os dois juntos respondem em dobro).
3. **Limpeza de disco da VPS:** aprovados `docker builder prune`, cache do apt e temporários em /tmp. A imagem postgres:17-alpine fica até 06/10.
4. **Backup fora da VPS (Cloudflare R2):** criar bucket e token (passo a passo em `docs/virada.md` e em `deploy/backup-bancos.sh`). Hoje todos os backups ficam no mesmo disco.
5. **~06/10:** criar `agrolab_app` e fechar as conexões abertas (AgroLab e gotrue-test usam o superusuário e enxergam o banco do ZenSalon; bancos do AgroConsult aceitam qualquer usuário); desligar Railway e Vercel; trocar a senha do banco no Supabase e desativá-lo; juntar `vps` → `main` (antes, desligar o deploy automático do Railway); apagar `/opt/backups/zensalon/` e os `.bak-*`.
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
