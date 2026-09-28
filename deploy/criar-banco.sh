#!/bin/sh
# Cria, no Postgres compartilhado da VPS, os papéis e bancos do ZenSalon. Idempotente.
#   zensalon_app  -> dono do banco zensalon (a API conecta como dona das tabelas; recebe a cópia do Supabase)
#   zensalon_auth -> dono do banco gotrue_zensalon, schema auth (o GoTrue migra o resto)
# Nenhum dos dois é superusuário. Os bancos novos não aceitam conexão de outros papéis (REVOKE ... FROM PUBLIC).
# Não altera nenhum banco ou papel existente (petshop, gotrue_petshop etc.).
# As senhas vêm do .env e entram pelo stdin (não aparecem no ps).
# Uso: sh deploy/criar-banco.sh
set -eu
cd "$(dirname "$0")/.."

PG_CONTAINER="${PG_CONTAINER:-vps-migrator-postgres}"
. ./.env
: "${ZENSALON_DB_PASSWORD:?faltou no .env}"
: "${GOTRUE_DB_PASSWORD:?faltou no .env}"

SUPERUSER=$(docker inspect "$PG_CONTAINER" --format '{{range .Config.Env}}{{println .}}{{end}}' | sed -n 's/^POSTGRES_USER=//p')
[ -n "$SUPERUSER" ] || { echo "Não encontrei o POSTGRES_USER de $PG_CONTAINER." >&2; exit 1; }

{
  printf "\\set app_pw '%s'\n\\set auth_pw '%s'\n" "$ZENSALON_DB_PASSWORD" "$GOTRUE_DB_PASSWORD"
  cat <<'SQL'
\set ON_ERROR_STOP on

SELECT format('CREATE ROLE zensalon_app LOGIN PASSWORD %L', :'app_pw')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'zensalon_app')
\gexec
SELECT format('CREATE ROLE zensalon_auth LOGIN PASSWORD %L', :'auth_pw')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'zensalon_auth')
\gexec

-- template0: o banco novo nasce com a collation atual do servidor.
SELECT 'CREATE DATABASE zensalon OWNER zensalon_app TEMPLATE template0 ENCODING ''UTF8'''
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'zensalon')
\gexec
SELECT 'CREATE DATABASE gotrue_zensalon OWNER zensalon_auth TEMPLATE template0 ENCODING ''UTF8'''
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'gotrue_zensalon')
\gexec

REVOKE ALL ON DATABASE zensalon FROM PUBLIC;
REVOKE ALL ON DATABASE gotrue_zensalon FROM PUBLIC;
ALTER ROLE zensalon_auth SET search_path = auth;

-- As migrations do GoTrue fazem GRANT ... TO postgres (papel sem login; na VPS já existe).
SELECT 'CREATE ROLE postgres NOLOGIN'
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'postgres')
\gexec

\connect gotrue_zensalon
CREATE SCHEMA IF NOT EXISTS auth AUTHORIZATION zensalon_auth;
SQL
} | docker exec -i "$PG_CONTAINER" psql -q -U "$SUPERUSER" -d postgres

echo "Bancos zensalon e gotrue_zensalon prontos."
