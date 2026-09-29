#!/bin/sh
# Lista os usuários do ZenSalon na VPS, só leitura: e-mail de login (GoTrue), e-mail do perfil,
# nome, papel, salão e se usuário/salão estão ativos. Ordenado por salão.
# Inclui quem existe só no GoTrue (sem perfil: não entra no sistema) e perfis sem usuário no GoTrue.
# Como gotrue_zensalon e zensalon são bancos separados, faz duas consultas e junta pelo id do usuário.
# Uso (na VPS): sh /opt/apps/zensalon/deploy/listar-usuarios.sh
set -eu
cd "$(dirname "$0")/.."
. ./.env
PG="${PG_CONTAINER:-vps-migrator-postgres}"
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT

q() { # q <usuário> <senha> <banco>  (SQL pelo stdin, sessão somente leitura)
  docker exec -i -e PGPASSWORD="$2" "$PG" psql -h 127.0.0.1 -U "$1" -d "$3" -X -q -tA -F '|' \
    -v ON_ERROR_STOP=1 -c 'SET default_transaction_read_only = on' -f -
}

q zensalon_auth "$GOTRUE_DB_PASSWORD" gotrue_zensalon > "$TMP/auth.txt" <<'SQL'
SELECT id, email, COALESCE(to_char(last_sign_in_at, 'YYYY-MM-DD'), '-')
FROM auth.users ORDER BY id;
SQL

q zensalon_app "$ZENSALON_DB_PASSWORD" zensalon > "$TMP/perfis.txt" <<'SQL'
SELECT up.auth_user_id, COALESCE(up.email, '-'), COALESCE(up.full_name, '-'), up.role,
       CASE WHEN up.is_active THEN 'sim' ELSE 'nao' END,
       COALESCE(btrim(t.name), '(sem salao)'),
       CASE WHEN t.id IS NULL THEN '-' WHEN t.deleted_at IS NOT NULL THEN 'excluido'
            WHEN t.is_active THEN 'sim' ELSE 'nao' END
FROM user_profiles up LEFT JOIN tenants t ON t.id = up.tenant_id
ORDER BY up.auth_user_id;
SQL

awk -F'|' '
  NR == FNR { login[$1] = $2; acesso[$1] = $3; next }
  { seen[$1] = 1
    l = ($1 in login) ? login[$1] : "(sem usuario no GoTrue)"
    a = ($1 in acesso) ? acesso[$1] : "-"
    print $6 "|" l "|" $2 "|" $3 "|" $4 "|" $5 "|" $7 "|" a }
  END { for (id in login) if (!(id in seen))
          print "(sem perfil)|" login[id] "|-|-|-|-|-|" acesso[id] }
' "$TMP/auth.txt" "$TMP/perfis.txt" | LC_ALL=C sort -t'|' -k1,1 -k2,2 > "$TMP/lista.txt"

fmt='%-26.26s %-32.32s %-32.32s %-22.22s %-12.12s %-6s %-8s %-10s\n'
printf "$fmt" "SALAO" "LOGIN (GOTRUE)" "E-MAIL DO PERFIL" "NOME" "PAPEL" "ATIVO" "SALAO_AT" "ULT_LOGIN"
# Salões primeiro; contas sem perfil (não entram no sistema) no fim.
{ grep -v '^(sem perfil)' "$TMP/lista.txt" || true; grep '^(sem perfil)' "$TMP/lista.txt" || true; }   | awk -F'|' -v fmt="$fmt" '{ printf fmt, $1, $2, $3, $4, $5, $6, $7, $8 }'
echo
printf 'usuarios no GoTrue: %s | perfis: %s | sem perfil: %s\n' \
  "$(wc -l < "$TMP/auth.txt")" "$(wc -l < "$TMP/perfis.txt")" "$(grep -c '^(sem perfil)' "$TMP/lista.txt" || true)"
