# Contexto — ZenSalon: migração para VPS + ramo Pet Shop

Atualizado em 29/09/2026 (fim do dia). Colar no início da próxima conversa.

## Onde paramos (resumo)
- **Virada feita em 29/09/2026.** O ZenSalon oficial roda na VPS: **https://zensalon.com.br**, **https://www.zensalon.com.br** e **https://vps.zensalon.com.br** (mesmo sistema nos três).
- Railway **pausado** (deployment `3c0cc9d6` removido; serviço e variáveis mantidos). Vercel e Supabase continuam existindo, mas sem uso.
- Roteiro completo e plano de volta: `docs/virada.md`.

## Decisão de rumo
- Repo `jcnoga/beautytech-v2`, pasta `C:\projetos\beautytech-v2`, **ramo git `vps`**. **Não fazer push no `main`**: o serviço do Railway está ligado ao repositório e pode voltar a subir. **Não clicar em "Criar PR".**
- Ordem: A) preparar ✅ → B) migrar ✅ → C) virada ✅ → **1 semana de acompanhamento** → D) ramos configuráveis + Pet Shop.
- Futuro: domínio por ramo (ex.: zenpet.com.br), domínio próprio do cliente e vertical Oficina.

## Feito na virada (29/09)
- Código (ramo vps): Traefik com vários domínios (`ROTEADOR_HOSTS` no `.env`); web com URLs relativas (`/api/v1`, GoTrue no próprio domínio); removidas 5 URLs fixas do Railway/Vercel no frontend (`39642cb`); webhook do Asaas ignora referência sem UUID e log não mostra parte da chave (`63e3293`).
- Cópia final Supabase → VPS: 56 tabelas iguais, 5 logins (as 5 donas), 45 arquivos.
- DNS no Registro.br: `@` e `www` → A `187.77.236.36` (TTL 3600). **Valores antigos (para voltar):** `@` A `76.76.21.21`; `www` CNAME `cname.vercel-dns.com`. Certificado Let's Encrypt único para os 3 nomes (vence 28/12/2026, renova sozinho).
- `.env.api` com os valores reais do Railway (Resend, Asaas, Evolution/WhatsApp, avisos), `JOBS_ENABLED=true`, `WHATSAPP_SEND_ENABLED=true`. `ASAAS_BASE_URL` não existia no Railway (padrão produção). `ASAAS_ENV=sandbox` não tem efeito (só o `asaas.module.ts`, desativado, usava).
- Asaas (conta websitelogx@gmail.com, compartilhada com o AgroConsult): criado o webhook **"ZenSalon"** → `https://zensalon.com.br/api/v1/billing/webhook` (pagamento confirmado/recebido/vencido, token = `ASAAS_WEBHOOK_TOKEN`). Antes o ZenSalon não tinha webhook nenhum. O webhook do AgroConsult não foi tocado (está "Interrompido").
- Evolution: instâncias `zensalon` e `salon-d664018e-1783523748765` com webhook → `https://zensalon.com.br/api/v1/webhooks/evolution/<instância>`.
- n8n (https://n8n-k7u5.srv1769674.hstgr.cloud, SQLite no volume `n8n-k7u5_n8n_data`): senha do owner (websitelogx@gmail.com) redefinida → `/root/n8n-owner.txt`; credencial "Postgres account 3" → `vps-migrator-postgres:5432`, banco `zensalon`, usuário `zensalon_bot` (só `sessoes_salao` e `atendimentos_humanos`; `pg_hba` só deixa esse usuário entrar no banco `zensalon`); n8n ligado à rede `vps-migrator_default` (também no `/docker/n8n-k7u5/docker-compose.yml`).
- Backup diário (03:10 de Brasília = 06:10 UTC, `/etc/cron.d/backup-bancos`): `deploy/backup-bancos.sh` faz dump de **todos** os 13 bancos do `vps-migrator-postgres` + uploads do ZenSalon, 7 dias em `/opt/backups/diario/`. Restauração testada (`deploy/testar-restauracao.sh`). Log: `/var/log/backup-bancos.log`.

## Estado da VPS (187.77.236.36)
- `/opt/apps/zensalon` (ramo vps). Containers `zensalon-web`, `zensalon-api`, `zensalon-gotrue`. Bancos `zensalon` e `gotrue_zensalon` no `vps-migrator-postgres` (superusuário do container: `vps_migrator_user`).
- Segredos (chmod 600, ler com `ssh root@187.77.236.36 cat <arquivo> | clip`): `/root/zensalon-superadmin.txt`, `/root/zensalon-bot-db.txt`, `/root/n8n-owner.txt`, `/root/zensalon-supabase.env`.
- Backups pontuais: `.env.bak-*` e `.env.api.bak-*` em `/opt/apps/zensalon`; `/opt/backups/zensalon/` (cópia de 28 e 29/09); `/opt/backups/n8n/20260929T123222Z/`; `pg_hba.conf.bak-*` no PGDATA; `docker-compose.yml.bak-*` do n8n.
- Railway CLI instalado e logado no PC (projeto `caring-energy`, serviço `beautytech-v2`).

## PENDÊNCIAS
1. **WhatsApp desconectado:** as instâncias `zensalon` e `salon-d664018e…` estão `close` (última mensagem recebida em 04/08/2026, antes da virada). Reconectar pelo QR code na tela de WhatsApp do sistema e testar a resposta automática.
2. **Fluxo n8n "💜 ZenSalon — Atendimento WhatsApp" nunca rodou** (0 execuções): ele espera `POST /webhook/zensalon-atendimento`, mas nenhuma instância aponta para ele. Decidir se ele deve ser usado (e com qual instância) ou se a resposta automática da API basta.
3. **R2 (backup fora da VPS):** criar bucket + token no Cloudflare e o `/root/backup-r2.env` (passo a passo em `docs/virada.md` e no cabeçalho de `deploy/backup-bancos.sh`).
4. **1 semana estável (até ~06/10):** acompanhar logs e backup; depois desligar Railway/Vercel, trocar a senha do banco no Supabase e desativá-lo, apagar `/opt/backups/zensalon/` e os `.bak-*`, juntar `vps` → `main` (antes, desligar o deploy automático do Railway).
5. **Chave do Asaas:** 20 primeiros caracteres ficaram em logs do Railway/VPS (log já removido). Trocar afeta também o AgroConsult.
6. **Domínios próprios** (`websitelog.com.br`, `www.dominioteste-nogueira.com.br`, ambos de teste, do Salão Beleza Pura) pararam: ainda apontam para a Vercel. Rota de domínio próprio na VPS fica para depois.
7. Melhorias opcionais: painel mostrar "conta sem salão vinculado" em vez de zeros; exclusão de salão pelo super admin apagar também os logins; evento `SUBSCRIPTION_INACTIVATED` do Asaas nunca funciona (lê a referência do lugar errado).

## Problemas conhecidos (não urgentes)
- 32 erros antigos de TypeScript. O teste de isolamento precisa de `TEST_DATABASE_URL` (banco de teste) para rodar.
- Emojis corrompidos em títulos ("? Aniversariantes") — conferir.
- n8n publicado na porta 32768 da VPS (`ports: "5678"` no compose dele); de fora não responde, mas vale fechar.
- Webhook do AgroConsult no Asaas "Interrompido"; `api.odontopro.99labpro.com.br` com limite de certificados do Let's Encrypt estourado (outros sistemas).
- Avisos de "collation version mismatch" nos bancos `postgres` e `vps_migrator` (inofensivos).

## Projeto PetShop (núcleo novo) — PAUSADO
- Repo `jcnoga/petshop`, pasta `C:\projetos\PetShop`, último commit `d65e7ba`. No ar em petshop.99labpro.com.br (petshop-web/api/gotrue). Decidir depois se desliga.

## Como trabalhar
- Claude Code pelo **Claude Desktop**, pasta `C:\projetos\beautytech-v2`, modo **Manual**.
- Rótulos: **win** = Git Bash; **vps** = Git Bash após `ssh root@187.77.236.36`; **claude** = caixa do Claude Desktop.
- Senhas nunca no chat: valores vão por pipe/arquivo (ex.: Railway CLI → `.env.api`) ou pela área de transferência (`| clip`). Não tirar print entre copiar algo e o Claude ler a área de transferência.
- "Sempre permitir" só para git commit/push no vps, testes e consultas; "Permitir uma vez" para o que altera a VPS.
