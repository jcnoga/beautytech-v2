#!/usr/bin/env node
/**
 * add-delete-template-button-v2.cjs
 *
 * Versao resistente a CRLF: insere por numero de linha, nao por
 * bloco de texto multi-linha.
 *
 * Uso: node add-delete-template-button-v2.cjs [caminho/para/App.tsx]
 */

const fs = require("fs");
const path = require("path");

const targetPath = process.argv[2] || path.join("src", "App.tsx");

if (!fs.existsSync(targetPath)) {
  console.error(`[ERRO] Arquivo nao encontrado: ${targetPath}`);
  process.exit(1);
}

const original = fs.readFileSync(targetPath, "utf8");

if (original.includes("deleteTemplate")) {
  console.log("[SKIP] 'deleteTemplate' ja existe no arquivo. Nada a fazer.");
  process.exit(0);
}

const usesCRLF = original.includes("\r\n");
const EOL = usesCRLF ? "\r\n" : "\n";
const lines = original.split(/\r\n|\n/);

console.log(`[INFO] Quebra de linha detectada: ${usesCRLF ? "CRLF" : "LF"}`);
console.log(`[INFO] Total de linhas: ${lines.length}`);

// --- 1. Encontrar linha da funcao (unica) ---
const funcAnchorIdx = lines.findIndex(l => l.trim() === "// Filtro de clientes");
if (funcAnchorIdx === -1) {
  console.error("[ERRO] Linha ancora '// Filtro de clientes' nao encontrada.");
  process.exit(1);
}

const deleteFunctionLines = [
  "  const deleteTemplate = async (t: any) => {",
  "    if (!confirm(`Excluir o template \"${t.name}\"? Essa acao nao pode ser desfeita.`)) return;",
  "    try {",
  "      await api.delete(`/automations/templates/${t.id}`);",
  "      setTemplates(ts => ts.filter(x => x.id !== t.id));",
  "    } catch (e: any) {",
  "      alert(\"Erro ao excluir: \" + e.message);",
  "    }",
  "  };",
];

lines.splice(funcAnchorIdx, 0, ...deleteFunctionLines);
console.log(`[OK] Funcao deleteTemplate inserida antes da linha ancora (${deleteFunctionLines.length} linhas).`);

// --- 2. Encontrar linha do botao Enviar (unica) ---
const btnAnchorIdx = lines.findIndex(l => l.includes('setShowSend(true); }}>Enviar</Btn>'));
if (btnAnchorIdx === -1) {
  console.error("[ERRO] Linha ancora do botao 'Enviar' nao encontrada.");
  process.exit(1);
}

const deleteButtonLine = '              <Btn small variant="danger" onClick={() => deleteTemplate(t)}>Deletar</Btn>';

lines.splice(btnAnchorIdx + 1, 0, deleteButtonLine);
console.log("[OK] Botao 'Deletar' inserido apos o botao 'Enviar'.");

// --- 3. Backup e escrita ---
let backupPath = `${targetPath}.bak`;
let counter = 1;
while (fs.existsSync(backupPath)) {
  backupPath = `${targetPath}.bak${counter}`;
  counter += 1;
}
fs.writeFileSync(backupPath, original, "utf8");
console.log(`[OK] Backup criado: ${backupPath}`);

const newContent = lines.join(EOL);
fs.writeFileSync(targetPath, newContent, "utf8");
console.log(`[OK] Arquivo atualizado: ${targetPath}`);
