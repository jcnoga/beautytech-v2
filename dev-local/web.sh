#!/bin/sh
# Frontend LOCAL: http://localhost:5273/app  (Super Admin: http://localhost:5273/super-admin)
# O proxy do Vite leva /api e /uploads ao backend local e /auth/v1 ao GoTrue local.
set -eu
cd "$(dirname "$0")"
set -a; . ./.env.local-stack; set +a
cd ../frontend
# Endereço completo: o Git Bash converteria "/api/v1" em caminho do Windows.
export VITE_API_URL=http://localhost:5273/api/v1 VITE_SUPABASE_URL=http://localhost:5273 VITE_SUPABASE_ANON_KEY="$ANON_KEY"
export ZS_LOCAL_API=http://127.0.0.1:3301 ZS_LOCAL_GOTRUE=http://127.0.0.1:9998
exec npx vite --host localhost --port 5273 --strictPort
