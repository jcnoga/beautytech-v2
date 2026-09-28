# Plano de migração do ZenSalon para a VPS (aprovado em 28/09/2026)

Trabalho só no ramo git `vps`. O `main` continua publicando o site atual (Supabase + Railway + Vercel).

## Ordem (um commit por item)
1. Ramo `vps` + este plano.
2. Baseline das tabelas no Drizzle.
3. DTOs zod nas 19 rotas com `...req.body`.
4. Login/senha no GoTrue.
5. Uploads.
6. docker-compose para `vps.zensalon.com.br`.
7. Roteiro de cópia dos dados.

## Decisões
- **Containers próprios:** `zensalon-web`, `zensalon-api`, `zensalon-gotrue`. Bancos: `zensalon` e `gotrue_zensalon`.
  Não mexer em `petshop-*` nem nos bancos `petshop` e `gotrue_petshop`. Usar o Traefik existente (labels), sem criar outro.
- **Tabelas:** o banco da VPS recebe as 56 tabelas com todos os dados (cópia completa). No Drizzle entram só as 16
  usadas pelo sistema (7 do backend, 7 de clínica, `prospect_leads` e `prospect_templates`).
  As tabelas do bot (`sessoes_salao`, `atendimentos_humanos`, `bot_mensagens_log`, `configuracoes`) vão na cópia;
  o fluxo n8n "💜 ZenSalon — Atendimento WhatsApp" grava direto em `sessoes_salao` e `atendimentos_humanos`
  (credencial "Postgres account 3"), que precisará apontar para o banco novo.
- **Login:** GoTrue próprio com JWT HS256 (`jwtVerify` do `jose`). A API admin `/auth/v1/admin/users` continua igual,
  só muda URL e chave. `password_resets` passa a usar Drizzle, sem `/rest/v1`.
- **Frontend:** manter `@supabase/supabase-js` e apontar `VITE_SUPABASE_URL` para `vps.zensalon.com.br`, com o
  caminho `/auth/v1` roteado pelo Traefik para o GoTrue.
- **env.ts:** trocar `SUPABASE_URL`/`ANON_KEY`/`SERVICE_ROLE_KEY` por `GOTRUE_URL`, `GOTRUE_JWT_SECRET` e `GOTRUE_SERVICE_KEY`.
- **Banco:** na restauração, remover as políticas RLS; o backend conecta como dono das tabelas. SSL por variável de ambiente.
- **Uploads:** só `@fastify/multipart` (plugin oficial). Arquivos num volume da VPS servido pelo nginx do container web;
  sem `@fastify/static`.
- **Migração de dados:** exportar `auth.users` e `auth.identities` do Supabase (mesmos IDs e senhas), copiar os arquivos
  do bucket `tenant-assets` e reescrever as URLs gravadas no banco (logo, capa, fotos).
- **DTOs:** zod nas 19 rotas com `...req.body` (`all-modules.ts`), sem `tenantId`, `id`, `createdBy` e totais.
- **Adiado:** rota de domínio próprio via API da Vercel.
