// patch-prospect-reconnect-fix.cjs
// Corrige o bug do instance/create disparado incondicionalmente no endpoint
// /super-admin/prospects/whatsapp/connect (causa provável do loop de QR code).
// Tolerante a CRLF (diferente do patch anterior).
//
// Uso: node patch-prospect-reconnect-fix.cjs
// Rodar a partir da raiz do projeto (c/projetos/beautytech-v2)

const fs = require("fs");
const path = require("path");

const FILE = path.join("backend", "src", "modules", "prospect.module.ts");

function log(status, msg) {
  console.log(`[${status}] ${msg}`);
}

if (!fs.existsSync(FILE)) {
  log("SKIP", `Arquivo não encontrado: ${FILE} (rode a partir da raiz do projeto)`);
  process.exit(1);
}

const raw = fs.readFileSync(FILE, "utf8");
const hasCRLF = raw.includes("\r\n");
log("INFO", hasCRLF ? "Arquivo usa CRLF - normalizando para o patch e restaurando no final" : "Arquivo usa LF");

// Normaliza pra LF só pra facilitar o match, depois converte de volta no final se precisar
let content = raw.replace(/\r\n/g, "\n");

// Backup incremental
let backupPath = FILE + ".bak";
let n = 1;
while (fs.existsSync(backupPath)) {
  n++;
  backupPath = FILE + ".bak" + n;
}
fs.writeFileSync(backupPath, raw);
log("OK", `Backup criado em ${backupPath}`);

const oldBlock = `    try {
      // Tenta criar instancia se nao existir
      await fetch(\`\${evolutionUrl}/instance/create\`, { method: "POST", headers: { "Content-Type": "application/json", "apikey": evolutionKey }, body: JSON.stringify({ instanceName: instance, qrcode: true, integration: "WHATSAPP-BAILEYS" }) });
    } catch {}
    try {
      const r = await fetch(\`\${evolutionUrl}/instance/connect/\${instance}\`, { headers: { "apikey": evolutionKey } });`;

const newBlock = `    try {
      // Só cria a instância se ela ainda não existir (evita resetar sessão em pareamento)
      const checkResp = await fetch(\`\${evolutionUrl}/instance/connectionState/\${instance}\`, { headers: { "apikey": evolutionKey } });
      if (checkResp.status === 404) {
        await fetch(\`\${evolutionUrl}/instance/create\`, { method: "POST", headers: { "Content-Type": "application/json", "apikey": evolutionKey }, body: JSON.stringify({ instanceName: instance, qrcode: true, integration: "WHATSAPP-BAILEYS" }) });
      }
    } catch {}
    try {
      const r = await fetch(\`\${evolutionUrl}/instance/connect/\${instance}\`, { headers: { "apikey": evolutionKey } });`;

if (content.includes(oldBlock)) {
  content = content.replace(oldBlock, newBlock);
  log("OK", "Lógica de instance/create corrigida (agora checa connectionState antes de criar)");

  const finalContent = hasCRLF ? content.replace(/\n/g, "\r\n") : content;
  fs.writeFileSync(FILE, finalContent);
  log("OK", `Alteração aplicada em ${FILE}`);
} else {
  log("SKIP", "Bloco não encontrado - o código pode ter formatação diferente do esperado");
  log("INFO", "Rode: sed -n '270,300p' backend/src/modules/prospect.module.ts e cole aqui pra eu ajustar o patch");
  fs.unlinkSync(backupPath);
}
