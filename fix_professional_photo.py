changes = 0

# ---------------------------------------------------------------
# 1) BookingPage.tsx - corrigir campo errado (p.photoUrl -> p.avatarUrl)
# ---------------------------------------------------------------
path1 = "frontend/src/BookingPage.tsx"
with open(path1, "r", encoding="utf-8") as f:
    c1 = f.read()

old1 = '{p.avatarUrl ? <img src={p.photoUrl} style={{width:"100%",height:"100%",objectFit:"cover"}} /> : "👩"}'
new1 = '{p.avatarUrl ? <img src={p.avatarUrl} style={{width:"100%",height:"100%",objectFit:"cover"}} /> : "👩"}'

if old1 in c1:
    c1 = c1.replace(old1, new1)
    with open(path1, "w", encoding="utf-8") as f:
        f.write(c1)
    changes += 1
    print("OK (1/2): BookingPage.tsx - foto do profissional corrigida (photoUrl -> avatarUrl)")
else:
    print("AVISO (1/2): trecho do BookingPage.tsx nao encontrado")

# ---------------------------------------------------------------
# 2) App.tsx - adicionar upload de foto no formulario de profissional
# ---------------------------------------------------------------
path2 = "frontend/src/App.tsx"
with open(path2, "r", encoding="utf-8") as f:
    c2 = f.read()

# 2a. Adicionar estado "uploadingAvatar" logo apos a declaracao de f() do ProfessionalsPage
old2a = """function ProfessionalsPage() {"""
new2a = """function ProfessionalsPage() {
  const [uploadingAvatar, setUploadingAvatar] = useState(false);"""

if old2a in c2:
    # so aplica na primeira ocorrencia (a funcao ProfessionalsPage)
    c2 = c2.replace(old2a, new2a, 1)
    changes += 1
    print("OK (2a/2): estado uploadingAvatar adicionado")
else:
    print("AVISO (2a/2): declaracao de ProfessionalsPage nao encontrada")

# 2b. Adicionar campo de upload de foto no formulario (dentro do Modal "Nova Profissional")
old2b = """      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nova Profissional">
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:4 }}>
          <Inp label="Nome completo *" value={form.fullName} onChange={f("fullName")} placeholder="Marina Santos" required grid="1/-1" />"""

new2b = """      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nova Profissional">
        <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:14 }}>
          <div style={{ width:64, height:64, borderRadius:"50%", overflow:"hidden", background:"#2a2a2a", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, border:"1px solid rgba(201,169,110,0.3)" }}>
            {form.avatarUrl ? <img src={form.avatarUrl} style={{ width:"100%", height:"100%", objectFit:"cover" }} /> : <span style={{ fontSize:24 }}>👩</span>}
          </div>
          <label style={{ padding:"8px 14px", borderRadius:8, border:"1px solid rgba(201,169,110,0.4)", background:"rgba(201,169,110,0.1)", color:"#c9a96e", fontSize:12, cursor:"pointer", fontWeight:600 }}>
            {uploadingAvatar ? "Enviando..." : "📁 Escolher Foto"}
            <input type="file" accept="image/*" style={{ display:"none" }} onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setUploadingAvatar(true);
              try {
                const ext = file.name.split(".").pop();
                const fileName = `professional-${Date.now()}.${ext}`;
                const { error } = await supabase.storage.from("tenant-assets").upload(fileName, file, { upsert:true, contentType:file.type });
                if (error) throw error;
                const { data: { publicUrl } } = supabase.storage.from("tenant-assets").getPublicUrl(fileName);
                setForm((p:any) => ({ ...p, avatarUrl: publicUrl }));
              } catch (err) { console.error(err); }
              finally { setUploadingAvatar(false); }
            }} />
          </label>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:4 }}>
          <Inp label="Nome completo *" value={form.fullName} onChange={f("fullName")} placeholder="Marina Santos" required grid="1/-1" />"""

if old2b in c2:
    c2 = c2.replace(old2b, new2b)
    changes += 1
    print("OK (2b/2): campo de upload de foto adicionado ao formulario de profissional")
else:
    print("AVISO (2b/2): bloco do Modal 'Nova Profissional' nao encontrado")

with open(path2, "w", encoding="utf-8") as f:
    f.write(c2)

print(f"\nTotal de mudancas aplicadas: {changes}/4")
