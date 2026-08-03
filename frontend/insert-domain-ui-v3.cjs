const fs = require("fs");

const FILE = "src/App.tsx";

if (!fs.existsSync(FILE)) {
  console.error("ERRO: rode este script de dentro de /c/projetos/beautytech-v2/frontend");
  process.exit(1);
}

let raw = fs.readFileSync(FILE, "utf8");
const hadCRLF = raw.includes("\r\n");
let content = raw.replace(/\r\n/g, "\n");

if (content.includes("Dominio Proprio")) {
  console.log("Bloco visual já existe no arquivo — nada a fazer.");
  process.exit(0);
}

const MARKER = "{/* Bloquear / Liberar */}";
const idx = content.indexOf(MARKER);

if (idx === -1) {
  console.error('ERRO: marcador "{/* Bloquear / Liberar */}" não encontrado.');
  process.exit(1);
}

fs.writeFileSync(FILE + ".bak-domain-v3", raw);

const visualBlock = `{/* Dominio Proprio */}
            <div style={{ borderTop: \`1px solid \${C.border}\`, paddingTop:16, marginBottom:16 }}>
              <div style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:12 }}>Dominio Proprio</div>
              <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:12 }}>
                <Inp label="Dominio (ex: www.salaodocliente.com.br)" value={customDomain} onChange={setCustomDomain} placeholder="www.salaodocliente.com.br" />
              </div>
              {domainError && (
                <div style={{ fontSize:12, color:"#e5484d", marginBottom:12 }}>{domainError}</div>
              )}
              {domainResult && (
                <div style={{ background: \`\${C.gold}10\`, border: \`1px solid \${C.gold}30\`, borderRadius:10, padding:12, marginBottom:12, fontSize:12, color:C.text }}>
                  <div style={{ fontWeight:700, marginBottom:6 }}>
                    {domainResult.dnsInstructions && domainResult.dnsInstructions.misconfigured ? "Aguardando configuracao de DNS" : "Dominio verificado"}
                  </div>
                  <div>Peca pro cliente criar este registro no DNS dele:</div>
                  <div style={{ marginTop:6, fontFamily:"monospace", fontSize:11 }}>
                    Tipo: {domainResult.dnsInstructions && domainResult.dnsInstructions.type}<br />
                    {domainResult.dnsInstructions && domainResult.dnsInstructions.type === "CNAME"
                      ? "Valor: " + domainResult.dnsInstructions.cnameTarget
                      : "IP: " + (domainResult.dnsInstructions && domainResult.dnsInstructions.aRecordIp)}
                  </div>
                </div>
              )}
              <Btn variant="gold" full onClick={() => saveDomain(selected.id)} disabled={domainSaving || !customDomain}>
                {domainSaving ? "Salvando..." : "Salvar Dominio"}
              </Btn>
            </div>
            `;

content = content.slice(0, idx) + visualBlock + content.slice(idx);

if (hadCRLF) content = content.replace(/\n/g, "\r\n");

fs.writeFileSync(FILE, content);
console.log("Bloco visual inserido com sucesso, logo antes de '{/* Bloquear / Liberar */}'.");
