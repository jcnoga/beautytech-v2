#!/usr/bin/env node
/**
 * add-delete-template-button.cjs
 *
 * Adiciona a funcao deleteTemplate() e o botao "Deletar" na tela de
 * Automacoes (App.tsx). O backend ja tinha a rota DELETE pronta.
 *
 * Uso: node add-delete-template-button.cjs [caminho/para/App.tsx]
 */

const fs = require("fs");
const path = require("path");

const targetPath = process.argv[2] || path.join("src", "App.tsx");

if (!fs.existsSync(targetPath)) {
  console.error(`[ERRO] Arquivo nao encontrado: ${targetPath}`);
  process.exit(1);
}

const original = fs.readFileSync(targetPath, "utf8");

const replacements = [
  {
    label: "Funcao deleteTemplate (apos toggleActive)",
    oldStr: `  const toggleActive = async (t: any) => {
    const r: any = await api.patch<any>(\`/automations/templates/\${t.id}\`, { isActive: !t.isActive });
    setTemplates(ts => ts.map(x => x.id === t.id ? r.data : x));
  };
  // Filtro de clientes`,
    newStr: `  const toggleActive = async (t: any) => {
    const r: any = await api.patch<any>(\`/automations/templates/\${t.id}\`, { isActive: !t.isActive });
    setTemplates(ts => ts.map(x => x.id === t.id ? r.data : x));
  };
  const deleteTemplate = async (t: any) => {
    if (!confirm(\`Excluir o template "\${t.name}"? Essa acao nao pode ser desfeita.\`)) return;
    try {
      await api.delete(\`/automations/templates/\${t.id}\`);
      setTemplates(ts => ts.filter(x => x.id !== t.id));
    } catch (e: any) {
      alert("Erro ao excluir: " + e.message);
    }
  };
  // Filtro de clientes`,
  },
  {
    label: "Botao Deletar no card de template",
    oldStr: `              <Btn small variant="secondary" onClick={() => { setSelected(t); setEditMsg(t.message); setShowEdit(true); }}>Editar</Btn>
              <Btn small onClick={() => { setSelected(t); setSearch(""); setSegFilter("all"); setBirthdayFilter(false); setSelectedClients([]); setShowSend(true); }}>Enviar</Btn>
              <span style={{ fontSize:10, color: t.isActive ? C.sage : C.textMuted, marginLeft:"auto", fontFamily:FB }}>`,
    newStr: `              <Btn small variant="secondary" onClick={() => { setSelected(t); setEditMsg(t.message); setShowEdit(true); }}>Editar</Btn>
              <Btn small onClick={() => { setSelected(t); setSearch(""); setSegFilter("all"); setBirthdayFilter(false); setSelectedClients([]); setShowSend(true); }}>Enviar</Btn>
              <Btn small variant="danger" onClick={() => deleteTemplate(t)}>Deletar</Btn>
              <span style={{ fontSize:10, color: t.isActive ? C.sage : C.textMuted, marginLeft:"auto", fontFamily:FB }}>`,
  },
];

let content = original;
let appliedCount = 0;

for (const r of replacements) {
  const occurrences = content.split(r.oldStr).length - 1;
  if (occurrences === 0) {
    console.log(`[SKIP] Padrao nao encontrado (talvez ja aplicado): ${r.label}`);
    continue;
  }
  if (occurrences > 1) {
    console.log(`[ERRO] Padrao ambiguo (${occurrences} ocorrencias), abortando: ${r.label}`);
    process.exit(1);
  }
  content = content.replace(r.oldStr, r.newStr);
  appliedCount += 1;
  console.log(`[OK] Aplicado: ${r.label}`);
}

if (appliedCount === 0) {
  console.log("");
  console.log("[SKIP] Nada foi alterado.");
  process.exit(0);
}

let backupPath = `${targetPath}.bak`;
let counter = 1;
while (fs.existsSync(backupPath)) {
  backupPath = `${targetPath}.bak${counter}`;
  counter += 1;
}
fs.writeFileSync(backupPath, original, "utf8");
console.log(`[OK] Backup criado: ${backupPath}`);

fs.writeFileSync(targetPath, content, "utf8");
console.log(`[OK] Arquivo atualizado: ${targetPath}`);
console.log("");
console.log(`Total de correcoes aplicadas: ${appliedCount}/2`);
