const fs = require("fs");

const FILE = "src/App.tsx";

if (!fs.existsSync(FILE)) {
  console.error("ERRO: rode este script de dentro de /c/projetos/beautytech-v2/frontend");
  process.exit(1);
}

let content = fs.readFileSync(FILE, "utf8");

if (content.includes("saveDomain")) {
  console.log("Já existe código de domínio no arquivo — nada a fazer.");
  process.exit(0);
}

// backup
fs.writeFileSync(FILE + ".bak-domain", content);

let changes = 0;

// 1) useState novos, logo depois da linha do whatsappMode
const useStateAnchor = 'const [whatsappMode, setWhatsappMode] = useState("manual");';
const useStateBlock = `
  const [customDomain, setCustomDomain] = useState("");
  const [domainSaving, setDomainSaving] = useState(false);
  const [domainResult, setDomainResult] = useState<any>(null);
  const [domainError, setDomainError] = useState("");`;

if (content.includes(useStateAnchor)) {
  content = content.replace(useStateAnchor, useStateAnchor + useStateBlock);
  changes++;
} else {
  console.error("AVISO: âncora do useState não encontrada, pulei essa parte.");
}

// 2) função saveDomain, logo depois do fim de saveWhatsappMode
const funcAnchor = `      whatsapp_instance: whatsappInstance || null,
      });
      load();
    } catch(e) { console.error(e); }
    finally { setSaving(false); }
  };`;

const funcBlock = `
  const saveDomain = async (id: string) => {
    setDomainSaving(true);
    setDomainError("");
    setDomainResult(null);
    try {
      const res: any = await saFetch("PATCH", "/super-admin/tenants/" + id + "/custom-domain", {
        domain: customDomain,
      });
      if (res?.success) {
        setDomainResult(res.data);
        load();
      } else {
        setDomainError(res?.error ?? "Erro ao salvar domínio.");
      }
    } catch (e: any) {
      setDomainError(e?.message ?? "Erro ao salvar domínio.");
      console.error(e);
    } finally {
      setDomainSaving(false);
    }
  };`;

if (content.includes(funcAnchor)) {
  content = content.replace(funcAnchor, funcAnchor + funcBlock);
  changes++;
} else {
  console.error("AVISO: âncora da função saveWhatsappMode não encontrada, pulei essa parte.");
}

// 3) pré-preencher customDomain nos 2 lugares que setam whatsappMode a partir de t.whatsapp_mode
const prefillAnchor = 'setMetaWabaId(t.meta_waba_id ?? ""); }';
const prefillReplacement = 'setMetaWabaId(t.meta_waba_id ?? ""); setCustomDomain(t.custom_domain ?? ""); }';

let prefillCount = content.split(prefillAnchor).length - 1;
if (prefillCount > 0) {
  content = content.split(prefillAnchor).join(prefillReplacement);
  changes += prefillCount;
} else {
  console.error("AVISO: âncora de pré-preenchimento não encontrada, pulei essa parte.");
}

// 4) bloco visual, logo depois do botão "Salvar WhatsApp" e antes de "Bloquear / Liberar"
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
            <div style={{ borderTop:\`1px solid \${C.border}\`, paddingTop:16, marginBottom:16 }}>
              <div style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:12 }}>Dominio Proprio</div>
              <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:12 }}>
                <Inp label="Dominio (ex: www.salaodocliente.com.br)" value={customDomain} onChange={setCustomDomain} placeholder="www.salaodocliente.com.br" />
              </div>
              {domainError && (
                <div style={{ fontSize:12, color:C.danger ?? "#e5484d", marginBottom:12 }}>{domainError}</div>
              )}
              {domainResult && (
                <div style={{ background:\`\${C.gold}10\`, border:\`1px solid \${C.gold}30\`, borderRadius:10, padding:12, marginBottom:12, fontSize:12, color:C.text }}>
                  <div style={{ fontWeight:700, marginBottom:6 }}>
                    {domainResult.dnsInstructions?.misconfigured ? "Aguardando configuracao de DNS" : "Dominio verificado"}
                  </div>
                  <div>Peca pro cliente criar este registro no DNS dele:</div>
                  <div style={{ marginTop:6, fontFamily:"monospace", fontSize:11 }}>
                    Tipo: {domainResult.dnsInstructions?.type}<br />
                    {domainResult.dnsInstructions?.type === "CNAME"
                      ? <>Valor: {domainResult.dnsInstructions?.cnameTarget}</>
                      : <>IP: {domainResult.dnsInstructions?.aRecordIp}</>}
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
  console.error("AVISO: âncora do bloco visual não encontrada, pulei essa parte.");
}

fs.writeFileSync(FILE, content);
console.log(`Concluído. ${changes} inserção(ões) aplicada(s). Backup em ${FILE}.bak-domain`);
