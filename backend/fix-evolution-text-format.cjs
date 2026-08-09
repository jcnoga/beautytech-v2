#!/usr/bin/env node
/**
 * fix-evolution-text-format.cjs
 *
 * Corrige o formato do corpo da requisicao para a Evolution API.
 *
 * Causa raiz: o codigo enviava { number, textMessage: { text } }, mas a
 * versao da Evolution API rodando no VPS exige { number, text } (sem o
 * aninhamento textMessage). Confirmado via teste direto com curl.
 *
 * Afeta:
 *  - src/modules/whatsapp/whatsapp.service.ts (sendTextMessage - usado por
 *    lembretes de agendamento, confirmacoes, etc via modo local/cloud)
 *  - src/modules/prospect.module.ts (endpoint send-one da prospeccao)
 *
 * Uso: node fix-evolution-text-format.cjs
 *   (roda a partir da pasta backend/, ou passe os caminhos manualmente)
 */

const fs = require("fs");
const path = require("path");

const targets = [
  {
    file: process.argv[2] || path.join("src", "modules", "whatsapp", "whatsapp.service.ts"),
    oldStr: `return evolutionRequest(apiUrl, apiKey, "/message/sendText/" + encodeURIComponent(instanceName), "POST", { number, textMessage: { text } });`,
    newStr: `return evolutionRequest(apiUrl, apiKey, "/message/sendText/" + encodeURIComponent(instanceName), "POST", { number, text });`,
    label: "whatsapp.service.ts - sendTextMessage",
  },
  {
    file: process.argv[3] || path.join("src", "modules", "prospect.module.ts"),
    oldStr: `body: JSON.stringify({ number: phone, textMessage: { text: msg } }),`,
    newStr: `body: JSON.stringify({ number: phone, text: msg }),`,
    label: "prospect.module.ts - send-one",
  },
];

let totalApplied = 0;

for (const t of targets) {
  if (!fs.existsSync(t.file)) {
    console.log(`[ERRO] Arquivo nao encontrado: ${t.file}`);
    continue;
  }

  const original = fs.readFileSync(t.file, "utf8");

  if (!original.includes(t.oldStr)) {
    if (original.includes(t.newStr)) {
      console.log(`[SKIP] Ja corrigido: ${t.label}`);
    } else {
      console.log(`[ERRO] Padrao nao encontrado em ${t.file}: ${t.label}`);
    }
    continue;
  }

  const occurrences = original.split(t.oldStr).length - 1;
  if (occurrences > 1) {
    console.log(`[ERRO] Padrao ambiguo (${occurrences}x) em ${t.file}, abortando: ${t.label}`);
    continue;
  }

  let backupPath = `${t.file}.bak`;
  let counter = 1;
  while (fs.existsSync(backupPath)) {
    backupPath = `${t.file}.bak${counter}`;
    counter += 1;
  }
  fs.writeFileSync(backupPath, original, "utf8");

  const updated = original.replace(t.oldStr, t.newStr);
  fs.writeFileSync(t.file, updated, "utf8");

  console.log(`[OK] Corrigido: ${t.label}`);
  console.log(`     Backup: ${backupPath}`);
  totalApplied += 1;
}

console.log("");
console.log(`Total corrigido: ${totalApplied}/${targets.length}`);
