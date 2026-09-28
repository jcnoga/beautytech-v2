#!/bin/sh
# Copia o schema public do Supabase (56 tabelas, todos os dados) para o banco zensalon da VPS.
# - pg_dump/pg_restore 17 num container descartável (o pg_dump precisa ser >= versão do Supabase).
# - Tudo fica com dono zensalon_app (a API conecta como dona das tabelas); sem GRANTs do Supabase.
# - Remove as políticas RLS e desliga a RLS (não há PostgREST na VPS).
# - Registra as migrations Drizzle 0000–0002 como aplicadas (o banco já tem essas tabelas).
# - Confere a contagem de linhas de cada tabela nos dois lados.
# O Supabase não é alterado (só leitura).
#
# Uso (na VPS, na pasta do projeto):
#   read -rs SUPABASE_DB_URL && export SUPABASE_DB_URL   # cole a URL do Session Pooler (não fica no histórico)
#   sh deploy/copiar-banco.sh             # recusa se o banco zensalon já tiver tabelas
#   RECRIAR=1 sh deploy/copiar-banco.sh   # apaga o schema public do zensalon (só na VPS) e copia de novo
set -eu
cd "$(dirname "$0")/.."

: "${SUPABASE_DB_URL:?defina SUPABASE_DB_URL (URL do Session Pooler do Supabase)}"
. ./.env
: "${DATABASE_URL:?faltou no .env}"
PG_IMAGE="${PG_IMAGE:-postgres:17-alpine}"
NETWORK="vps-migrator_default"
DUMP_DIR="${DUMP_DIR:-/opt/backups/zensalon}"
DUMP="zensalon_public_$(date -u +%Y%m%dT%H%M%SZ).dump"
mkdir -p "$DUMP_DIR" && chmod 700 "$DUMP_DIR"

# psql/pg_dump/pg_restore num container na rede do Postgres da VPS. As URLs vão por variável de ambiente.
pg() { SRC="$SUPABASE_DB_URL" DST="$DATABASE_URL" docker run --rm -i --network "$NETWORK" -v "$DUMP_DIR:/dump" -e SRC -e DST "$PG_IMAGE" "$@"; }
dst_sql() { pg sh -c 'psql "$DST" -X -q -v ON_ERROR_STOP=1 -tA'; }

TABLES=$(echo "SELECT count(*) FROM pg_tables WHERE schemaname='public';" | dst_sql)
if [ "$TABLES" != "0" ]; then
  if [ "${RECRIAR:-}" != "1" ]; then
    echo "O banco zensalon já tem $TABLES tabelas. Para apagar e copiar de novo: RECRIAR=1 sh deploy/copiar-banco.sh" >&2
    exit 1
  fi
  echo "Apagando o schema public do zensalon (VPS)..."
  printf 'SET client_min_messages = warning;
DROP SCHEMA public CASCADE;\nCREATE SCHEMA public;\nDROP SCHEMA IF EXISTS drizzle CASCADE;\n' | dst_sql
fi

echo "1/5 pg_dump do Supabase (schema public) -> $DUMP_DIR/$DUMP"
pg sh -c "pg_dump \"\$SRC\" --schema=public --no-owner --no-privileges --format=custom --file=/dump/$DUMP"

echo "2/5 pg_restore no zensalon"
# Erros esperados e inofensivos: 'schema public already exists' e 'transaction_timeout' (pg_dump 17 -> Postgres 15).
pg sh -c "pg_restore --no-owner --no-privileges --dbname=\"\$DST\" /dump/$DUMP" 2>&1 \
  | grep -vE 'schema "public" already exists|transaction_timeout|errors ignored on restore|^(pg_restore: )?(error: could not execute query|Command was: (CREATE SCHEMA public|SET transaction_timeout)|while PROCESSING TOC|from TOC entry)|^$' || true

echo "3/5 Removendo políticas RLS, desligando a RLS e movendo o CPF/CNPJ para a coluna"
dst_sql <<'SQL'
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public' LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND rowsecurity LOOP
    EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', r.tablename);
  END LOOP;
END $$;
SQL

# O CPF/CNPJ informado na tela de upgrade ficava em tenants.settings; agora a coluna cpf_cnpj é a fonte.
echo "UPDATE tenants SET cpf_cnpj = COALESCE(cpf_cnpj, regexp_replace(settings->>'cpfCnpj', '\D', '', 'g')), settings = settings - 'cpfCnpj' WHERE settings ? 'cpfCnpj';" | dst_sql

echo "4/5 Registrando migrations Drizzle 0000-0002 como aplicadas"
docker compose -f docker-compose.vps.yml run --rm --no-deps -T zensalon-api node --import tsx scripts/migracao/registrar-migrations.ts

echo "5/5 Conferindo linhas por tabela (Supabase x VPS)"
COUNT_SQL="SELECT format('SELECT %L, count(*) FROM public.%I;', tablename, tablename) FROM pg_tables WHERE schemaname='public' ORDER BY tablename"
pg sh -c "psql \"\$SRC\" -X -tA -c \"$COUNT_SQL\" | (echo 'SET default_transaction_read_only = on;'; cat) | psql \"\$SRC\" -X -q -tA -F ' '" > "$DUMP_DIR/contagem_supabase.txt"
pg sh -c "psql \"\$DST\" -X -tA -c \"$COUNT_SQL\" | psql \"\$DST\" -X -tA -F ' '" > "$DUMP_DIR/contagem_vps.txt"
if diff "$DUMP_DIR/contagem_supabase.txt" "$DUMP_DIR/contagem_vps.txt"; then
  echo "OK: $(wc -l < "$DUMP_DIR/contagem_vps.txt") tabelas, mesma contagem de linhas nos dois lados."
else
  echo "ATENÇÃO: contagens diferentes (acima). Se o site no Supabase recebeu gravações durante a cópia, repita com RECRIAR=1." >&2
  exit 1
fi
echo "Dump guardado em $DUMP_DIR/$DUMP (contém dados de clientes: apague quando não precisar mais)."
