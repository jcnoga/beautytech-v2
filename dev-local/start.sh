#!/bin/sh
# Sobe o ambiente LOCAL (Postgres + GoTrue no Docker), aplica as migrations e gera a configuração
# do backend e do frontend. Segredos de teste ficam em dev-local/.env.local-stack (fora do git).
# Depois: sh dev-local/api.sh  (backend, porta 3301)  e  sh dev-local/web.sh  (frontend, http://localhost:5273/app)
set -eu
cd "$(dirname "$0")"
ENVF=.env.local-stack
if [ ! -f "$ENVF" ]; then
  node -e '
const c = require("crypto");
const secret = c.randomBytes(32).toString("hex");
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const jwt = (role) => { const h = b64({ alg: "HS256", typ: "JWT" }), p = b64({ role, iss: "zensalon-local", iat: 1700000000, exp: 4102444800 });
  return h + "." + p + "." + c.createHmac("sha256", secret).update(h + "." + p).digest("base64url"); };
console.log(["JWT_SECRET=" + secret, "ANON_KEY=" + jwt("anon"), "SERVICE_KEY=" + jwt("service_role"),
  "SUPER_ADMIN_SECRET=" + c.randomBytes(24).toString("hex"), "SUPER_ADMIN_EMAIL=superadmin@local.test",
  "SUPER_ADMIN_PASSWORD=" + c.randomBytes(9).toString("base64url")].join("\n"));' > "$ENVF"
  echo "segredos de teste gerados em dev-local/$ENVF"
fi
set -a; . "./$ENVF"; set +a

cat > .env.backend <<EOB
# Gerado por dev-local/start.sh. Backend LOCAL: banco e GoTrue locais, nada externo ligado.
NODE_ENV=development
PORT=3301
HOST=127.0.0.1
LOG_LEVEL=warn
POSTGRES_URL=postgres://postgres:local@127.0.0.1:55433/zensalon_local
POSTGRES_SSL=false
GOTRUE_URL=http://127.0.0.1:9998
GOTRUE_JWT_SECRET=$JWT_SECRET
GOTRUE_SERVICE_KEY=$SERVICE_KEY
CORS_ORIGINS=http://localhost:5273
FRONTEND_URL=http://localhost:5273
UPLOADS_DIR=../dev-local/uploads
PUBLIC_UPLOADS_URL=/uploads
SUPER_ADMIN_SECRET=$SUPER_ADMIN_SECRET
SUPER_ADMIN_EMAIL=$SUPER_ADMIN_EMAIL
SUPER_ADMIN_PASSWORD=$SUPER_ADMIN_PASSWORD
RESEND_API_KEY=re_local_desativado
JOBS_ENABLED=false
WHATSAPP_SEND_ENABLED=false
ASAAS_BASE_URL=http://127.0.0.1:9
EVOLUTION_API_URL=http://127.0.0.1:9
WHATSAPP_API_URL=http://127.0.0.1:9
EOB

docker compose up -d
i=0; until curl -s -o /dev/null http://127.0.0.1:9998/health; do i=$((i+1)); [ "$i" -gt 60 ] && { docker compose logs gotrue | tail -20; exit 1; }; sleep 1; done
echo "GoTrue local no ar"
(cd ../backend && POSTGRES_URL=postgres://postgres:local@127.0.0.1:55433/zensalon_local node --import tsx scripts/local-migrate.ts)
echo "Pronto. Backend: sh dev-local/api.sh | Frontend: sh dev-local/web.sh | Parar: docker compose -f dev-local/docker-compose.yml down"
