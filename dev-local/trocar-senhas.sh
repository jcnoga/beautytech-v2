#!/bin/sh
# Troca as senhas dos 2 logins de teste LOCAIS (dono do salão e dono do Pilates) no GoTrue local
# e atualiza dev-local/.env.test-users. As senhas são pedidas sem aparecer na tela.
# Uso: sh dev-local/trocar-senhas.sh   (com o ambiente local no ar: sh dev-local/start.sh)
set -eu
cd "$(dirname "$0")"
set -a; . ./.env.local-stack; set +a

printf "Nova senha do dono do SALAO: ";   stty -echo; read -r SALAO_NEW;   stty echo; echo
printf "Nova senha do dono do PILATES: "; stty -echo; read -r PILATES_NEW; stty echo; echo
[ ${#SALAO_NEW} -ge 6 ] && [ ${#PILATES_NEW} -ge 6 ] || { echo "Senha precisa ter pelo menos 6 caracteres." >&2; exit 1; }

export SALAO_NEW PILATES_NEW
node -e '
const fs = require("fs");
const GOTRUE = "http://127.0.0.1:9998";
const H = { Authorization: "Bearer " + process.env.SERVICE_KEY, apikey: process.env.SERVICE_KEY, "Content-Type": "application/json" };
const file = ".env.test-users";
const env = Object.fromEntries(fs.readFileSync(file, "utf8").split(/\r?\n/).filter(l => l.includes("=")).map(l => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]));
(async () => {
  const r = await fetch(GOTRUE + "/admin/users?per_page=1000", { headers: H });
  if (!r.ok) throw new Error("GoTrue respondeu " + r.status + " (o ambiente local está no ar?)");
  const users = (await r.json()).users ?? [];
  for (const [key, pass] of [["SALAO", process.env.SALAO_NEW], ["PILATES", process.env.PILATES_NEW]]) {
    const email = env[key + "_EMAIL"];
    const u = users.find(x => x.email === email);
    if (!u) throw new Error("Usuário não encontrado no GoTrue local: " + email);
    const up = await fetch(GOTRUE + "/admin/users/" + u.id, { method: "PUT", headers: H, body: JSON.stringify({ password: pass }) });
    if (!up.ok) throw new Error("Falha ao trocar a senha de " + email + ": " + up.status + " " + await up.text());
    env[key + "_PASSWORD"] = pass;
    console.log("✓ senha trocada: " + email);
  }
  fs.writeFileSync(file, Object.entries(env).map(([k, v]) => k + "=" + v).join("\n") + "\n");
  console.log("✓ dev-local/.env.test-users atualizado");
})().catch(e => { console.error("✗ " + e.message); process.exit(1); });
'
