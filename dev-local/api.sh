#!/bin/sh
# Backend LOCAL (porta 3301). Lê SÓ dev-local/.env.backend (DOTENV_CONFIG_PATH), nunca o backend/.env.
# As variáveis não passam pelo shell: o Git Bash converteria valores como /uploads em caminhos do Windows.
set -eu
cd "$(dirname "$0")/../backend"
mkdir -p ../dev-local/uploads
export DOTENV_CONFIG_PATH=../dev-local/.env.backend
exec npx tsx src/server.ts
