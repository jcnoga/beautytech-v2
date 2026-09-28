#!/bin/sh
# Gera, NA VPS, o .env (infra) e o modelo do .env.api (integrações). Nunca sobrescreve arquivos existentes.
# Os dois ficam só na VPS (chmod 600) e nunca vão para o git. Guarde uma cópia no seu gerenciador de senhas.
# Uso: sh deploy/gerar-env.sh [domínio]   (padrão: vps.zensalon.com.br)
set -eu
cd "$(dirname "$0")/.."

HOST="${1:-vps.zensalon.com.br}"
NETWORK="vps-migrator_default"
DB_HOST="vps-migrator-postgres"
umask 077

# JWT HS256 assinado com $JWT (sem dependências além do openssl).
b64url() { openssl base64 -A | tr '+/' '-_' | tr -d '='; }
jwt() {
  now=$(date +%s)
  h=$(printf '{"alg":"HS256","typ":"JWT"}' | b64url)
  p=$(printf '{"role":"%s","iss":"zensalon","iat":%s,"exp":%s}' "$1" "$now" $((now + 315360000)) | b64url)
  s=$(printf '%s.%s' "$h" "$p" | openssl dgst -sha256 -hmac "$JWT" -binary | b64url)
  printf '%s.%s.%s' "$h" "$p" "$s"
}

if [ -e .env ]; then
  echo ".env já existe: nada foi alterado."
else
  # Gateway da rede Docker: é por ele que o Traefik (em network_mode host) chega aos containers.
  GATEWAY=$(docker network inspect "$NETWORK" --format '{{(index .IPAM.Config 0).Gateway}}')
  [ -n "$GATEWAY" ] || { echo "Não encontrei o gateway da rede $NETWORK." >&2; exit 1; }

  # Hex: seguro dentro de URLs, sem escape.
  APP_PW=$(openssl rand -hex 32)
  AUTH_PW=$(openssl rand -hex 32)
  JWT=$(openssl rand -hex 48)

  cat > .env <<EOF
# Gerado por deploy/gerar-env.sh em $(date -u +%Y-%m-%dT%H:%M:%SZ). Não versionar.
PUBLIC_HOST=$HOST
PUBLIC_URL=https://$HOST
ZENSALON_DB_PASSWORD=$APP_PW
GOTRUE_DB_PASSWORD=$AUTH_PW
DATABASE_URL=postgres://zensalon_app:$APP_PW@$DB_HOST:5432/zensalon
GOTRUE_DATABASE_URL=postgres://zensalon_auth:$AUTH_PW@$DB_HOST:5432/gotrue_zensalon?sslmode=disable
JWT_SECRET=$JWT
GOTRUE_SERVICE_KEY=$(jwt service_role)
GOTRUE_ANON_KEY=$(jwt anon)
TRUST_PROXY=$GATEWAY
EOF
  chmod 600 .env
  echo ".env criado (chmod 600). Domínio: $HOST. Proxy confiável: $GATEWAY."
fi

if [ -e .env.api ]; then
  echo ".env.api já existe: nada foi alterado."
else
  # Chaves comentadas: descomente e preencha com os valores do Railway.
  # Variável vazia (ex.: RESEND_FROM_EMAIL=) falha na validação da API; deixe comentada se não usar.
  cat > .env.api <<'EOF'
# Integrações da API do ZenSalon: copie os valores das variáveis do serviço no Railway. Não versionar.
# Obrigatórias (a API não sobe sem elas): SUPER_ADMIN_SECRET e RESEND_API_KEY.
#SUPER_ADMIN_SECRET=
#SUPER_ADMIN_EMAIL=
#SUPER_ADMIN_PASSWORD=
#RESEND_API_KEY=
#RESEND_FROM_EMAIL=
#RESEND_FROM_NAME=
#ASAAS_API_KEY=
#ASAAS_BASE_URL=
#ASAAS_ENV=
#ASAAS_WEBHOOK_TOKEN=
#ASAAS_TEST_EMAIL=
#EVOLUTION_API_URL=
#EVOLUTION_API_KEY=
#WHATSAPP_API_URL=
#WHATSAPP_API_KEY=
#WHATSAPP_INSTANCE=
#NOTIFY_OWNER_EMAIL=
#NOTIFY_OWNER_PHONE=
#LOG_LEVEL=info
# Jobs automáticos: true só no ambiente que atende os clientes (senão, mensagens em dobro).
JOBS_ENABLED=false
EOF
  chmod 600 .env.api
  echo ".env.api criado (chmod 600): preencha com os valores do Railway antes de subir a API."
fi
