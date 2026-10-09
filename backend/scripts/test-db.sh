#!/bin/sh
# Roda os testes do backend contra um Postgres 15 descartável no Docker (porta 55432, para não
# conflitar com outros Postgres da máquina). O container é removido no fim, mesmo se os testes falharem.
# Uso (na pasta backend): sh scripts/test-db.sh [arquivos de teste...]
set -eu
cd "$(dirname "$0")/.."
NAME=zensalon-test-pg
PORT="${TEST_PG_PORT:-55432}"

docker rm -f "$NAME" >/dev/null 2>&1 || true
docker run -d --rm --name "$NAME" -e POSTGRES_PASSWORD=test -e POSTGRES_DB=zensalon_test \
  -p "127.0.0.1:$PORT:5432" postgres:15-alpine >/dev/null
trap 'docker rm -f "$NAME" >/dev/null 2>&1 || true' EXIT

i=0
until docker exec "$NAME" pg_isready -h 127.0.0.1 -U postgres -d zensalon_test >/dev/null 2>&1; do
  i=$((i + 1)); [ "$i" -gt 60 ] && { echo "Postgres de teste não subiu" >&2; exit 1; }
  sleep 1
done
sleep 1

export TEST_DATABASE_URL="postgres://postgres:test@127.0.0.1:$PORT/zensalon_test"
if [ "$#" -gt 0 ]; then
  node --import tsx --test "$@"
else
  npm test --silent
fi
