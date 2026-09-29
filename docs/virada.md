# Virada do ZenSalon para a VPS — roteiro

Data: 29/09/2026. Snapshot da VPS tirado às 07:59. Não há clientes pagantes.
**Nada deste roteiro é executado sem aprovação.** Cada passo que altera a VPS é feito com "Permitir uma vez".

Legenda: **[você]** = você faz no painel; **[claude]** = eu executo; **[juntos]** = eu executo, você confere.

| Passo | O quê | Quem | Tempo | Site fora do ar? |
|---|---|---|---|---|
| 0 | Preparar código, backup e teste de restauração | claude | 25 min | não |
| 1 | Pausar backend no Railway | você | 3 min | **sim, começa aqui** |
| 2 | Refazer a cópia (Supabase → VPS) e conferir contagem | claude | 10 min | sim |
| 3 | Traefik/GoTrue/.env/web para os 3 domínios | claude | 10 min | sim |
| 4 | DNS no Registro.br | você | 5 min + propagação (5–60 min) | sim, até propagar |
| 5 | Conferir HTTPS e login | juntos | 10 min | não |
| 6 | Ligar Resend, Asaas, WhatsApp e jobs | você cola, claude reinicia | 15 min | não |
| 7 | Webhooks do Asaas (você) e da Evolution (claude) | juntos | 10 min | não |
| 8 | n8n acessando o banco zensalon | juntos | 15 min | não |
| — | **Total** | | **~2 h**, com ~30–60 min de site fora | |

---

## Passo 0 — Preparação (antes de parar qualquer coisa) [claude]

1. **Mudanças no código (ramo vps), para o mesmo build servir os três domínios:**
   - `docker-compose.vps.yml`: as regras do Traefik passam de `Host(${PUBLIC_HOST})` para `(${ROTEADOR_HOSTS})`, uma nova variável do `.env`.
   - Web: `VITE_API_URL=/api/v1` (relativo) e `VITE_SUPABASE_URL` vazio. Em `frontend/src/api/client.ts`, o endereço do login passa a ser `window.location.origin` quando vazio. Assim cada domínio fala com a própria API, e o site em `vps.zensalon.com.br` não chama `zensalon.com.br` (que ainda é a Vercel antes do DNS).
   - Commit dos scripts de backup (`deploy/backup-bancos.sh`, `deploy/testar-restauracao.sh`).
   - Commit + push; na VPS, `git pull --ff-only` e build das imagens (os containers ainda não são trocados).
2. **Backup de todos os bancos** (`sh deploy/backup-bancos.sh`) e **teste de restauração** do zensalon (`sh deploy/testar-restauracao.sh zensalon`). Cron diário 03:10 (Brasília) instalado. O R2 entra quando você criar o bucket (pode ser depois da virada).
3. Retrato dos outros sistemas: `sh deploy/retrato.sh > /tmp/virada-antes.txt`.

## Passo 1 — Pausar o backend no Railway [você] (3 min)

1. Entre em https://railway.com → abra o projeto do ZenSalon → clique no serviço do backend (`beautytech-v2`).
2. Aba **Deployments** → no deployment ativo (o de cima, verde), clique nos **três pontinhos (⋮)** → **Remove**. O nome do item pode variar um pouco.
3. Confirme: https://beautytech-v2-production.up.railway.app/api/v1/plan-info deve parar de responder.
4. **Não apague o serviço nem as variáveis**: elas são usadas no passo 6 e na volta.

Com isso ninguém grava no Supabase: o site da Vercel fica sem API, e os jobs e webhooks do Railway param.

## Passo 2 — Cópia final Supabase → VPS [claude] (10 min)

1. Antes da cópia, em `/opt/apps/zensalon/.env`:
   ```
   PUBLIC_HOST=zensalon.com.br
   PUBLIC_URL=https://zensalon.com.br
   ROTEADOR_HOSTS='Host(`zensalon.com.br`) || Host(`www.zensalon.com.br`) || Host(`vps.zensalon.com.br`)'
   ```
   Isso vem **antes** da cópia porque ela grava no banco as URLs das fotos/logos com `PUBLIC_URL`, e elas já saem com o domínio final.
2. `sh deploy/copiar-tudo.sh`. Apaga e recopia banco, usuários e arquivos (o Supabase só é lido).
3. Conferir o RESUMO: toda tabela com o mesmo número nos dois lados (nenhum `<-- DIFERENTE`), `auth.users` e `auth.identities` OK, arquivos OK.
4. `sh deploy/listar-usuarios.sh`: devem aparecer só as 5 donas.

## Passo 3 — Três domínios na VPS [claude] (10 min)

1. `docker compose -f docker-compose.vps.yml up -d zensalon-gotrue zensalon-api zensalon-web`. Isso recria os três com o `.env` novo: GoTrue com `SITE_URL/API_EXTERNAL_URL` em zensalon.com.br, API com `FRONTEND_URL` e uploads em zensalon.com.br, web e rotas do Traefik nos 3 domínios.
2. Conferir que `https://vps.zensalon.com.br` continua funcionando (login e painel com dados).
3. O certificado de `zensalon.com.br` e `www` **ainda não sai**: o Let's Encrypt valida por HTTP, e o DNS ainda aponta para a Vercel. Isso é esperado e sai no passo 5.
4. `sh deploy/retrato.sh > /tmp/virada-depois.txt && diff /tmp/virada-antes.txt /tmp/virada-depois.txt`: os outros sistemas continuam iguais.

## Passo 4 — DNS no Registro.br [você] (5 min + propagação)

Registro.br → **zensalon.com.br** → **DNS** → **Editar zona**.

**Anote antes (valores atuais, para voltar):**

| Nome | Tipo | Valor atual |
|---|---|---|
| `zensalon.com.br` (em branco / @) | A | `76.76.21.21` |
| `www` | CNAME | `cname.vercel-dns.com` |

**Troque para:**

| Nome | Tipo | Valor novo |
|---|---|---|
| `zensalon.com.br` (em branco / @) | A | `187.77.236.36` |
| `www` | **A** | `187.77.236.36` (apague o CNAME `www` e crie uma entrada A `www`) |

**Não mexa em:** MX, TXT (SPF/DKIM/Resend), `evolution` (já é 187.77.236.36) nem `vps`.
Anote também o **TTL** que aparece na zona: é o tempo máximo que alguns usuários levam para ver a mudança (e para ver a volta, se precisar).

## Passo 5 — Conferir HTTPS e login [juntos] (10 min)

1. Eu confiro de fora: `zensalon.com.br` e `www` resolvem para 187.77.236.36.
2. Assim que resolverem, o Traefik pede o certificado sozinho (1–2 min). Se o navegador mostrar "TRAEFIK DEFAULT CERT" depois de 5 min, eu recrio o `zensalon-web` para forçar nova tentativa.
3. Você testa em janela anônima: https://zensalon.com.br e https://www.zensalon.com.br, com cadeado, login de uma dona, painel com dados, agenda, uma foto/logo carregando e a página pública `/agendar/<slug>`.

## Passo 6 — Ligar as integrações de verdade [você cola, claude reinicia] (15 min)

Sem nano e sem valores no chat: no Railway → serviço backend → **Variables**, você copia o **valor** de UMA variável e escreve aqui "copiei NOME". Eu leio a área de transferência (Get-Clipboard) e gravo no `.env.api` da VPS sem exibir, respondendo só 1 (gravado) ou 0 (falhou). Se a variável não existir no Railway, escreva "não existe NOME". Ordem:

- **Resend:** `RESEND_API_KEY` (troca o `re_desativado`), `RESEND_FROM_EMAIL`, `RESEND_FROM_NAME`
- **Asaas:** `ASAAS_API_KEY`, `ASAAS_BASE_URL`, `ASAAS_ENV`, `ASAAS_WEBHOOK_TOKEN`, `ASAAS_TEST_EMAIL` (se existir)
- **WhatsApp/Evolution:** `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, `WHATSAPP_API_URL`, `WHATSAPP_API_KEY`, `WHATSAPP_INSTANCE`
- **Avisos:** `NOTIFY_OWNER_EMAIL`, `NOTIFY_OWNER_PHONE`
- **Mudar para true:** `JOBS_ENABLED=true` e `WHATSAPP_SEND_ENABLED=true`
- **Não copiar:** `FRONTEND_URL`, `CORS_ORIGINS`, `SUPABASE_*`, `DATABASE_URL`/`POSTGRES_*`, `PORT` (a VPS define os seus). `VERCEL_*` fica de fora (domínio próprio fica para depois).

Salve (Ctrl+O, Enter, Ctrl+X). Depois disso eu recrio a API (`up -d zensalon-api`) e confiro no log que os jobs subiram e não há erro de variável.

## Passo 7 — Webhooks (10 min)

**Asaas [você]:** painel do Asaas → **Integrações** → **Webhooks** → edite o webhook de cobranças:
- URL: `https://zensalon.com.br/api/v1/billing/webhook`
- Token de autenticação: o mesmo valor de `ASAAS_WEBHOOK_TOKEN` (não muda)
- Se a fila estiver pausada por falhas durante a pausa, reative/reprocesse.

**Evolution [claude]:** duas instâncias ainda mandam mensagens para o Railway:
- `zensalon` e `salon-d664018e-1783523748765` → hoje em `https://beautytech-v2-production.up.railway.app/api/v1/webhooks/evolution/<instância>`
- passam para `https://zensalon.com.br/api/v1/webhooks/evolution/<instância>`, pela API da Evolution (`/webhook/set/<instância>`), sem mudar os eventos.
- A instância da lanchonete (webhook no n8n) não é tocada.

## Passo 8 — n8n acessando o banco zensalon, sem porta pública [juntos] (15 min)

Hoje o n8n (`n8n-k7u5-n8n-1`) está na rede `n8n-k7u5_default`, e o Postgres (`vps-migrator-postgres`) na `vps-migrator_default`. O Postgres só escuta em `127.0.0.1:5433`, nada público.

1. **[claude] Usuário próprio do bot,** senha gerada na VPS e guardada em `/root/zensalon-bot-db.txt` (chmod 600):
   ```sql
   CREATE ROLE zensalon_bot LOGIN PASSWORD '...';
   GRANT CONNECT ON DATABASE zensalon TO zensalon_bot;
   GRANT USAGE ON SCHEMA public TO zensalon_bot;
   GRANT SELECT, INSERT, UPDATE, DELETE ON sessoes_salao, atendimentos_humanos TO zensalon_bot;
   GRANT USAGE, SELECT ON SEQUENCE sessoes_salao_id_seq, atendimentos_humanos_id_seq TO zensalon_bot;
   ```
   Ele não enxerga nenhuma outra tabela nem outro banco. Se o fluxo consultar mais alguma tabela (confira os nós Postgres do fluxo), eu dou só `SELECT` nela.
2. **[claude] Ligar o n8n à rede do Postgres:** `docker network connect vps-migrator_default n8n-k7u5-n8n-1` (sem reiniciar o n8n). Para valer também depois de uma atualização do n8n, acrescento a rede externa `vps-migrator_default` no `/docker/n8n-k7u5/docker-compose.yml` (só passa a valer na próxima recriação).
3. **[você] No n8n:** Credentials → **Postgres account 3**:
   - Host: `vps-migrator-postgres` · Port: `5432` · Database: `zensalon`
   - User: `zensalon_bot` · Password: `ssh root@187.77.236.36 cat /root/zensalon-bot-db.txt`
   - SSL: **disable** → **Save** (o n8n testa a conexão ao salvar).
4. **[juntos]** Mandar uma mensagem de teste no WhatsApp do ZenSalon e ver o fluxo "💜 ZenSalon — Atendimento WhatsApp" rodar sem erro.

---

## Plano de volta (rollback) — até 10 min de trabalho

Use se, depois do passo 4, algo essencial não funcionar (login, agenda, HTTPS) e não houver correção rápida.

1. **[você] DNS (2 min):** no Registro.br, volte `@` para **A `76.76.21.21`**, apague o A `www` e recrie **CNAME `www` → `cname.vercel-dns.com`**.
2. **[você] Railway (3 min):** Deployments → no último deployment removido, **⋮ → Redeploy**. Confirme `…railway.app/api/v1/plan-info` respondendo.
3. **[claude] VPS (3 min):** em `.env.api`, voltar `JOBS_ENABLED=false` e `WHATSAPP_SEND_ENABLED=false` e recriar a API, para nada sair em dobro com o Railway.
4. **[claude/você] Webhooks:** Evolution de volta para a URL do Railway (eu faço); Asaas de volta para a URL antiga (você), se já tiver trocado; n8n "Postgres account 3" de volta para o Supabase.

**Limites da volta:**
- Quem já tem o DNS novo em cache continua indo para a VPS até o TTL vencer. A VPS continua funcionando nesse tempo, porque o `vps.zensalon.com.br` não muda.
- O que for gravado na VPS depois do passo 2 **não volta sozinho** para o Supabase. Sem clientes pagantes, o risco é pequeno; anote o que for cadastrado.
- Se o problema for na VPS em si, o snapshot das 07:59 e o backup do passo 0 estão disponíveis.

## Depois da virada
- Acompanhar logs e o backup diário por 1 semana (`tail /var/log/backup-bancos.log`).
- Criar o bucket R2 e o `/root/backup-r2.env` (backup fora da VPS).
- Após 1 semana estável: desligar Railway/Vercel, trocar a senha do banco do Supabase e desativá-lo, apagar `/opt/backups/zensalon/`, juntar `vps` → `main`.
- **Domínios próprios** (`websitelog.com.br` e `www.dominioteste-nogueira.com.br`, ambos do "Salão Beleza Pura", de teste) continuam na Vercel e **param de funcionar** com o Railway pausado. A rota de domínio próprio na VPS fica para depois, como já combinado.
