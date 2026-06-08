
content = open("C:/projetos/beautytech-v2/frontend/src/App.tsx", encoding="utf-8").read()

old = '    { key:"action", label:"", render: (c: any) => (\n      <Btn small variant="secondary" onClick={(e: any) => { e.stopPropagation(); openEdit(c); }}>Editar</Btn>\n    )},'
new = '    { key:"action", label:"", render: (c: any) => (\n      <div style={{ display:"flex", gap:6 }}>\n        <Btn small variant="secondary" onClick={(e: any) => { e.stopPropagation(); openEdit(c); }}>Editar</Btn>\n        <Btn small variant="secondary" onClick={(e: any) => { e.stopPropagation(); setAnamneseClient(c); }}>Anamnese</Btn>\n      </div>\n    )},'
content = content.replace(old, new, 1)

old2 = '  const [showForm, setShowForm] = useState(false);\n  const [selected, setSelected] = useState<any>(null);'
new2 = """  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [anamneseClient, setAnamneseClient] = useState<any>(null);
  const [anamneseData, setAnamneseData] = useState<any>(null);
  const [anamneseForm, setAnamneseForm] = useState({ medications:"", medicalHistory:"", previousProcedures:"", skinType:"normal", contraindications:"", notes:"" });
  const [savingAnamnese, setSavingAnamnese] = useState(false);
  const loadAnamnese = async (clientId: string) => {
    try {
      const r: any = await api.get("/client-records/" + clientId);
      const rec = (r.data ?? [])[0];
      setAnamneseData(rec ?? null);
      if (rec) setAnamneseForm({ medications: rec.medications??"", medicalHistory: rec.medical_history??"", previousProcedures: rec.previous_procedures??"", skinType: rec.skin_type??"normal", contraindications: rec.contraindications??"", notes: rec.notes??"" });
    } catch(e) { setAnamneseData(null); }
  };
  useEffect(() => { if (anamneseClient) loadAnamnese(anamneseClient.id); }, [anamneseClient]);
  const saveAnamnese = async () => {
    setSavingAnamnese(true);
    try {
      if (anamneseData) { await api.patch("/client-records/" + anamneseData.id, anamneseForm); }
      else { await api.post("/client-records", { clientId: anamneseClient.id, ...anamneseForm }); }
      setAnamneseClient(null);
    } catch(e: any) { alert("Erro: " + e.message); }
    finally { setSavingAnamnese(false); }
  };"""
content = content.replace(old2, new2, 1)

old3 = "      <Modal open={showForm} onClose={() => setShowForm(false)} title={selected ? \"Editar Cliente\" : \"Nova Cliente\"}>"
new3 = """      <Modal open={!!anamneseClient} onClose={() => setAnamneseClient(null)} title={"Anamnese - " + (anamneseClient?.fullName ?? "")}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:4 }}>
          <Inp label="Medicamentos em uso" value={anamneseForm.medications} onChange={(v:string) => setAnamneseForm(p=>({...p,medications:v}))} placeholder="Ex: Anticoagulante" />
          <Inp label="Tipo de pele" value={anamneseForm.skinType} onChange={(v:string) => setAnamneseForm(p=>({...p,skinType:v}))} placeholder="normal, oleosa, seca..." />
          <Inp label="Historico medico" value={anamneseForm.medicalHistory} onChange={(v:string) => setAnamneseForm(p=>({...p,medicalHistory:v}))} placeholder="Doencas, cirurgias..." />
          <Inp label="Procedimentos anteriores" value={anamneseForm.previousProcedures} onChange={(v:string) => setAnamneseForm(p=>({...p,previousProcedures:v}))} placeholder="Ex: Peeling quimico" />
          <Inp label="Contraindicacoes" value={anamneseForm.contraindications} onChange={(v:string) => setAnamneseForm(p=>({...p,contraindications:v}))} placeholder="Ex: Gestante" />
          <Inp label="Observacoes" value={anamneseForm.notes} onChange={(v:string) => setAnamneseForm(p=>({...p,notes:v}))} placeholder="Notas adicionais..." />
        </div>
        <div style={{ display:"flex", gap:10, marginTop:8 }}>
          <Btn variant="secondary" onClick={() => setAnamneseClient(null)}>Cancelar</Btn>
          <Btn onClick={saveAnamnese} disabled={savingAnamnese}>{savingAnamnese ? "Salvando..." : "Salvar Anamnese"}</Btn>
        </div>
      </Modal>
      <Modal open={showForm} onClose={() => setShowForm(false)} title={selected ? "Editar Cliente" : "Nova Cliente"}>"""
content = content.replace(old3, new3, 1)

open("C:/projetos/beautytech-v2/frontend/src/App.tsx", "w", encoding="utf-8").write(content)
print("DONE" if "anamneseClient" in content else "ERRO")
