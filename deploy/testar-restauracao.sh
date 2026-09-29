#!/bin/sh
# Teste de restauração: restaura o dump mais recente de um banco num banco TEMPORÁRIO, compara a
# contagem de linhas de cada tabela com o banco original e apaga o temporário no fim (mesmo se falhar).
# O banco original só é lido.
# Uso (na VPS): sh /opt/apps/zensalon/deploy/testar-restauracao.sh [banco]   (padrão: zensalon)
set -eu
PG="${PG_CONTAINER:-vps-migrator-postgres}"
BASE="${BACKUP_DIR:-/opt/backups/diario}"
ORIG="${1:-zensalon}"
TEMP="restauro_teste_$ORIG"

DUMP=$(ls -1 "$BASE"/20??-??-??_????/"$ORIG.dump" 2>/dev/null | sort | tail -n 1)
[ -n "$DUMP" ] || { echo "Nenhum backup de $ORIG em $BASE" >&2; exit 1; }
echo "Dump: $DUMP"

sup() { docker exec -i -e PGOPTIONS='-c client_min_messages=error' "$PG" sh -c 'exec "$@" -U "$POSTGRES_USER"' sh "$@"; }
sql() { sup psql -d "$1" -X -q -tA -v ON_ERROR_STOP=1; }

echo "SELECT 1 FROM pg_database WHERE datname = '$TEMP'" | sql postgres | grep -q 1 \
  && { echo "O banco $TEMP já existe; apague-o antes (DROP DATABASE $TEMP)." >&2; exit 1; }
trap 'echo "DROP DATABASE IF EXISTS \"$TEMP\";" | sql postgres && echo "Banco temporário $TEMP apagado."' EXIT
echo "CREATE DATABASE \"$TEMP\";" | sql postgres

echo "Restaurando em $TEMP..."
sup pg_restore -d "$TEMP" --no-owner --no-privileges --exit-on-error < "$DUMP"

COUNT_SQL="SELECT format('SELECT %L, count(*) FROM %I.%I;', schemaname||'.'||tablename, schemaname, tablename)
  FROM pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema') ORDER BY 1"
contar() { echo "$COUNT_SQL" | sql "$1" | sup psql -d "$1" -X -q -tA -F ' ' -v ON_ERROR_STOP=1; }
contar "$ORIG" > /tmp/restauro_orig.txt
contar "$TEMP" > /tmp/restauro_temp.txt

N=$(wc -l < /tmp/restauro_orig.txt)
if diff /tmp/restauro_orig.txt /tmp/restauro_temp.txt; then
  echo "OK: $N tabelas, mesma contagem de linhas no original e no restaurado."
else
  echo "ATENÇÃO: diferenças acima (normal só se o sistema gravou dados depois do backup)." >&2
  exit 1
fi
