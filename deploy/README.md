# Deploy do ZenSalon na VPS

Teste em `https://vps.zensalon.com.br` (ramo git `vps`): web na raiz, API em `/api/v1`, GoTrue em `/auth/v1`, arquivos enviados em `/uploads`.

- Pasta na VPS: `/opt/apps/zensalon` (clone do repositório `jcnoga/beautytech-v2`, ramo `vps`).
- Containers: `zensalon-web` (nginx), `zensalon-api`, `zensalon-gotrue`, na rede externa `vps-migrator_default`, **sem portas publicadas**; publicados pelo Traefik que já existe (labels em `docker-compose.vps.yml`). Não mexe em `petshop-*`.
- Banco: Postgres compartilhado `vps-migrator-postgres`. Bancos `zensalon` (dono `zensalon_app`) e `gotrue_zensalon` (dono `zensalon_auth`). Não mexe em `petshop` nem `gotrue_petshop`.
- Uploads: volume Docker `zensalon_uploads` (API grava, nginx do web lê).
- Segredos: `.env` (infra, gerado) e `.env.api` (integrações, copiadas do Railway), só na VPS (`chmod 600`). Nunca no git.

Comandos na VPS, dentro de `/opt/apps/zensalon`. Atalho:

```bash
C="docker compose -f docker-compose.vps.yml"
```

## Antes: DNS

Entrada tipo **A** `vps.zensalon.com.br` → `187.77.236.36` na zona DNS de `zensalon.com.br`. Confirme com `dig +short vps.zensalon.com.br`.

## Primeiro deploy

```bash
sh deploy/retrato.sh > /tmp/zensalon-antes.txt   # estado dos outros sistemas
sh deploy/gerar-env.sh                           # cria .env e .env.api (não sobrescreve)
nano .env.api                                    # preencha com as variáveis do Railway
sh deploy/criar-banco.sh                         # papéis e bancos (idempotente)
$C up -d zensalon-gotrue                         # o GoTrue cria o schema auth
$C build zensalon-api zensalon-web
# cópia dos dados do Supabase: siga deploy/copia-dados.md (banco, usuários e arquivos)
$C up -d zensalon-api zensalon-web
sh deploy/retrato.sh > /tmp/zensalon-depois.txt
diff /tmp/zensalon-antes.txt /tmp/zensalon-depois.txt && echo "outros sistemas inalterados"
```

## Atualizar (código novo)

```bash
sh deploy/retrato.sh > /tmp/zensalon-antes.txt
git pull --ff-only
$C build zensalon-api zensalon-web
$C up -d zensalon-api zensalon-web
sh deploy/retrato.sh > /tmp/zensalon-depois.txt && diff /tmp/zensalon-antes.txt /tmp/zensalon-depois.txt
```

## Verificar

```bash
curl -s https://vps.zensalon.com.br/auth/v1/health            # versão do GoTrue
curl -s https://vps.zensalon.com.br/api/v1/plan-info -o /dev/null -w '%{http_code}\n'   # 401 = API no ar
$C ps
$C logs --tail 50 zensalon-api
```

## Desfazer (só o que é do ZenSalon)

```bash
$C down
# Apaga dados e arquivos do ZenSalon na VPS: só com certeza e backup. O Supabase continua intacto.
docker volume rm zensalon_uploads
docker exec -i vps-migrator-postgres psql -U <superusuário> -d postgres \
  -c "DROP DATABASE zensalon" -c "DROP DATABASE gotrue_zensalon" -c "DROP ROLE zensalon_app" -c "DROP ROLE zensalon_auth"
```

## Observações

- `/auth/v1/admin` não é publicado: a API usa a API admin do GoTrue pela rede interna (`http://zensalon-gotrue:9999`).
- O GoTrue não tem SMTP: recuperação de senha e convite de equipe saem pela API (token em `password_resets` + Resend).
- `TRUST_PROXY` é o gateway da rede Docker (é por ele que o Traefik chega aos containers); sem ele o rate limit trataria todos os usuários como um só IP.
- Ao virar a chave do domínio (etapa C), atualizar: webhooks do Asaas e da Evolution, `FRONTEND_URL`/domínio no `.env`, e a credencial "Postgres account 3" do n8n (tabelas `sessoes_salao` e `atendimentos_humanos`).
