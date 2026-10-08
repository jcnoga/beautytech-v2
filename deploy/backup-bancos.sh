#!/bin/sh
# Backup diário de TODOS os bancos do Postgres compartilhado (vps-migrator-postgres: ZenSalon, PetShop,
# AgroConsult, AgroNexo, OdontoPro, GoTrues...) e do volume de uploads do ZenSalon.
# - Um pg_dump (formato custom) por banco + pg_dumpall --globals-only (papéis e senhas).
# - Guarda os 7 backups mais recentes em /opt/backups/diario/<data>.
# - Se existir /root/backup-r2.env, envia uma cópia para o Cloudflare R2 (rclone em container, nada
#   instalado na VPS) e apaga no R2 o que tiver mais de R2_DIAS dias (padrão 30).
# Só lê os bancos; não altera nenhum sistema.
#
# /root/backup-r2.env (chmod 600):
#   R2_BUCKET=<nome do bucket>
#   RCLONE_CONFIG_R2_TYPE=s3
#   RCLONE_CONFIG_R2_PROVIDER=Cloudflare
#   RCLONE_CONFIG_R2_ACCESS_KEY_ID=...
#   RCLONE_CONFIG_R2_SECRET_ACCESS_KEY=...
#   RCLONE_CONFIG_R2_ENDPOINT=https://<id da conta>.r2.cloudflarestorage.com
#   RCLONE_CONFIG_R2_NO_CHECK_BUCKET=true
#
# Uso (na VPS): sh /opt/apps/zensalon/deploy/backup-bancos.sh   (o cron roda todo dia; ver deploy/README.md)
set -eu
PG="${PG_CONTAINER:-vps-migrator-postgres}"
BASE="${BACKUP_DIR:-/opt/backups/diario}"
MANTER="${MANTER:-7}"
R2_ENV="${R2_ENV:-/root/backup-r2.env}"
R2_DIAS="${R2_DIAS:-30}"
RCLONE_IMAGE="${RCLONE_IMAGE:-rclone/rclone:1.68}"
UPLOADS_VOL="${UPLOADS_VOL:-zensalon_uploads}"

# Nenhum comando daqui lê a entrada: fechá-la evita que docker exec/run engulam o que vem depois de quem chamou
# (ex.: o resto de um bloco enviado por ssh, que antes sumia sem aviso).
exec < /dev/null

# Nunca duas execuções ao mesmo tempo.
exec 9> /var/lock/backup-bancos.lock
flock -n 9 || { echo "Outro backup em andamento; saindo."; exit 1; }

NOME=$(date -u +%Y-%m-%d_%H%M)
DIR="$BASE/$NOME"
umask 077
mkdir -p "$DIR"
echo "== $(date -u '+%F %T') UTC  backup em $DIR"

# Superusuário do próprio container (conexão pelo socket local, sem senha).
psql_pg() { docker exec -e PGOPTIONS='-c client_min_messages=error' "$PG" sh -c 'exec "$@" -U "$POSTGRES_USER"' sh "$@"; }

FALHAS=0
psql_pg pg_dumpall --globals-only > "$DIR/globals.sql" || { echo "ERRO: globals"; FALHAS=$((FALHAS+1)); }

BANCOS=$(psql_pg psql -d postgres -X -tA -c "SELECT datname FROM pg_database WHERE NOT datistemplate AND datallowconn ORDER BY 1")
for b in $BANCOS; do
  if psql_pg pg_dump -d "$b" --format=custom > "$DIR/$b.dump.tmp"; then
    mv "$DIR/$b.dump.tmp" "$DIR/$b.dump"
    echo "   $b: $(du -h "$DIR/$b.dump" | cut -f1)"
  else
    rm -f "$DIR/$b.dump.tmp"; echo "ERRO: pg_dump $b"; FALHAS=$((FALHAS+1))
  fi
done

VOL=$(docker volume inspect "$UPLOADS_VOL" --format '{{.Mountpoint}}')
tar -czf "$DIR/$UPLOADS_VOL.tar.gz" -C "$VOL" . && echo "   uploads: $(du -h "$DIR/$UPLOADS_VOL.tar.gz" | cut -f1)" \
  || { echo "ERRO: uploads"; FALHAS=$((FALHAS+1)); }

(cd "$DIR" && sha256sum -- * > SHA256SUMS)

# Retenção local: só pastas no formato de data, mantém as $MANTER mais recentes.
ls -1d "$BASE"/20??-??-??_???? 2>/dev/null | sort | head -n -"$MANTER" | while read -r velho; do
  rm -rf -- "$velho" && echo "   removido: $velho"
done

# Backups do "Excluir conta" (Super Admin): dados pessoais de contas excluídas. Pasta só do root (700) e
# retenção de $CONTAS_DIAS dias, contados da exclusão; depois disso são apagados aqui, automaticamente.
CONTAS_DIR="${CONTAS_DIR:-/opt/backups/contas}"
CONTAS_DIAS="${CONTAS_DIAS:-90}"
if [ -d "$CONTAS_DIR" ]; then
  chmod 700 "$CONTAS_DIR"
  find "$CONTAS_DIR" -mindepth 1 -maxdepth 1 -type d -name '20??-??-??_*' -mtime +"$CONTAS_DIAS" -print -exec rm -rf -- {} + \
    | sed 's/^/   conta removida (mais de '"$CONTAS_DIAS"' dias): /'
fi

if [ -f "$R2_ENV" ]; then
  R2_BUCKET=$(sed -n 's/^R2_BUCKET=//p' "$R2_ENV")
  r2() { docker run --rm --env-file "$R2_ENV" -v "$BASE:/data:ro" "$RCLONE_IMAGE" "$@"; }
  if r2 copy "/data/$NOME" "r2:$R2_BUCKET/vps/$NOME" --stats-one-line --stats 0; then
    echo "   R2: enviado para $R2_BUCKET/vps/$NOME"
    r2 delete "r2:$R2_BUCKET/vps" --min-age "${R2_DIAS}d" || echo "AVISO: limpeza antiga no R2 falhou"
  else
    echo "ERRO: envio para o R2"; FALHAS=$((FALHAS+1))
  fi
else
  echo "   R2: $R2_ENV não existe; cópia externa pulada"
fi

echo "   disco livre: $(df -h "$BASE" | awk 'NR==2 {print $4}')"
[ "$FALHAS" -eq 0 ] && echo "== OK" || { echo "== TERMINOU COM $FALHAS FALHA(S)"; exit 1; }
