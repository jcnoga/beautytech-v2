#!/usr/bin/env node
/**
 * add-auto-reply-section.cjs
 *
 * Integra o componente AutoReplySection dentro do WhatsAppPage.tsx,
 * logo apos o bloco de status de conexao.
 *
 * Uso: node add-auto-reply-section.cjs [caminho/para/WhatsAppPage.tsx]
 */

const fs = require("fs");
const path = require("path");

const targetPath = process.argv[2] || path.join("src", "WhatsAppPage.tsx");

if (!fs.existsSync(targetPath)) {
  console.error(`[ERRO] Arquivo nao encontrado: ${targetPath}`);
  process.exit(1);
}

const original = fs.readFileSync(targetPath, "utf8");

if (original.includes("AutoReplySection")) {
  console.log("[SKIP] 'AutoReplySection' ja existe no arquivo. Nada a fazer.");
  process.exit(0);
}

const usesCRLF = original.includes("\r\n");
const EOL = usesCRLF ? "\r\n" : "\n";
const lines = original.split(/\r\n|\n/);

// 1. Adicionar import logo apos a primeira linha de import
const importLineIdx = lines.findIndex((l) => l.startsWith("import { useState"));
if (importLineIdx === -1) {
  console.error("[ERRO] Linha de import 'useState' nao encontrada.");
  process.exit(1);
}
lines.splice(importLineIdx + 1, 0, 'import { AutoReplySection } from "./AutoReplySection";');
console.log("[OK] Import adicionado.");

// 2. Inserir <AutoReplySection /> como filho da div externa, logo antes do
// seu fechamento (uma linha antes do "  );" final, que deve ser o "    </div>"
// que fecha o wrapper externo do componente).
let closeIdx = -1;
for (let i = lines.length - 1; i >= 0; i--) {
  if (lines[i].trim() === ");") { closeIdx = i; break; }
}
if (closeIdx === -1) {
  console.error("[ERRO] Linha de fechamento '  );' nao encontrada no final do arquivo.");
  process.exit(1);
}

const outerDivCloseIdx = closeIdx - 1;
if (lines[outerDivCloseIdx].trim() !== "</div>") {
  console.error(`[ERRO] Linha anterior a ');' nao e '</div>' (encontrado: '${lines[outerDivCloseIdx]}'). Abortando por seguranca.`);
  process.exit(1);
}

// Insere ANTES do </div> externo, tornando o componente filho dele.
lines.splice(outerDivCloseIdx, 0, "      <AutoReplySection C={C} FD={FD} FB={FB} />");
console.log("[OK] <AutoReplySection /> inserido como filho da div externa.");

let backupPath = `${targetPath}.bak`;
let counter = 1;
while (fs.existsSync(backupPath)) {
  backupPath = `${targetPath}.bak${counter}`;
  counter += 1;
}
fs.writeFileSync(backupPath, original, "utf8");
console.log(`[OK] Backup criado: ${backupPath}`);

fs.writeFileSync(targetPath, lines.join(EOL), "utf8");
console.log(`[OK] Arquivo atualizado: ${targetPath}`);
