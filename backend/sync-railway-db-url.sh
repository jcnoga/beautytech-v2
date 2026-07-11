#!/usr/bin/env bash
# ============================================================
# sync-railway-db-url.sh
# Lê POSTGRES_URL do .env local e aplica no Railway.
# Uso: bash sync-railway-db-url.sh
# (Rode a partir da pasta backend/)
# ============================================================

set -e

if [ ! -f ".env" ]; then
  echo "ERRO: .env não encontrado. Rode a partir da pasta backend/."
  exit 1
fi

DB_URL=$(grep "^POSTGRES_URL=" .env | head -n 1 | cut -d '=' -f2-)

if [ -z "$DB_URL" ]; then
  echo "ERRO: POSTGRES_URL não encontrada ou vazia no .env"
  exit 1
fi

echo "Encontrada POSTGRES_URL no .env (não vou exibir o valor por segurança)."
echo "Aplicando no Railway..."

npx @railway/cli variables --set "POSTGRES_URL=${DB_URL}"

echo ""
echo "Concluído. Variável sincronizada do .env local para o Railway."
