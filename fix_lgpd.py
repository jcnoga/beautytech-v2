content = open("C:/projetos/beautytech-v2/frontend/src/App.tsx", encoding="utf-8").read()

# 1. Adicionar estados para LGPD
old1 = "  const [anamneseClient, setAnamneseClient] = useState<any>(null);"
new1 = """  const [anamneseClient, setAnamneseClient] = useState<any>(null);
  const [lgpdClient, setLgpdClient] = useState<any>(null);
  const [lgpdData, setLgpdData] = useState<any>(null);
  const [lgpdSigning, setLgpdSigning] = useState(false);
  const loadLgpd = async (clientId: string) => {
    try {
      const r: any = await api.get("/consent-forms/" + clientId);
      const rec = (r.data ?? [])[0];
      setLgpdData(rec ?? null);
    } catch(e) { setLgpdData(null); }
  };
  useEffect(() => { if (lgpdClient) loadLgpd(lgpdClient.id); }, [lgpdClient]);
  const signLgpd = async () => {
    setLgpdSigning(true);
    try {
      if (!lgpdData) {
        const r: any = await api.post("/consent-forms", { clientId: lgpdClient.id, type: "lgpd", content: "Autorizo o uso dos meus dados pessoais conforme a LGPD (Lei 13.709/2018) para fins de prestacao de servicos." });
        await api.post("/consent-forms/" + r.data.id + "/sign", { signedByName: lgpdClient.fullName });
      } else if (!lgpdData.is_signed) {
        await api.post("/consent-forms/" + lgpdData.id + "/sign", { signedByName: lgpdClient.fullName });
      }
      await loadLgpd(lgpdClient.id);
      setLgpdSigning(false);
    } catch(e: any) { alert("Erro: " + e.message); setLgpdSigning(false); }
  };"""

content = content.replace(old1, new1, 1)

# 2. Adicionar botao LGPD na tabela
old2 = '        <Btn small variant="secondary" onClick={(e: any) => { e.stopPropagation(); setAnamneseClient(c); }}>Anamnese</Btn>'
new2 = '        <Btn small variant="secondary" onClick={(e: any) => { e.stopPropagation(); setAnamneseClient(c); }}>Anamnese</Btn>\n        <Btn small variant="secondary" onClick={(e: any) => { e.stopPropagation(); setLgpdClient(c); }}>LGPD</Btn>'
content = content.replace(old2, new2, 1)

# 3. Adicionar modal LGPD antes do modal de anamnese
old3 = '      <Modal open={!!anamneseClient}'
new3 = '''      <Modal open={!!lgpdClient} onClose={() => setLgpdClient(null)} title={"Consentimento LGPD - " + (lgpdClient?.fullName ?? "")}>
        {lgpdData?.is_signed ? (
          <div style={{ background:"#e8f5e9", border:"1px solid #a5d6a7", borderRadius:10, padding:16, marginBottom:16, color:"#2e7d32", fontSize:13 }}>
            ? Termo assinado em {lgpdData.signed_at ? new Date(lgpdData.signed_at).toLocaleDateString("pt-BR") : "-"}
          </div>
        ) : (
          <div style={{ background:"#fff3e0", border:"1px solid #ffcc80", borderRadius:10, padding:16, marginBottom:16, color:"#e65100", fontSize:13 }}>
            ? Termo ainda não assinado
          </div>
        )}
        <div style={{ background:"#f5f5f5", borderRadius:10, padding:16, marginBottom:16, fontSize:13, color:"#333", lineHeight:1.6 }}>
          <strong>Termo de Consentimento LGPD</strong><br/><br/>
          Autorizo o uso dos meus dados pessoais (nome, contato, histórico de atendimentos) conforme a Lei Geral de Proteção de Dados (LGPD - Lei 13.709/2018) para fins exclusivos de prestação de serviços neste estabelecimento.<br/><br/>
          Os dados não serão compartilhados com terceiros sem consentimento prévio.
        </div>
        <div style={{ display:"flex", gap:10, marginTop:8 }}>
          <Btn variant="secondary" onClick={() => setLgpdClient(null)}>Fechar</Btn>
          {!lgpdData?.is_signed && <Btn onClick={signLgpd} disabled={lgpdSigning}>{lgpdSigning ? "Registrando..." : "Registrar Assinatura"}</Btn>}
        </div>
      </Modal>
      <Modal open={!!anamneseClient}'''

content = content.replace(old3, new3, 1)

open("C:/projetos/beautytech-v2/frontend/src/App.tsx", "w", encoding="utf-8").write(content)
print("DONE" if "lgpdClient" in content else "ERRO")
