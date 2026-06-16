content = open('frontend/src/App.tsx', encoding='utf-8').read()

old = '''  const save = async () => {
    setSaving(true);
    try {
      const payload: any = { ...form };
      if (!payload.categoryId) delete payload.categoryId;
      const r: any = await servicesApi.create(payload);
      setData(d => [...d, r.data]);
      setShowForm(false);
    } catch(e: any) {
      alert("Erro: " + e.message);
    } finally { setSaving(false); }
  };

  const toggleActive = async (s: any) => {
    try {
      const r: any = await servicesApi.update(s.id, { isActive: !s.isActive });
      setData(d => d.map((x: any) => x.id === s.id ? r.data : x));
    } catch(e) { console.error(e); }
  };

  const cols = [
    { key:"name", label:"Servico", render: (s: any) => <span style={{ fontWeight:600, color: C.text }}>{s.name}</span> },
    { key:"categoryName", label:"Categoria", render: (s: any) => <Badge label={s.categoryName ?? s.category?.name ?? "-"} color={C.rose} /> },
    { key:"durationMinutes", label:"Duracao", render: (s: any) => <span style={{ color: C.textSec }}>{s.durationMinutes}min</span> },
    { key:"price", label:"Preco", render: (s: any) => <span style={{ fontWeight:700, color: C.gold }}>{brl(s.price)}</span> },
    { key:"isOnlineBookable", label:"Online", render: (s: any) => <Badge label={s.isOnlineBookable ? "Sim" : "Nao"} color={s.isOnlineBookable ? C.sage : C.textMuted} /> },
    { key:"isActive", label:"Status", render: (s: any) => <Badge label={s.isActive ? "Ativo" : "Inativo"} color={s.isActive ? C.sage : C.textMuted} /> },
    { key:"action", label:"", render: (s: any) => (
      <Btn small variant="danger" onClick={(e: any) => { e.stopPropagation(); toggleActive(s); }}>
        {s.isActive ? "Desativar" : "Ativar"}
      </Btn>
    )},
  ];

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:400 }}>
      <div style={{ color: C.textMuted, fontFamily: FB }}>Carregando servicos...</div>
    </div>
  );

  return (
    <div>
      <PageHeader title="Servicos" sub={`${data.filter((s: any) => s.isActive).length} servicos ativos`} action={<Btn onClick={() => setShowForm(true)}>+ Novo Servico</Btn>} />
      <Table cols={cols} rows={data} />
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Novo Servico">
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:4 }}>
          <Inp label="Nome" value={form.name} onChange={f("name")} required placeholder="Coloracao Completa" grid="1/-1" />
          <Sel label="Categoria" value={form.categoryId} onChange={f("categoryId")} options={categories.map((c: any) => ({ value:c.id, label:c.name }))} />
          <Inp label="Duracao (min)" value={form.durationMinutes} onChange={f("durationMinutes")} type="number" placeholder="60" />
          <Inp label="Preco (R$)" value={form.price} onChange={f("price")} type="number" placeholder="180.00" grid="1/-1" />
        </div>
        <div style={{ display:"flex", gap:10, marginTop:8 }}>
          <Btn variant="secondary" onClick={() => setShowForm(false)}>Cancelar</Btn>
          <Btn onClick={save} disabled={saving}>{saving ? "Salvando..." : "Criar Servico"}</Btn>
        </div>
      </Modal>
    </div>
  );
}'''

new = '''  const save = async () => {
    setSaving(true);
    try {
      const payload: any = { ...form };
      if (!payload.categoryId) delete payload.categoryId;
      const r: any = await servicesApi.create(payload);
      setData(d => [...d, r.data]);
      setShowForm(false);
      setForm({ name:"", categoryId:"", durationMinutes:"60", price:"", isActive:true });
    } catch(e: any) { alert("Erro: " + e.message); }
    finally { setSaving(false); }
  };

  const saveCat = async () => {
    if (!catForm.name.trim()) return alert("Informe o nome da categoria");
    setSavingCat(true);
    try {
      const r: any = await servicesApi.createCategory(catForm);
      setCategories(c => [...c, r.data]);
      setShowCatForm(false);
      setCatForm({ name:"", description:"" });
    } catch(e: any) { alert("Erro: " + e.message); }
    finally { setSavingCat(false); }
  };

  const deleteCat = async (id: string) => {
    if (!confirm("Remover esta categoria?")) return;
    try {
      await servicesApi.deleteCategory(id);
      setCategories(c => c.filter((x: any) => x.id !== id));
    } catch(e: any) { alert("Erro: " + e.message); }
  };

  const toggleActive = async (s: any) => {
    try {
      const r: any = await servicesApi.update(s.id, { isActive: !s.isActive });
      setData(d => d.map((x: any) => x.id === s.id ? r.data : x));
    } catch(e) { console.error(e); }
  };

  const cols = [
    { key:"name", label:"Servico", render: (s: any) => <span style={{ fontWeight:600, color: C.text }}>{s.name}</span> },
    { key:"categoryName", label:"Categoria", render: (s: any) => <Badge label={s.categoryName ?? s.category?.name ?? "-"} color={C.rose} /> },
    { key:"durationMinutes", label:"Duracao", render: (s: any) => <span style={{ color: C.textSec }}>{s.durationMinutes}min</span> },
    { key:"price", label:"Preco", render: (s: any) => <span style={{ fontWeight:700, color: C.gold }}>{brl(s.price)}</span> },
    { key:"isOnlineBookable", label:"Online", render: (s: any) => <Badge label={s.isOnlineBookable ? "Sim" : "Nao"} color={s.isOnlineBookable ? C.sage : C.textMuted} /> },
    { key:"isActive", label:"Status", render: (s: any) => <Badge label={s.isActive ? "Ativo" : "Inativo"} color={s.isActive ? C.sage : C.textMuted} /> },
    { key:"action", label:"", render: (s: any) => (
      <Btn small variant="danger" onClick={(e: any) => { e.stopPropagation(); toggleActive(s); }}>
        {s.isActive ? "Desativar" : "Ativar"}
      </Btn>
    )},
  ];

  const catCols = [
    { key:"name", label:"Categoria", render: (c: any) => <span style={{ fontWeight:600, color: C.text }}>{c.name}</span> },
    { key:"description", label:"Descricao", render: (c: any) => <span style={{ color: C.textSec }}>{c.description ?? "-"}</span> },
    { key:"action", label:"", render: (c: any) => (
      <Btn small variant="danger" onClick={(e: any) => { e.stopPropagation(); deleteCat(c.id); }}>
        Remover
      </Btn>
    )},
  ];

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:400 }}>
      <div style={{ color: C.textMuted, fontFamily: FB }}>Carregando servicos...</div>
    </div>
  );

  const tabStyle = (tab: string) => ({
    padding: "8px 20px",
    borderRadius: 8,
    border: "none",
    cursor: "pointer",
    fontFamily: FB,
    fontSize: 13,
    fontWeight: 600,
    background: activeTab === tab ? C.rose : "transparent",
    color: activeTab === tab ? "#fff" : C.textMuted,
    transition: "all 0.2s",
  });

  return (
    <div>
      <div style={{ display:"flex", gap:8, marginBottom:20 }}>
        <button style={tabStyle("services")} onClick={() => setActiveTab("services")}>Servicos</button>
        <button style={tabStyle("categories")} onClick={() => setActiveTab("categories")}>Categorias</button>
      </div>
      {activeTab === "services" && (
        <div>
          <PageHeader title="Servicos" sub={`${data.filter((s: any) => s.isActive).length} servicos ativos`} action={<Btn onClick={() => setShowForm(true)}>+ Novo Servico</Btn>} />
          <Table cols={cols} rows={data} />
          <Modal open={showForm} onClose={() => setShowForm(false)} title="Novo Servico">
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:4 }}>
              <Inp label="Nome" value={form.name} onChange={f("name")} required placeholder="Coloracao Completa" grid="1/-1" />
              <Sel label="Categoria" value={form.categoryId} onChange={f("categoryId")} options={categories.map((c: any) => ({ value:c.id, label:c.name }))} />
              <Inp label="Duracao (min)" value={form.durationMinutes} onChange={f("durationMinutes")} type="number" placeholder="60" />
              <Inp label="Preco (R$)" value={form.price} onChange={f("price")} type="number" placeholder="180.00" grid="1/-1" />
            </div>
            <div style={{ display:"flex", gap:10, marginTop:8 }}>
              <Btn variant="secondary" onClick={() => setShowForm(false)}>Cancelar</Btn>
              <Btn onClick={save} disabled={saving}>{saving ? "Salvando..." : "Criar Servico"}</Btn>
            </div>
          </Modal>
        </div>
      )}
      {activeTab === "categories" && (
        <div>
          <PageHeader title="Categorias" sub={`${categories.length} categorias cadastradas`} action={<Btn onClick={() => setShowCatForm(true)}>+ Nova Categoria</Btn>} />
          <Table cols={catCols} rows={categories} />
          <Modal open={showCatForm} onClose={() => setShowCatForm(false)} title="Nova Categoria">
            <div style={{ display:"grid", gap:4 }}>
              <Inp label="Nome" value={catForm.name} onChange={fc("name")} required placeholder="Ex: Cabelo, Unhas, Estetica" />
              <Inp label="Descricao (opcional)" value={catForm.description} onChange={fc("description")} placeholder="Descricao da categoria" />
            </div>
            <div style={{ display:"flex", gap:10, marginTop:8 }}>
              <Btn variant="secondary" onClick={() => setShowCatForm(false)}>Cancelar</Btn>
              <Btn onClick={saveCat} disabled={savingCat}>{savingCat ? "Salvando..." : "Criar Categoria"}</Btn>
            </div>
          </Modal>
        </div>
      )}
    </div>
  );
}'''

if old in content:
    content = content.replace(old, new)
    print("PARTE 2 OK")
else:
    print("PARTE 2 NAO ENCONTRADA")

open('frontend/src/App.tsx', 'w', encoding='utf-8').write(content)
