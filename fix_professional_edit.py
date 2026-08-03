path = "frontend/src/App.tsx"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

changes = 0

# 1. Adicionar estado editingId
old1 = """function ProfessionalsPage() {
  const [uploadingAvatar, setUploadingAvatar] = useState(false);"""
new1 = """function ProfessionalsPage() {
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);"""
if old1 in content:
    content = content.replace(old1, new1, 1)
    changes += 1
    print("OK (1/6): estado editingId adicionado")
else:
    print("AVISO (1/6): declaracao de ProfessionalsPage nao encontrada")

# 2. Ajustar save() para fazer update quando estiver editando
old2 = """  const save = async () => {
    if (!form.fullName) return alert("Informe o nome.");
    setSaving(true);
    try {
      const payload: any = { ...form };
      if (!payload.monthlyGoal) delete payload.monthlyGoal;
      if (!payload.whatsapp) delete payload.whatsapp;
      if (!payload.email) delete payload.email;
      const r: any = await professionalsApi.create(payload);
      setData(d => [...d, r.data]);
      setShowForm(false);
      setForm({ fullName:"", whatsapp:"", email:"", commissionPct:"50", monthlyGoal:"", color:"#E8A598" });
    } catch(e: any) {
      alert("Erro: " + e.message);
    } finally { setSaving(false); }
  };"""
new2 = """  const save = async () => {
    if (!form.fullName) return alert("Informe o nome.");
    setSaving(true);
    try {
      const payload: any = { ...form };
      if (!payload.monthlyGoal) delete payload.monthlyGoal;
      if (!payload.whatsapp) delete payload.whatsapp;
      if (!payload.email) delete payload.email;
      if (editingId) {
        const r: any = await professionalsApi.update(editingId, payload);
        setData(d => d.map((p:any) => p.id === editingId ? r.data : p));
      } else {
        const r: any = await professionalsApi.create(payload);
        setData(d => [...d, r.data]);
      }
      setShowForm(false);
      setEditingId(null);
      setForm({ fullName:"", whatsapp:"", email:"", commissionPct:"50", monthlyGoal:"", color:"#E8A598" });
    } catch(e: any) {
      alert("Erro: " + e.message);
    } finally { setSaving(false); }
  };
  const startEdit = (p: any) => {
    setEditingId(p.id);
    setForm({
      fullName: p.fullName ?? "",
      whatsapp: p.whatsapp ?? "",
      email: p.email ?? "",
      commissionPct: p.commissionPct ?? "50",
      monthlyGoal: p.monthlyGoal ?? "",
      color: p.color ?? "#E8A598",
      avatarUrl: p.avatarUrl ?? "",
    } as any);
    setShowForm(true);
  };"""
if old2 in content:
    content = content.replace(old2, new2)
    changes += 1
    print("OK (2/6): save() agora suporta edicao (update) e startEdit() criado")
else:
    print("AVISO (2/6): funcao save() nao encontrada")

# 3. Mostrar foto real no circulo do card da listagem (em vez de so a inicial)
old3 = """              <div style={{ width:48, height:48, borderRadius:"50%", background:`${p.color ?? C.rose}25`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, border:`2px solid ${p.color ?? C.rose}40` }}>
                {(p.fullName ?? "?")[0]}
              </div>"""
new3 = """              <div style={{ width:48, height:48, borderRadius:"50%", background:`${p.color ?? C.rose}25`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, border:`2px solid ${p.color ?? C.rose}40`, overflow:"hidden" }}>
                {p.avatarUrl ? <img src={p.avatarUrl} style={{ width:"100%", height:"100%", objectFit:"cover" }} /> : (p.fullName ?? "?")[0]}
              </div>"""
if old3 in content:
    content = content.replace(old3, new3)
    changes += 1
    print("OK (3/6): card da listagem agora mostra foto real quando existir")
else:
    print("AVISO (3/6): trecho do circulo/avatar do card nao encontrado")

# 4. Adicionar botao "Editar" ao lado de "Servicos e Agenda"
old4 = """              <button onClick={() => setScheduleProf(p)} style={{ padding:"8px 12px", borderRadius:8, border:"1px solid rgba(201,169,110,0.4)", background:"rgba(201,169,110,0.1)", color:"#c9a96e", fontSize:12, cursor:"pointer", fontWeight:600, marginTop:12, width:"100%" }}>Servicos e Agenda</button>
            </div>
          </div>
        ))}"""
new4 = """              <button onClick={() => setScheduleProf(p)} style={{ padding:"8px 12px", borderRadius:8, border:"1px solid rgba(201,169,110,0.4)", background:"rgba(201,169,110,0.1)", color:"#c9a96e", fontSize:12, cursor:"pointer", fontWeight:600, marginTop:12, width:"100%" }}>Servicos e Agenda</button>
            </div>
            <button onClick={() => startEdit(p)} style={{ padding:"8px 12px", borderRadius:8, border:"1px solid rgba(255,255,255,0.15)", background:"transparent", color: C.textMuted, fontSize:12, cursor:"pointer", fontWeight:600, marginTop:8, width:"100%" }}>✏️ Editar</button>
          </div>
        ))}"""
if old4 in content:
    content = content.replace(old4, new4)
    changes += 1
    print("OK (4/6): botao Editar adicionado ao card")
else:
    print("AVISO (4/6): botao 'Servicos e Agenda' nao encontrado")

# 5. Modal: titulo dinamico (Nova Profissional / Editar Profissional)
old5 = """      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nova Profissional">"""
new5 = """      <Modal open={showForm} onClose={() => { setShowForm(false); setEditingId(null); }} title={editingId ? "Editar Profissional" : "Nova Profissional"}>"""
if old5 in content:
    content = content.replace(old5, new5)
    changes += 1
    print("OK (5/6): titulo do Modal agora e dinamico")
else:
    print("AVISO (5/6): abertura do Modal nao encontrada")

# 6. Botao Cancelar tambem deve limpar editingId
old6 = """        <div style={{ display:"flex", gap:10, marginTop:8 }}>
          <Btn variant="secondary" onClick={() => setShowForm(false)}>Cancelar</Btn>
          <Btn onClick={save} disabled={saving}>{saving ? "Salvando..." : "Cadastrar"}</Btn>
        </div>
      </Modal>
    </div>
  );
}
// --- SERVI"""
new6 = """        <div style={{ display:"flex", gap:10, marginTop:8 }}>
          <Btn variant="secondary" onClick={() => { setShowForm(false); setEditingId(null); }}>Cancelar</Btn>
          <Btn onClick={save} disabled={saving}>{saving ? "Salvando..." : (editingId ? "Salvar Alteracoes" : "Cadastrar")}</Btn>
        </div>
      </Modal>
    </div>
  );
}
// --- SERVI"""
if old6 in content:
    content = content.replace(old6, new6)
    changes += 1
    print("OK (6/6): botao Cancelar e texto do botao Salvar ajustados")
else:
    print("AVISO (6/6): rodape do formulario nao encontrado")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print(f"\nTotal de mudancas aplicadas: {changes}/6")
