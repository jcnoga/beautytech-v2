#!/bin/sh
# Backup diário de TODOS os bancos do Postgres compartilhado (vps-migrator-postgres: ZenSalon, PetShop,
# AgroConsult, AgroNexo, OdontoPro, GoTrues...) e do volume de uploads do ZenSalon.
# - Um pg_dump (formato custom) por banco + pg_dumpall --globals-only (papéis e senhas).
# - Guarda os 7 backups mais recentes em /opt/backups/diario/<data>.
# - Se existir /root/backup-r2.env, envia uma cópia CRIPTOGRAFADA (rclone crypt) para o Cloudflare R2 (rclone em
#   container, nada instalado na VPS) e confere com cryptcheck. Sem o remote crypt "r2c" no arquivo, não envia nada.
#   Os antigos são apagados pela regra de ciclo de vida do bucket (30 dias), não por este script: o token não
#   precisa apagar e um erro aqui nunca some com backup.
# - Evolution (WhatsApp): todos os bancos do evolution-postgres (arquivos evo_*). Na versão 2.3.x a sessão do
#   WhatsApp fica no banco (tabela evolution_api."Session"); a pasta de instâncias (/root/evolution-backup, montada
#   em /evolution/instances) só tem arquivos antigos de sessão, mas vai junto por ser pequena.
# - n8n: cópia ONLINE do SQLite (API de backup do SQLite, em container descartável da mesma imagem do n8n, sem
#   rede), integridade conferida antes de compactar, mais o resto do volume. O arquivo "config" do volume tem a
#   chave de criptografia das credenciais (sem ela as credenciais restauradas não abrem).
# Só lê os bancos; não para nem reinicia nenhum container; não altera nenhum sistema.
#
# /root/backup-r2.env (chmod 600). Senha e salt do crypt ficam guardados FORA da VPS (gerenciador de senhas e papel);
# aqui só a forma "obscure" do rclone, que a VPS precisa para criptografar (quem é root na VPS consegue revertê-la:
# a criptografia protege o que está no R2 e um vazamento do token, não uma invasão da VPS).
#   R2_BUCKET=vps-backups
#   RCLONE_CONFIG_R2_TYPE=s3
#   RCLONE_CONFIG_R2_PROVIDER=Cloudflare
#   RCLONE_CONFIG_R2_ACCESS_KEY_ID=...
#   RCLONE_CONFIG_R2_SECRET_ACCESS_KEY=...
#   RCLONE_CONFIG_R2_ENDPOINT=https://<id da conta>.r2.cloudflarestorage.com
#   RCLONE_CONFIG_R2_NO_CHECK_BUCKET=true          (token restrito ao bucket não lista buckets)
#   RCLONE_CONFIG_R2C_TYPE=crypt
#   RCLONE_CONFIG_R2C_REMOTE=r2:vps-backups/vps
#   RCLONE_CONFIG_R2C_PASSWORD=<rclone obscure da senha>
#   RCLONE_CONFIG_R2C_PASSWORD2=<rclone obscure do salt>
#
# Restaurar (em qualquer máquina, com a senha e o salt guardados fora): ver deploy/README.md, "Backup no R2".
#
# Uso (na VPS): sh /opt/apps/zensalon/deploy/backup-bancos.sh   (o cron roda todo dia; ver deploy/README.md)
set -eu
PG="${PG_CONTAINER:-vps-migrator-postgres}"
BASE="${BACKUP_DIR:-/opt/backups/diario}"
MANTER="${MANTER:-7}"
R2_ENV="${R2_ENV:-/root/backup-r2.env}"
RCLONE_IMAGE="${RCLONE_IMAGE:-rclone/rclone:1.68}"
UPLOADS_VOL="${UPLOADS_VOL:-zensalon_uploads}"
EVO_PG="${EVO_PG_CONTAINER:-evolution-postgres}"
EVO_DIR="${EVO_INSTANCES_DIR:-/root/evolution-backup}"
N8N="${N8N_CONTAINER:-n8n-k7u5-n8n-1}"
N8N_VOL="${N8N_VOL:-n8n-k7u5_n8n_data}"

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
psql_c() { c=$1; shift; docker exec -e PGOPTIONS='-c client_min_messages=error' "$c" sh -c 'exec "$@" -U "$POSTGRES_USER"' sh "$@"; }

FALHAS=0
# Todos os bancos de um container Postgres; $2 = prefixo dos arquivos ("" no compartilhado, nomes de sempre).
dump_container() {
  c=$1; p=$2
  psql_c "$c" pg_dumpall --globals-only > "$DIR/${p}globals.sql" || { echo "ERRO: ${p}globals"; FALHAS=$((FALHAS+1)); }
  BANCOS=$(psql_c "$c" psql -d postgres -X -tA -c "SELECT datname FROM pg_database WHERE NOT datistemplate AND datallowconn ORDER BY 1") \
    || { echo "ERRO: listar bancos de $c"; FALHAS=$((FALHAS+1)); return 0; }
  for b in $BANCOS; do
    if psql_c "$c" pg_dump -d "$b" --format=custom > "$DIR/$p$b.dump.tmp"; then
      mv "$DIR/$p$b.dump.tmp" "$DIR/$p$b.dump"
      echo "   $p$b: $(du -h "$DIR/$p$b.dump" | cut -f1)"
    else
      rm -f "$DIR/$p$b.dump.tmp"; echo "ERRO: pg_dump $p$b"; FALHAS=$((FALHAS+1))
    fi
  done
}
dump_container "$PG" ""

VOL=$(docker volume inspect "$UPLOADS_VOL" --format '{{.Mountpoint}}')
tar -czf "$DIR/$UPLOADS_VOL.tar.gz" -C "$VOL" . && echo "   uploads: $(du -h "$DIR/$UPLOADS_VOL.tar.gz" | cut -f1)" \
  || { echo "ERRO: uploads"; FALHAS=$((FALHAS+1)); }

# Evolution: bancos (sessão do WhatsApp incluída) + pasta de instâncias.
dump_container "$EVO_PG" "evo_"
tar -czf "$DIR/evo_instances.tar.gz" -C "$EVO_DIR" . && echo "   evo_instances: $(du -h "$DIR/evo_instances.tar.gz" | cut -f1)" \
  || { echo "ERRO: evo_instances"; FALHAS=$((FALHAS+1)); }

# n8n: nunca cp/tar do SQLite em uso. Cópia online num container descartável (mesma imagem do n8n que está no ar,
# sem rede, usuário 1000 como o n8n), modo DELETE (arquivo único) e integrity_check; só então entra no tar.
n8n_backup() {
  nvol=$(docker volume inspect "$N8N_VOL" --format '{{.Mountpoint}}') || return 1
  nimg=$(docker inspect -f '{{.Image}}' "$N8N") || return 1
  st=$(mktemp -d "$DIR/.n8n.XXXXXX") || return 1
  chown 1000:1000 "$st"
  if docker run --rm --network none --user 1000:1000 --entrypoint node -v "$N8N_VOL:/src" -v "$st:/out" "$nimg" -e '
    const { DatabaseSync, backup } = require("node:sqlite");
    (async () => {
      const src = new DatabaseSync("/src/database.sqlite");
      await backup(src, "/out/database.sqlite"); src.close();
      const c = new DatabaseSync("/out/database.sqlite");
      c.exec("PRAGMA journal_mode=DELETE");
      const ic = c.prepare("PRAGMA integrity_check").all().map((r) => Object.values(r)[0]).join(",");
      c.close();
      if (ic !== "ok") { console.error("integrity_check: " + ic); process.exit(2); }
    })().catch((e) => { console.error(e.message); process.exit(1); });' \
  && (cd "$nvol" && find . -mindepth 1 -maxdepth 1 ! -name 'database.sqlite*' ! -name crash.journal -exec cp -a {} "$st/" \;) \
  && tar -czf "$DIR/n8n_data.tar.gz" -C "$st" .; then
    rm -rf -- "$st"; echo "   n8n_data (SQLite íntegro): $(du -h "$DIR/n8n_data.tar.gz" | cut -f1)"
  else
    rm -rf -- "$st"; rm -f "$DIR/n8n_data.tar.gz"; return 1
  fi
}
n8n_backup || { echo "ERRO: n8n"; FALHAS=$((FALHAS+1)); }

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
  r2() { docker run --rm --env-file "$R2_ENV" -v "$BASE:/data:ro" "$RCLONE_IMAGE" "$@"; }
  if ! grep -q '^RCLONE_CONFIG_R2C_TYPE=crypt$' "$R2_ENV"; then
    echo "ERRO: $R2_ENV sem o remote crypt r2c; nada enviado (backup nunca sai sem criptografia)"; FALHAS=$((FALHAS+1))
  elif r2 copy "/data/$NOME" "r2c:$NOME" --stats-one-line --stats 0 && r2 cryptcheck "/data/$NOME" "r2c:$NOME" -q; then
    echo "   R2: enviado e conferido (criptografado) em r2c:$NOME"
  else
    echo "ERRO: envio ou conferência no R2"; FALHAS=$((FALHAS+1))
  fi
else
  echo "   R2: $R2_ENV não existe; cópia externa pulada"
fi

echo "   disco livre: $(df -h "$BASE" | awk 'NR==2 {print $4}')"
[ "$FALHAS" -eq 0 ] && echo "== OK" || { echo "== TERMINOU COM $FALHAS FALHA(S)"; exit 1; }
