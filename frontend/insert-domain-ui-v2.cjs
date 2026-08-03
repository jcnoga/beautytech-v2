const fs = require("fs");

const FILE = "src/App.tsx";

if (!fs.existsSync(FILE)) {
  console.error("ERRO: rode este script de dentro de /c/projetos/beautytech-v2/frontend");
  process.exit(1);
}

let raw = fs.readFileSync(FILE, "utf8");
const hadCRLF = raw.includes("\r\n");
let content = raw.replace(/\r\n/g, "\n"); // normaliza pra LF, evita problema de comparação

if (content.includes("saveDomain")) {
  console.log("Já existe código de saveDomain no arquivo — nada a fazer.");
  process.exit(0);
}

fs.writeFileSync(FILE + ".bak-domain-v2", raw);

let changes = 0;
const missing = [];

// 2) função saveDomain
const funcAnchor = `      whatsapp_instance: whatsappInstance || null,
      });
      load();
    } catch(e) { console.error(e); }
    finally { setSaving(false); }
  };`;

const funcBlock = `

  const saveDomain = async (id) => {
    setDomainSaving(true);
    setDomainError("");
    setDomainResult(null);
    try {
      const res = await saFetch("PATCH", "/super-admin/tenants/" + id + "/custom-domain", {
        domain: customDomain,
      });
      if (res && res.success) {
        setDomainResult(res.data);
        load();
      } else {
        setDomainError((res && res.error) || "Erro ao salvar domínio.");
      }
    } catch (e) {
      setDomainError((e && e.message) || "Erro ao salvar domínio.");
      console.error(e);
    } finally {
      setDomainSaving(false);
    }
  };`;

if (content.includes(funcAnchor)) {
  content = content.replace(funcAnchor, funcAnchor + funcBlock);
  changes++;
} else {
  missing.push("função saveDomain");
}

// 3) pré-preencher customDomain (2 ocorrências)
const prefillAnchor = 'setMetaWabaId(t.meta_waba_id ?? ""); }';
const prefillReplacement = 'setMetaWabaId(t.meta_waba_id ?? ""); setCustomDomain(t.custom_domain ?? ""); }';
const prefillCount = content.split(prefillAnchor).length - 1;

if (prefillCount > 0) {
  content = content.split(prefillAnchor).join(prefillReplacement);
  changes += prefillCount;
} else {
  missing.push("pré-preenchimento (2x)");
}

// 4) bloco visual
const visualAnchor = `{saving ? "Salvando..." : "Salvar WhatsApp"}
              </Btn>
            </div>
            </div>
            {/* Bloquear / Liberar */}`;

const visualBlock = `{saving ? "Salvando..." : "Salvar WhatsApp"}
              </Btn>
            </div>
            </div>
            {/* Dominio Proprio */}
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
            {/* Bloquear / Liberar */}`;

if (content.includes(visualAnchor)) {
  content = content.replace(visualAnchor, visualBlock);
  changes++;
} else {
  missing.push("bloco visual");
}

// devolve CRLF se o arquivo original usava CRLF, pra não misturar estilos
if (hadCRLF) content = content.replace(/\n/g, "\r\n");

fs.writeFileSync(FILE, content);
console.log(`Concluído. ${changes} inserção(ões) aplicada(s).`);
if (missing.length > 0) {
  console.log("NÃO encontrado (pulado): " + missing.join(", "));
} else {
  console.log("Tudo aplicado com sucesso.");
}
