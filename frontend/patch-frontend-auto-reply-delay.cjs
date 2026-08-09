#!/usr/bin/env node
/**
 * patch-frontend-auto-reply-delay.cjs
 *
 * Adiciona o campo "Atraso da Recepcao Automatica" no painel do Super Admin,
 * seguindo o mesmo padrao visual e de chamada de API do campo "Dominio Proprio"
 * ja existente em src/App.tsx.
 *
 * Rode a partir da raiz do frontend: /c/projetos/beautytech-v2/frontend
 *   node patch-frontend-auto-reply-delay.cjs
 */

const fs = require("fs");
const path = require("path");

function log(status, msg) {
  console.log(`[${status}] ${msg}`);
}

function detectEOL(content) {
  return content.includes("\r\n") ? "\r\n" : "\n";
}

function backupPath(filePath) {
  let n = 1;
  let candidate = `${filePath}.bak${n}`;
  while (fs.existsSync(candidate)) {
    n += 1;
    candidate = `${filePath}.bak${n}`;
  }
  return candidate;
}

function applyPatch(filePath, patches) {
  if (!fs.existsSync(filePath)) {
    log("SKIP", `Arquivo nao encontrado: ${filePath}`);
    return;
  }
  const original = fs.readFileSync(filePath, "utf8");
  const eol = detectEOL(original);
  const normalized = original.replace(/\r\n/g, "\n");
  let content = normalized;
  let changed = false;

  for (const { label, find, replace } of patches) {
    const findNorm = find.replace(/\r\n/g, "\n");
    const replaceNorm = replace.replace(/\r\n/g, "\n");
    if (content.includes(findNorm)) {
      if (content.includes(replaceNorm)) {
        log("SKIP", `${filePath} :: "${label}" ja aplicado anteriormente`);
        continue;
      }
      content = content.split(findNorm).join(replaceNorm);
      changed = true;
      log("OK", `${filePath} :: "${label}" aplicado`);
    } else {
      log("SKIP", `${filePath} :: "${label}" ancora nao encontrada`);
    }
  }

  if (!changed) {
    log("SKIP", `Nenhuma alteracao aplicada em ${filePath}`);
    return;
  }

  if (eol === "\r\n") {
    content = content.replace(/\n/g, "\r\n");
  }

  const bak = backupPath(filePath);
  fs.writeFileSync(bak, original, "utf8");
  fs.writeFileSync(filePath, content, "utf8");
  log("OK", `Backup salvo em ${bak}`);
  log("OK", `${filePath} atualizado`);
}

const appFile = path.join("src", "App.tsx");

applyPatch(appFile, [
  {
    label: "estados de replyDelayMin/Max e status de salvamento",
    find: `  const [customDomain, setCustomDomain] = useState("");
  const [domainSaving, setDomainSaving] = useState(false);
  const [domainResult, setDomainResult] = useState<any>(null);
  const [domainError, setDomainError] = useState("");`,
    replace: `  const [customDomain, setCustomDomain] = useState("");
  const [domainSaving, setDomainSaving] = useState(false);
  const [domainResult, setDomainResult] = useState<any>(null);
  const [domainError, setDomainError] = useState("");
  const [replyDelayMin, setReplyDelayMin] = useState("5");
  const [replyDelayMax, setReplyDelayMax] = useState("8");
  const [delaySaving, setDelaySaving] = useState(false);
  const [delayError, setDelayError] = useState("");
  const [delaySuccess, setDelaySuccess] = useState(false);`,
  },
  {
    label: "funcao saveAutoReplyDelay",
    find: `  const impersonateTenant = async (id: string, name: string) => {`,
    replace: `  const saveAutoReplyDelay = async (id: string) => {
    setDelaySaving(true);
    setDelayError("");
    setDelaySuccess(false);
    try {
      const min = Number(replyDelayMin);
      const max = Number(replyDelayMax);
      if (min > max) {
        setDelayError("O minimo nao pode ser maior que o maximo.");
        return;
      }
      const res = await saFetch("PATCH", "/super-admin/tenants/" + id + "/auto-reply-delay", {
        replyDelayMinSeconds: min,
        replyDelayMaxSeconds: max,
      });
      if (res && res.success) {
        setDelaySuccess(true);
        load();
      } else {
        setDelayError((res && res.error) || "Erro ao salvar atraso.");
      }
    } catch (e) {
      setDelayError((e && e.message) || "Erro ao salvar atraso.");
      console.error(e);
    } finally {
      setDelaySaving(false);
    }
  };

  const impersonateTenant = async (id: string, name: string) => {`,
  },
  {
    label: "bloco visual do campo de atraso apos Dominio Proprio",
    find: `              <Btn variant="gold" full onClick={() => saveDomain(selected.id)} disabled={domainSaving || !customDomain}>
                {domainSaving ? "Salvando..." : "Salvar Dominio"}
              </Btn>
            </div>
            {/* Bloquear / Liberar */}`,
    replace: `              <Btn variant="gold" full onClick={() => saveDomain(selected.id)} disabled={domainSaving || !customDomain}>
                {domainSaving ? "Salvando..." : "Salvar Dominio"}
              </Btn>
            </div>

            {/* Atraso da Recepcao Automatica */}
            <div style={{ borderTop: \`1px solid \${C.border}\`, paddingTop:16, marginBottom:16 }}>
              <div style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:12 }}>Atraso da Recepcao Automatica</div>
              <div style={{ fontSize:12, color:C.textMuted, marginBottom:12 }}>
                Tempo de espera antes de enviar a resposta automatica no WhatsApp, para simular digitacao humana.
              </div>
              <div style={{ display:"flex", gap:8, marginBottom:12 }}>
                <Inp label="Minimo (segundos)" value={replyDelayMin} onChange={setReplyDelayMin} type="number" placeholder="5" />
                <Inp label="Maximo (segundos)" value={replyDelayMax} onChange={setReplyDelayMax} type="number" placeholder="8" />
              </div>
              {delayError && (
                <div style={{ fontSize:12, color:"#e5484d", marginBottom:12 }}>{delayError}</div>
              )}
              {delaySuccess && (
                <div style={{ fontSize:12, color:C.gold, marginBottom:12 }}>Atraso salvo com sucesso.</div>
              )}
              <Btn variant="gold" full onClick={() => saveAutoReplyDelay(selected.id)} disabled={delaySaving}>
                {delaySaving ? "Salvando..." : "Salvar Atraso"}
              </Btn>
            </div>
            {/* Bloquear / Liberar */}`,
  },
]);

console.log("\n=== Patch do frontend finalizado. Revise os [SKIP] acima. ===");
