#!/bin/sh
# Cópia completa Supabase -> VPS em um comando: banco, usuários e arquivos, sempre LIMPANDO o destino
# antes (pode ser rodado de novo no dia da virada). O Supabase é só lido (pg_dump, SELECT, COPY TO e
# download público dos arquivos; as sessões ficam em READ ONLY no próprio Postgres).
#
# A URL do banco do Supabase (Session Pooler, contém a senha) vem de SUPABASE_DB_URL ou do arquivo
# /root/zensalon-supabase.env (chmod 600) com a linha SUPABASE_DB_URL=... . A URL do projeto
# (https://<ref>.supabase.co) é deduzida do usuário "postgres.<ref>" da URL, ou vem de SUPABASE_URL.
#
# Uso (na VPS, na pasta do projeto): sh deploy/copiar-tudo.sh
set -eu
cd "$(dirname "$0")/.."
C="docker compose -f docker-compose.vps.yml"
SECRETS="${SUPABASE_ENV_FILE:-/root/zensalon-supabase.env}"

if [ -z "${SUPABASE_DB_URL:-}" ] && [ -f "$SECRETS" ]; then . "$SECRETS"; fi
: "${SUPABASE_DB_URL:?defina SUPABASE_DB_URL ou crie $SECRETS}"
if [ -z "${SUPABASE_URL:-}" ]; then
  REF=$(printf '%s' "$SUPABASE_DB_URL" | sed -n 's|^postgres[a-z]*://postgres\.\([a-z0-9]*\):.*|\1|p')
  [ -n "$REF" ] || { echo "Não consegui deduzir o projeto da URL; defina SUPABASE_URL=https://<ref>.supabase.co" >&2; exit 1; }
  SUPABASE_URL="https://$REF.supabase.co"
fi
set -a; . ./.env; set +a
export SUPABASE_DB_URL SUPABASE_URL

grep -q '^JOBS_ENABLED=true' .env.api 2>/dev/null && echo "AVISO: JOBS_ENABLED=true no .env.api (jobs da VPS vão rodar sobre os dados copiados)."

echo "== Parando a API da VPS durante a cópia (volta a subir no fim, mesmo se algo falhar)"
$C stop zensalon-api
trap '$C up -d --no-deps zensalon-api >/dev/null 2>&1 || true' EXIT

echo "== 1/3 Banco"
RECRIAR=1 sh deploy/copiar-banco.sh

echo "== 2/3 Usuários"
$C run --rm --no-deps -T -e SUPABASE_DB_URL -e GOTRUE_DATABASE_URL -e SUBSTITUIR=1 zensalon-api \
  node --import tsx scripts/migracao/copiar-usuarios.ts > /tmp/zensalon-usuarios.txt 2>&1 \
  || { cat /tmp/zensalon-usuarios.txt; exit 1; }
cat /tmp/zensalon-usuarios.txt

echo "== 3/3 Arquivos e URLs"
$C run --rm --no-deps -T -e SUPABASE_DB_URL -e SUPABASE_URL -e LIMPAR=1 zensalon-api \
  node --import tsx scripts/migracao/copiar-arquivos.ts > /tmp/zensalon-arquivos.txt 2>&1 \
  || { cat /tmp/zensalon-arquivos.txt; exit 1; }
cat /tmp/zensalon-arquivos.txt

echo "== Subindo a API"
$C up -d --no-deps zensalon-api

DUMP_DIR="${DUMP_DIR:-/opt/backups/zensalon}"
echo
echo "================ RESUMO ================"
printf '%-32s %10s %10s\n' "tabela" "Supabase" "VPS"
LC_ALL=C sort "$DUMP_DIR/contagem_supabase.txt" > /tmp/zs_src.txt
LC_ALL=C sort "$DUMP_DIR/contagem_vps.txt" > /tmp/zs_dst.txt
LC_ALL=C join /tmp/zs_src.txt /tmp/zs_dst.txt -a1 -a2 -e '-' -o '0,1.2,2.2' \
  | awk '{ printf "%-32s %10s %10s%s\n", $1, $2, $3, ($2 == $3 ? "" : "   <-- DIFERENTE") }'
echo
grep -E '^auth\.' /tmp/zensalon-usuarios.txt
grep -E '^(Arquivos|URLs|ainda)' /tmp/zensalon-arquivos.txt
