content = open('C:/projetos/beautytech-v2/frontend/src/App.tsx', encoding='utf-8').read()

old = """function UpgradeButton({ color }: any) {
  const [loading, setLoading] = useState(false);
  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const r: any = await api.post("/billing/subscribe");
      if (r?.data?.paymentUrl) {
        window.open(r.data.paymentUrl, "_blank");
      } else {
        alert("Erro ao gerar link de pagamento. Tente novamente.");
      }
    } catch(e: any) {
      alert("Erro: " + e.message);
    } finally {
      setLoading(false);
    }
  };
  return (
    <button onClick={handleUpgrade} disabled={loading}
      style={{ fontSize:11, color, fontWeight:700, padding:"5px 12px", border:`1px solid ${color}40`, borderRadius:8, background:"transparent", cursor:"pointer", fontFamily:FB }}>
      {loading ? "Aguarde..." : "Upgrade"}
    </button>
  );
}"""

new = """function UpgradeButton({ color }: any) {
  const [loading, setLoading] = useState(false);
  const [showCpf, setShowCpf] = useState(false);
  const [cpf, setCpf] = useState("");
  const [savingCpf, setSavingCpf] = useState(false);

  const saveCpfAndUpgrade = async () => {
    setSavingCpf(true);
    try {
      await api.patch("/auth/me/settings", { cpfCnpj: cpf.replace(/\\D/g, "") });
      setShowCpf(false);
      await doUpgrade();
    } catch(e: any) {
      alert("Erro ao salvar CPF/CNPJ: " + e.message);
    } finally {
      setSavingCpf(false);
    }
  };

  const doUpgrade = async () => {
    setLoading(true);
    try {
      const r: any = await api.post("/billing/subscribe");
      if (r?.data?.paymentUrl) {
        window.open(r.data.paymentUrl, "_blank");
      } else {
        alert("Erro: " + (r?.error ?? "Tente novamente."));
      }
    } catch(e: any) {
      const msg = e.message ?? "";
      if (msg.includes("CPF/CNPJ")) {
        setShowCpf(true);
      } else {
        alert("Erro: " + msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button onClick={doUpgrade} disabled={loading}
        style={{ fontSize:11, color, fontWeight:700, padding:"5px 12px", border:`1px solid ${color}40`, borderRadius:8, background:"transparent", cursor:"pointer", fontFamily:FB }}>
        {loading ? "Aguarde..." : "Upgrade"}
      </button>
      <Modal open={showCpf} onClose={() => setShowCpf(false)} title="CPF/CNPJ necessario" width={380}>
        <div style={{ padding:"8px 0" }}>
          <div style={{ fontSize:13, color:C.textMuted, marginBottom:16, fontFamily:FB }}>
            Para gerar o link de pagamento, informe o CPF ou CNPJ do responsavel pelo salao.
          </div>
          <Inp label="CPF ou CNPJ" value={cpf} onChange={setCpf} placeholder="000.000.000-00 ou 00.000.000/0001-00" />
          <div style={{ display:"flex", gap:10, marginTop:16 }}>
            <Btn variant="secondary" onClick={() => setShowCpf(false)}>Cancelar</Btn>
            <Btn onClick={saveCpfAndUpgrade} disabled={savingCpf || cpf.replace(/\\D/g,"").length < 11}>
              {savingCpf ? "Salvando..." : "Salvar e Continuar"}
            </Btn>
          </div>
        </div>
      </Modal>
    </>
  );
}"""

if old in content:
    open('C:/projetos/beautytech-v2/frontend/src/App.tsx', 'w', encoding='utf-8').write(content.replace(old, new, 1))
    print('CORRIGIDO')
else:
    print('TRECHO NAO ENCONTRADO')
