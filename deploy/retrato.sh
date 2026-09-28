#!/bin/sh
# Retrato dos OUTROS sistemas da VPS (inclusive petshop-*), para comparar antes e depois do deploy do ZenSalon:
# containers (nome, status de saúde, hora de início, imagem) e código HTTPS de cada domínio
# publicado no Traefik. Não altera nada.
# Uso: sh deploy/retrato.sh > /tmp/antes.txt ; ... ; sh deploy/retrato.sh > /tmp/depois.txt ; diff /tmp/antes.txt /tmp/depois.txt
set -eu

echo "# containers"
docker ps -a --format '{{.Names}}' | grep -v '^zensalon-' | sort | while read -r name; do
  docker inspect "$name" --format '{{.Name}} running={{.State.Running}} health={{if .State.Health}}{{.State.Health.Status}}{{else}}-{{end}} started={{.State.StartedAt}} image={{.Image}}'
done

echo "# domínios"
docker ps --format '{{.Names}}' | grep -v '^zensalon-' | while read -r name; do
  docker inspect "$name" --format '{{range $k, $v := .Config.Labels}}{{println $k $v}}{{end}}'
done | sed -n 's/^traefik\.http\.routers\.[^ ]*\.rule .*Host(`\([^`]*\)`).*/\1/p' | sort -u | while read -r host; do
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "https://$host/" || echo "falha")
  echo "$host $code"
done
