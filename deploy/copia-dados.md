# Roteiro de cópia dos dados: Supabase → VPS

Copia **tudo** do ZenSalon para a VPS, sem alterar o Supabase (só leitura):

| O quê | Origem (Supabase) | Destino (VPS) | Script |
|---|---|---|---|
| Banco: 56 tabelas com todos os dados | schema `public` | banco `zensalon` (dono `zensalon_app`) | `deploy/copiar-banco.sh` |
| Usuários (mesmos IDs e senhas) | `auth.users`, `auth.identities` | banco `gotrue_zensalon` | `scripts/migracao/copiar-usuarios.ts` |
| Arquivos (logo, capa, fotos) | bucket `tenant-assets` | volume `zensalon_uploads`, pasta `tenant-assets/` | `scripts/migracao/copiar-arquivos.ts` |
| URLs gravadas no banco | `https://<ref>.supabase.co/storage/v1/object/public/tenant-assets/...` | `https://vps.zensalon.com.br/uploads/tenant-assets/...` | idem (mesmo script) |

As 4 tabelas do bot (`sessoes_salao`, `atendimentos_humanos`, `bot_mensagens_log`, `configuracoes`), `prospect_campaigns` e `subscriptions` vão junto na cópia do banco, embora fiquem fora do Drizzle.

## Pré-requisitos

- Deploy feito até o GoTrue no ar e as imagens construídas (`deploy/README.md`, até `$C build`).
- No painel do Supabase (Project Settings → Database → Connection string → **Session pooler**): a URL do banco. Ela contém a senha: cole só no terminal da VPS, nunca em arquivo nem no git.
- A URL do projeto (`https://<ref>.supabase.co`).
- Espaço em disco para o dump em `/opt/backups/zensalon` (pasta criada com `chmod 700`).

## Jeito rápido: um comando (ensaio e dia da virada)

Grave a URL do Session Pooler num arquivo só do root, sem passar pelo histórico nem pelo chat:

```bash
ssh -t root@187.77.236.36 'umask 077; read -rsp "URL do Session Pooler: " U; echo; printf "SUPABASE_DB_URL=%s\n" "$U" > /root/zensalon-supabase.env'
```

Depois, na VPS:

```bash
cd /opt/apps/zensalon && sh deploy/copiar-tudo.sh
```

O script para a API, **limpa o destino** (banco `zensalon`, usuários do GoTrue e a pasta `tenant-assets` do volume), copia tudo de novo, sobe a API e mostra o resumo: linhas por tabela (Supabase × VPS), usuários e arquivos. Pode rodar quantas vezes quiser. No Supabase só há leitura (as sessões ficam em `READ ONLY`).

## Passo a passo (na VPS, em `/opt/apps/zensalon`)

```bash
C="docker compose -f docker-compose.vps.yml"
set -a; . ./.env; set +a                  # GOTRUE_DATABASE_URL etc. para os comandos abaixo
read -rs SUPABASE_DB_URL; export SUPABASE_DB_URL   # cole a URL do Session Pooler (não aparece nem fica no histórico)
export SUPABASE_URL=https://<ref>.supabase.co
```

**1. Banco** (dump, restauração, remoção da RLS, registro das migrations Drizzle, conferência de linhas):

```bash
sh deploy/copiar-banco.sh
```

Termina com `OK: 56 tabelas, mesma contagem de linhas nos dois lados.` Para repetir: `RECRIAR=1 sh deploy/copiar-banco.sh` (apaga só o banco `zensalon` da VPS).

**2. Usuários**:

```bash
$C run --rm --no-deps -T -e SUPABASE_DB_URL -e GOTRUE_DATABASE_URL zensalon-api \
  node --import tsx scripts/migracao/copiar-usuarios.ts
```

Termina com `auth.users: Supabase N, VPS N OK` e o mesmo para `auth.identities`. Para repetir: acrescente `-e SUBSTITUIR=1`.

**3. Arquivos e URLs**:

```bash
$C run --rm --no-deps -T -e SUPABASE_DB_URL -e SUPABASE_URL zensalon-api \
  node --import tsx scripts/migracao/copiar-arquivos.ts
```

Mostra quantos arquivos copiou, quantas URLs trocou por tabela/coluna e, no fim, qualquer valor que ainda aponte para `supabase.co` (conferir à mão). Pode repetir: arquivos já copiados são pulados.

**4. Subir a API e o site** e conferir:

```bash
$C up -d zensalon-api zensalon-web
unset SUPABASE_DB_URL
```

- Entrar em `https://vps.zensalon.com.br` com um usuário real (a senha é a mesma do site atual).
- Conferir logo/capa do salão e foto de um profissional (devem vir de `/uploads/tenant-assets/...`).
- Conferir agenda, clientes e financeiro de um salão.

## Depois

- O dump fica em `/opt/backups/zensalon/*.dump` e contém dados de clientes: apague quando não precisar mais.
- Esta cópia é um retrato do momento. O site atual (Supabase) continua recebendo dados. Na virada do domínio (etapa C), repita os passos 1 a 3 com o site antigo parado (ou em manutenção), usando `RECRIAR=1` e `SUBSTITUIR=1`.
- Na virada, apontar a credencial **"Postgres account 3"** do n8n para o banco `zensalon` da VPS: o fluxo "💜 ZenSalon — Atendimento WhatsApp" grava direto em `sessoes_salao` e `atendimentos_humanos`.
