// patch-prospect-security.cjs
// Corrige: (1) fallback de API key hardcoded exposta, (2) instance/create disparado
// sem checar se a instância já existe (causa provável do loop de reconexão).
//
// Uso: node patch-prospect-security.cjs
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

let content = fs.readFileSync(FILE, "utf8");
const hasCRLF = content.includes("\r\n");
if (hasCRLF) log("INFO", "Arquivo usa CRLF - preservando");

// Backup incremental (.bak, .bak2, .bak3...)
let backupPath = FILE + ".bak";
let n = 1;
while (fs.existsSync(backupPath)) {
  n++;
  backupPath = FILE + ".bak" + n;
}
fs.writeFileSync(backupPath, content);
log("OK", `Backup criado em ${backupPath}`);

let changes = 0;

// ── FIX 1: remover fallback hardcoded "zensalon123" (4 ocorrências) ──
const oldKeyLine = 'const evolutionKey = process.env.EVOLUTION_API_KEY ?? "zensalon123";';
const newKeyLine = 'const evolutionKey = process.env.EVOLUTION_API_KEY;\n    if (!evolutionKey) {\n      return reply.status(500).send({ error: "EVOLUTION_API_KEY não configurada" });\n    }';

const keyOccurrences = content.split(oldKeyLine).length - 1;
if (keyOccurrences > 0) {
  content = content.split(oldKeyLine).join(newKeyLine);
  log("OK", `Fallback "zensalon123" removido em ${keyOccurrences} ocorrência(s)`);
  changes += keyOccurrences;
} else {
  log("SKIP", 'Padrão do fallback de key não encontrado (talvez já corrigido)');
}

// ── FIX 2: instance/create incondicional -> checar antes de criar ──
const oldConnectBlock = `    try {
      // Tenta criar instancia se nao existir
      await fetch(\`\${evolutionUrl}/instance/create\`, { method: "POST", headers: { "Content-Type": "application/json", "apikey": evolutionKey }, body: JSON.stringify({ instanceName: instance, qrcode: true, integration: "WHATSAPP-BAILEYS" }) });
    } catch {}
    try {
      const r = await fetch(\`\${evolutionUrl}/instance/connect/\${instance}\`, { headers: { "apikey": evolutionKey } });`;

const newConnectBlock = `    try {
      // Só cria a instância se ela ainda não existir (evita resetar sessão em pareamento)
      const checkResp = await fetch(\`\${evolutionUrl}/instance/connectionState/\${instance}\`, { headers: { "apikey": evolutionKey } });
      if (checkResp.status === 404) {
        await fetch(\`\${evolutionUrl}/instance/create\`, { method: "POST", headers: { "Content-Type": "application/json", "apikey": evolutionKey }, body: JSON.stringify({ instanceName: instance, qrcode: true, integration: "WHATSAPP-BAILEYS" }) });
      }
    } catch {}
    try {
      const r = await fetch(\`\${evolutionUrl}/instance/connect/\${instance}\`, { headers: { "apikey": evolutionKey } });`;

if (content.includes(oldConnectBlock)) {
  content = content.replace(oldConnectBlock, newConnectBlock);
  log("OK", "Lógica de instance/create corrigida (agora checa connectionState antes de criar)");
  changes += 1;
} else {
  log("SKIP", "Bloco de connect/create não encontrado exatamente como esperado - revisar manualmente");
}

if (changes > 0) {
  fs.writeFileSync(FILE, content);
  log("OK", `${changes} alteração(ões) aplicada(s) em ${FILE}`);
} else {
  log("SKIP", "Nenhuma alteração aplicada - arquivo pode já estar corrigido, ou o conteúdo mudou desde o grep");
  fs.unlinkSync(backupPath);
  log("INFO", "Backup removido (nada foi alterado)");
}
