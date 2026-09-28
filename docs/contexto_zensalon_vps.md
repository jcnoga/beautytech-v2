# Contexto — ZenSalon: migração para VPS + ramo Pet Shop

Atualizado em 28/09/2026. Colar no início das próximas conversas.

## Decisão atual (28/09, à tarde)
- **Adaptar o próprio ZenSalon** (repo `jcnoga/beautytech-v2`, pasta `C:\projetos\beautytech-v2`), não construir núcleo novo.
- Ordem: **A) preparar → B) migrar para a VPS → C) virar a chave do domínio → D) ramos configuráveis + Pet Shop**.
- Trabalho só no **ramo git `vps`**. O ramo `main` continua publicando o site atual (Supabase + Railway + Vercel), que não pode parar.
- Objetivo final: um sistema com ramos (salão, barbearia, clínica, pet shop; oficina no futuro), cada empresa vê só o que interessa ao seu ramo.
- Futuro: domínio por ramo (ex.: zenpet.com.br) e domínio próprio do cliente (já existe `tenants.custom_domain` e `tenant-resolver.ts`).

## Pontos do ZenSalon presos ao Supabase (trocar na etapa B)
1. Login: JWKS do Supabase (`middleware/auth.ts`) e API admin (`team.module.ts`, `authModule`) → GoTrue na VPS.
2. `password_resets` via `/rest/v1` → Drizzle.
3. Upload no bucket `tenant-assets` (`App.tsx`, `TenantSettingsPage.tsx`) → arquivos na VPS.
4. Conexão do banco (Session Pooler) → Postgres na VPS.

## Correções obrigatórias antes de clientes reais
- 17 rotas gravam `...req.body` direto no banco (PATCH pode trocar `tenant_id`).
- 128 rotas só exigem login, sem checar papel. CORS aceita qualquer origem.
- Concluir atendimento não gera financeiro/comissão.
- "Hoje" calculado no fuso do servidor (UTC).
- 22 tabelas existem só no banco de produção (56 no banco real × 34 no schema Drizzle).

## Arquivos úteis
- `C:\projetos\PetShop\db\zensalon_schema.sql` — estrutura real do banco de produção (56 tabelas).
- `C:\projetos\PetShop\docs\inventario-zensalon.md` — inventário do ZenSalon.
- Doc no Claude: "Auditoria ZenSalon e Estratégia PetTech".

## Infra da VPS (187.77.236.36)
- Traefik existente: `traefik-traefik-1`, network_mode host, entrypoint `websecure`, certresolver `letsencrypt`, exposedbydefault=false (usar `traefik.enable=true`). Não criar outro Traefik.
- DNS do domínio 99labpro.com.br fica no **Registro.br** (Editar zona → Nova entrada tipo A).
- Teste do ZenSalon na VPS: `zensalon.99labpro.com.br` (criar entrada A `zensalon` → 187.77.236.36).

## Projeto PetShop (núcleo novo) — PAUSADO
- Repo `jcnoga/petshop` (privado), pasta `C:\projetos\PetShop`, último commit `d65e7ba`.
- No ar em `https://petshop.99labpro.com.br` (containers petshop-web, petshop-api, petshop-gotrue; bancos petshop e gotrue_petshop). Não mexer; decidir depois se desliga.

## Pendências
- ⚠️ R1 no Supabase: rodar `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname='public' ORDER BY rowsecurity, tablename;` e, se houver `false`, ligar RLS (tabelas expostas pela anon key).
- Resultado da verificação de backup do Postgres compartilhado da VPS (pedido ao Claude Code, não relatado).
- Conta admin demo (`zensalon@zensalon.com`, ID e794e9f9…): senha exposta no repo público → trocar ou apagar.

## Como trabalhar
- Claude Code pelo **aplicativo Claude Desktop** (pasta do projeto, modo **Manual**). No terminal, o login do Claude Code não funcionou.
- Rótulos: **win** = Git Bash; **vps** = Git Bash após `ssh root@187.77.236.36`; **claude** = caixa do Claude Desktop.
