import { useEffect, useState, useRef } from "react";
import { api, supabase } from "./api/client";

const C = {
  bg: "#0f0f0f", card: "#1a1a1a", border: "rgba(255,255,255,0.08)",
  gold: "#c9a96e", rose: "#e8a598", sage: "#7eb8a0",
  text: "#f0ece4", textMuted: "rgba(255,255,255,0.4)",
  surface: "#141414",
};
const FB = "'Outfit', sans-serif";
const FD = "'Playfair Display', serif";

function Inp({ label, value, onChange, placeholder, type = "text" }: any) {
  return (
    <div style={{ marginBottom:16 }}>
      <label style={{ fontSize:11, fontWeight:700, color:C.textMuted, display:"block", marginBottom:6, textTransform:"uppercase", letterSpacing:"0.08em" }}>{label}</label>
      <input type={type} value={value ?? ""} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width:"100%", padding:"10px 14px", background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, color:C.text, fontSize:13, fontFamily:FB, outline:"none", boxSizing:"border-box" }} />
    </div>
  );
}

export default function TenantSettingsPage() {
  const [form, setForm] = useState<any>({ name:"", logoUrl:"", coverUrl:"", primaryColor:"#c9a96e", whatsapp:"", instagram:"", facebook:"", phone:"", website:"", addressStreet:"", addressCity:"", addressState:"", addressZip:"", hasWifi:false, hasParking:false });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [equipe, setEquipe] = useState<any[]>([]);
  const [loadingEquipe, setLoadingEquipe] = useState(false);
  const [novoEmail, setNovoEmail] = useState("");
  const [novoPerfil, setNovoPerfil] = useState("receptionist");
  const [nomeConvite, setNomeConvite] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [msgEquipe, setMsgEquipe] = useState("");
  const equipeCarregada = useRef(false);

  const carregarEquipe = async () => {
    if (loadingEquipe) return;
    setLoadingEquipe(true);
    try {
      const r = await api.get<any>("/team");
      setEquipe(r.data ?? []);
    } catch(e) {
      setEquipe([]);
    } finally {
      setLoadingEquipe(false);
    }
  };

  const convidarUsuario = async () => {
    if (!novoEmail) return;
    setEnviando(true);
    setMsgEquipe("");
    try {
      await api.post("/team/invite", { email: novoEmail, role: novoPerfil, name: nomeConvite });
      setMsgEquipe("Convite enviado com sucesso!");
      setNovoEmail("");
      setNomeConvite("");
      carregarEquipe();
    } catch(e: any) {
      setMsgEquipe("Erro ao enviar convite. Verifique o e-mail.");
    } finally {
      setEnviando(false);
    }
  };

  const removerUsuario = async (userId: string) => {
    if (!confirm("Remover acesso deste usuario?")) return;
    try {
      await api.delete(`/team/${userId}`);
      setEquipe(eq => eq.filter(u => u.id !== userId));
    } catch(e) {
      alert("Erro ao remover usuario.");
    }
  };
  const [activeTab, setActiveTab] = useState("identity");

  const f = (key: string) => (val: string) => setForm((p: any) => ({ ...p, [key]: val }));

  useEffect(() => {
    api.get<any>("/auth/me").then((data: any) => {
      const t = data.data ?? data;
      setForm({
        slug: t.slug ?? "",
        name: t.name ?? "",
        logoUrl: t.logoUrl ?? "",
        coverUrl: t.coverUrl ?? "",
        primaryColor: t.primaryColor ?? "#c9a96e",
        whatsapp: t.whatsapp ?? "",
        instagram: t.instagram ?? "",
        facebook: t.facebook ?? "",
        phone: t.phone ?? "",
        website: t.website ?? "",
        addressStreet: t.addressStreet ?? "",
        addressCity: t.addressCity ?? "",
        addressState: t.addressState ?? "",
        addressZip: t.addressZip ?? "",
        hasWifi: t.hasWifi ?? false,
        hasParking: t.hasParking ?? false,
      });
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await api.patch<any>("/auth/me/profile", form);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      // Recarrega dados do tenant
      const updated = await api.get<any>("/auth/me");
      const t = updated.data ?? updated;
      setForm((p: any) => ({ ...p, primaryColor: t.primaryColor ?? p.primaryColor, name: t.name ?? p.name }));
    } catch(e) { console.error(e); }
    finally { setSaving(false); }
  };

  const uploadImage = async (file: File, path: string): Promise<string> => {
    const ext = file.name.split(".").pop();
    const fileName = `${path}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("tenant-assets").upload(fileName, file, { upsert:true, contentType:file.type });
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage.from("tenant-assets").getPublicUrl(fileName);
    return publicUrl;
  };

  const handleUpload = async (e: any, field: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage(file, field);
      setForm((p: any) => ({ ...p, [field === "logo" ? "logoUrl" : "coverUrl"]: url }));
    } catch(err) { console.error(err); }
    finally { setUploading(false); }
  };

  const TABS = [
    { id:"identity", label:"Identidade" },
    { id:"contact",  label:"Contato" },
    { id:"address",  label:"Endereço" },
    { id:"landing",  label:"Landing Page" },
    { id:"equipe",   label:"Equipe" },
  ];

  if (loading) return <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:400, color:C.textMuted, fontFamily:FB }}>Carregando...</div>;

  return (
    <div style={{ fontFamily:FB, maxWidth:800, margin:"0 auto" }}>
      <div style={{ marginBottom:32 }}>
        <h1 style={{ fontFamily:FD, fontSize:28, color:C.text, marginBottom:6 }}>Configurações do Salão</h1>
        <p style={{ fontSize:13, color:C.textMuted }}>Personalize as informações do seu estabelecimento</p>
      </div>

      <div style={{ display:"flex", gap:4, marginBottom:28, borderBottom:`1px solid ${C.border}`, background:C.card, borderRadius:"12px 12px 0 0", padding:"4px 4px 0 4px" }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => { setActiveTab(tab.id); if (tab.id === "equipe" && !equipeCarregada.current) { equipeCarregada.current = true; carregarEquipe(); } }}
            style={{ padding:"10px 20px", background:"none", border:"none", borderBottom:`2px solid ${activeTab===tab.id?C.gold:"transparent"}`, color:activeTab===tab.id?C.gold:C.textMuted, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:FB, marginBottom:-1 }}>
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:20, padding:28 }}>

        {activeTab === "identity" && (
          <div>
            <Inp label="Nome do estabelecimento" value={form.name} onChange={f("name")} placeholder="Ex: Salão Beleza Total" />
            <div style={{ marginBottom:16 }}>
              <label style={{ fontSize:11, fontWeight:700, color:C.textMuted, display:"block", marginBottom:6, textTransform:"uppercase", letterSpacing:"0.08em" }}>Cor principal</label>
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <input type="color" value={form.primaryColor || "#c9a96e"} onChange={e => f("primaryColor")(e.target.value)}
                  style={{ width:48, height:40, borderRadius:8, border:`1px solid ${C.border}`, background:"none", cursor:"pointer" }} />
                <input type="text" value={form.primaryColor || "#c9a96e"} onChange={e => f("primaryColor")(e.target.value)}
                  style={{ padding:"10px 14px", background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, color:C.text, fontSize:13, fontFamily:FB, outline:"none", width:120 }} />
                <div style={{ width:40, height:40, borderRadius:10, background:form.primaryColor || "#c9a96e" }} />
              </div>
            </div>
          </div>
        )}

        {activeTab === "contact" && (
          <div>
            <Inp label="WhatsApp" value={form.whatsapp} onChange={f("whatsapp")} placeholder="34999999999" />
            <Inp label="Telefone" value={form.phone} onChange={f("phone")} placeholder="3433333333" />
            <Inp label="Instagram" value={form.instagram} onChange={f("instagram")} placeholder="@meusalao" />
            <Inp label="Facebook" value={form.facebook} onChange={f("facebook")} placeholder="meusalao" />
            <Inp label="Website" value={form.website} onChange={f("website")} placeholder="https://meusalao.com.br" />
          </div>
        )}

        {activeTab === "address" && (
          <div>
            <Inp label="Rua / Logradouro" value={form.addressStreet} onChange={f("addressStreet")} placeholder="Rua das Flores, 123" />
            <Inp label="CEP" value={form.addressZip} onChange={f("addressZip")} placeholder="38000-000" />
            <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:12 }}>
              <Inp label="Cidade" value={form.addressCity} onChange={f("addressCity")} placeholder="Uberaba" />
              <Inp label="UF" value={form.addressState} onChange={(v: string) => setForm((p: any) => ({ ...p, addressState: v.toUpperCase().slice(0,2) }))} placeholder="MG" />
            </div>
            <div style={{ fontSize:11, fontWeight:700, color:C.textMuted, textTransform:"uppercase", letterSpacing:".08em", margin:"16px 0 8px" }}>Comodidades</div>
            <div style={{ display:"flex", gap:20, marginBottom:16 }}>
              <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", fontSize:13, color:C.text }}>
                <input type="checkbox" checked={form.hasWifi ?? false} onChange={e => setForm((p: any) => ({ ...p, hasWifi: e.target.checked }))}
                  style={{ accentColor:C.gold, width:16, height:16 }} />
                📶 Wi-Fi gratuito
              </label>
              <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", fontSize:13, color:C.text }}>
                <input type="checkbox" checked={form.hasParking ?? false} onChange={e => setForm((p: any) => ({ ...p, hasParking: e.target.checked }))}
                  style={{ accentColor:C.gold, width:16, height:16 }} />
                🅿️ Estacionamento
              </label>
            </div>
            <div style={{ background:"rgba(201,169,110,0.08)", border:"1px solid rgba(201,169,110,0.2)", borderRadius:10, padding:"10px 14px", fontSize:11, color:C.textMuted }}>
              📍 Ao salvar, as coordenadas do endereço serão atualizadas automaticamente para aparecer na busca por proximidade.
            </div>
          </div>
        )}

        {activeTab === "landing" && (
          <div>
            <div style={{ marginBottom:24 }}>
              <label style={{ fontSize:11, fontWeight:700, color:C.textMuted, display:"block", marginBottom:10, textTransform:"uppercase", letterSpacing:"0.08em" }}>Logo do estabelecimento</label>
              <div style={{ display:"flex", alignItems:"center", gap:20, marginBottom:12 }}>
                {form.logoUrl
                  ? <img src={form.logoUrl} alt="Logo" style={{ width:80, height:80, borderRadius:"50%", objectFit:"cover", border:`2px solid ${C.gold}` }} />
                  : <div style={{ width:80, height:80, borderRadius:"50%", background:`${C.gold}20`, border:`2px dashed ${C.gold}40`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:28 }}>✂</div>
                }
                <div>
                  <label style={{ display:"inline-block", padding:"10px 20px", background:`${C.gold}20`, border:`1px solid ${C.gold}40`, borderRadius:10, color:C.gold, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:FB }}>
                    {uploading ? "Enviando..." : "📁 Escolher Logo"}
                    <input type="file" accept="image/*" onChange={e => handleUpload(e, "logo")} style={{ display:"none" }} />
                  </label>
                  <div style={{ fontSize:11, color:C.textMuted, marginTop:6 }}>PNG, JPG ou SVG · Recomendado: 200x200px</div>
                </div>
              </div>
              <Inp label="Ou cole a URL da logo" value={form.logoUrl} onChange={f("logoUrl")} placeholder="https://..." />
            </div>

            <div style={{ marginBottom:24 }}>
              <label style={{ fontSize:11, fontWeight:700, color:C.textMuted, display:"block", marginBottom:10, textTransform:"uppercase", letterSpacing:"0.08em" }}>Foto de capa</label>
              {form.coverUrl && <img src={form.coverUrl} alt="Capa" style={{ width:"100%", height:140, objectFit:"cover", borderRadius:12, marginBottom:10 }} />}
              <label style={{ display:"inline-block", padding:"10px 20px", background:`${C.gold}20`, border:`1px solid ${C.gold}40`, borderRadius:10, color:C.gold, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:FB, marginBottom:12 }}>
                {uploading ? "Enviando..." : "📁 Escolher Capa"}
                <input type="file" accept="image/*" onChange={e => handleUpload(e, "cover")} style={{ display:"none" }} />
              </label>
              <Inp label="Ou cole a URL da capa" value={form.coverUrl} onChange={f("coverUrl")} placeholder="https://..." />
            </div>

            <div style={{ background:`${C.gold}12`, border:`1px solid ${C.gold}30`, borderRadius:12, padding:"12px 16px", fontSize:12, color:C.textMuted }}>
              💡 A landing page em <strong style={{ color:C.gold }}>beautytech.zensalon.com.br</strong> será atualizada automaticamente após salvar.
            </div>
          </div>
        )}

        {activeTab === "equipe" && (
          <div>
            <div style={{ marginBottom:24 }}>
              <div style={{ fontSize:15, fontWeight:700, color:C.text, marginBottom:4 }}>Convidar novo usuario</div>
              <div style={{ fontSize:12, color:C.textMuted, marginBottom:16 }}>O usuario recebera um e-mail para criar a senha e acessar o sistema.</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
                <div>
                  <label style={{ fontSize:11, fontWeight:700, color:C.textMuted, display:"block", marginBottom:6, textTransform:"uppercase", letterSpacing:"0.08em" }}>Nome</label>
                  <input value={nomeConvite} onChange={e => setNomeConvite(e.target.value)} placeholder="Maria da Silva"
                    style={{ width:"100%", padding:"10px 14px", background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, color:C.text, fontSize:13, fontFamily:FB, outline:"none", boxSizing:"border-box" as any }} />
                </div>
                <div>
                  <label style={{ fontSize:11, fontWeight:700, color:C.textMuted, display:"block", marginBottom:6, textTransform:"uppercase", letterSpacing:"0.08em" }}>Perfil</label>
                  <select value={novoPerfil} onChange={e => setNovoPerfil(e.target.value)}
                    style={{ width:"100%", padding:"10px 14px", background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, color:C.text, fontSize:13, fontFamily:FB, outline:"none", boxSizing:"border-box" as any }}>
                    <option value="admin">Administrador</option>
                    <option value="receptionist">Recepcionista</option>
                    <option value="professional">Profissional</option>
                  </select>
                </div>
              </div>
              <div style={{ marginBottom:12 }}>
                <label style={{ fontSize:11, fontWeight:700, color:C.textMuted, display:"block", marginBottom:6, textTransform:"uppercase", letterSpacing:"0.08em" }}>E-mail</label>
                <input value={novoEmail} onChange={e => setNovoEmail(e.target.value)} placeholder="maria@email.com" type="email"
                  style={{ width:"100%", padding:"10px 14px", background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, color:C.text, fontSize:13, fontFamily:FB, outline:"none", boxSizing:"border-box" as any }} />
              </div>
              <button onClick={convidarUsuario} disabled={enviando || !novoEmail}
                style={{ padding:"10px 24px", background:C.gold, color:"#0f0f0f", border:"none", borderRadius:10, fontSize:13, fontWeight:700, cursor:enviando||!novoEmail?"default":"pointer", fontFamily:FB, opacity:enviando||!novoEmail?0.6:1 }}>
                {enviando ? "Enviando..." : "Enviar Convite"}
              </button>
              {msgEquipe && (
                <div style={{ marginTop:12, padding:"10px 14px", background:msgEquipe.includes("sucesso") ? `${C.sage}18` : `#e8595918`, border:`1px solid ${msgEquipe.includes("sucesso") ? C.sage : "#e85959"}30`, borderRadius:10, fontSize:13, color:msgEquipe.includes("sucesso") ? C.sage : "#e85959" }}>
                  {msgEquipe}
                </div>
              )}
            </div>

            <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:24 }}>
              <div style={{ fontSize:15, fontWeight:700, color:C.text, marginBottom:16 }}>Usuarios com acesso</div>
              {loadingEquipe ? (
                <div style={{ color:C.textMuted, fontSize:13 }}>Carregando...</div>
              ) : equipe.length === 0 ? (
                <div style={{ background:C.surface, borderRadius:12, padding:24, textAlign:"center", color:C.textMuted, fontSize:13 }}>
                  Nenhum usuario convidado ainda. Use o formulario acima para convidar sua equipe.
                </div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  {equipe.map((u: any) => (
                    <div key={u.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", background:C.surface, borderRadius:12, padding:"12px 16px", border:`1px solid ${C.border}` }}>
                      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                        <div style={{ width:38, height:38, borderRadius:"50%", background:`${C.gold}20`, border:`1px solid ${C.gold}40`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0 }}>
                          {u.role === "admin" ? "👑" : u.role === "professional" ? "✂️" : "📋"}
                        </div>
                        <div>
                          <div style={{ fontSize:14, fontWeight:600, color:C.text }}>{u.name || u.email}</div>
                          <div style={{ fontSize:11, color:C.textMuted }}>{u.email}</div>
                        </div>
                      </div>
                      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                        <span style={{ fontSize:11, padding:"3px 10px", borderRadius:20, fontWeight:700,
                          background: u.role === "admin" ? `${C.gold}20` : u.role === "professional" ? `${C.sage}20` : `${C.rose}20`,
                          color: u.role === "admin" ? C.gold : u.role === "professional" ? C.sage : C.rose,
                          border: `1px solid ${u.role === "admin" ? C.gold : u.role === "professional" ? C.sage : C.rose}40`
                        }}>
                          {u.role === "admin" ? "Administrador" : u.role === "professional" ? "Profissional" : "Recepcionista"}
                        </span>
                        <span style={{ fontSize:11, padding:"3px 10px", borderRadius:20, fontWeight:700,
                          background: u.status === "active" ? `${C.sage}20` : `${C.gold}20`,
                          color: u.status === "active" ? C.sage : C.gold,
                          border: `1px solid ${u.status === "active" ? C.sage : C.gold}40`
                        }}>
                          {u.status === "active" ? "Ativo" : "Pendente"}
                        </span>
                        {u.role !== "owner" && (
                          <button onClick={() => removerUsuario(u.id)}
                            style={{ padding:"4px 12px", background:"#e8595918", border:"1px solid #e8595930", borderRadius:8, color:"#e85959", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:FB }}>
                            Remover
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ marginTop:20, background:`${C.gold}10`, border:`1px solid ${C.gold}25`, borderRadius:12, padding:"12px 16px", fontSize:12, color:C.textMuted }}>
              💡 <strong style={{ color:C.gold }}>Perfis de acesso:</strong> Administrador ve tudo · Recepcionista gerencia agenda e clientes · Profissional ve apenas sua propria agenda
            </div>
          </div>
        )}

        {activeTab !== "equipe" && <div style={{ marginTop:24, display:"flex", alignItems:"center", gap:12 }}>
          <button onClick={save} disabled={saving}
            style={{ padding:"12px 32px", background:C.gold, color:"#0f0f0f", border:"none", borderRadius:12, fontSize:14, fontWeight:700, cursor:saving?"default":"pointer", fontFamily:FB, opacity:saving?0.7:1 }}>
            {saving ? "Salvando..." : "Salvar Alterações"}
          </button>
          {saved && <span style={{ fontSize:13, color:C.sage }}>✓ Salvo com sucesso!</span>}
        </div>
      </div>

      <div style={{ marginTop:24, background:C.card, border:`1px solid ${C.border}`, borderRadius:20, padding:24 }}>
        <div style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:16 }}>🔗 Sua URL Pública de Agendamento</div>
        <div style={{ background:C.surface, borderRadius:12, padding:"14px 16px", display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
          <span style={{ flex:1, fontSize:13, color:C.gold, fontFamily:"monospace", wordBreak:"break-all" }}>
            {`https://www.zensalon.com.br/agendar/${form.slug||"beautytech"}`}
          </span>
          <button onClick={() => { navigator.clipboard.writeText(`https://www.zensalon.com.br/agendar/${form.slug||"beautytech"}`); alert("URL copiada!"); }}
            style={{ padding:"8px 16px", background:`${C.gold}20`, border:`1px solid ${C.gold}40`, borderRadius:8, color:C.gold, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:FB, whiteSpace:"nowrap" }}>
            📋 Copiar
          </button>
          <a href={`https://www.zensalon.com.br/agendar/${form.slug||"beautytech"}`} target="_blank"
            style={{ padding:"8px 16px", background:`${C.sage}20`, border:`1px solid ${C.sage}40`, borderRadius:8, color:C.sage, fontSize:12, fontWeight:700, textDecoration:"none", whiteSpace:"nowrap" }}>
            🔗 Abrir
          </a>
        </div>
        <div style={{ fontSize:11, color:C.textMuted }}>
          Compartilhe este link com seus clientes para que eles possam agendar online.
        </div>
      </div>

      <div style={{ marginTop:24, background:C.card, border:`1px solid ${C.border}`, borderRadius:20, padding:24 }}>
        <div style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:16 }}>Preview da Landing Page</div>
        <div style={{ background:"#080808", borderRadius:12, padding:"32px 20px", textAlign:"center", backgroundImage:form.coverUrl?`linear-gradient(rgba(0,0,0,0.6),rgba(0,0,0,0.8)), url(${form.coverUrl})`:"none", backgroundSize:"cover", backgroundPosition:"center" }}>
          {form.logoUrl
            ? <img src={form.logoUrl} style={{ width:60, height:60, borderRadius:"50%", objectFit:"cover", border:`2px solid ${form.primaryColor||C.gold}`, display:"block", margin:"0 auto 12px" }} />
            : <div style={{ width:60, height:60, borderRadius:"50%", background:`${form.primaryColor||C.gold}22`, border:`2px solid ${form.primaryColor||C.gold}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, margin:"0 auto 12px" }}>✂</div>
          }
          <div style={{ fontSize:11, color:form.primaryColor||C.gold, letterSpacing:"0.2em", textTransform:"uppercase", marginBottom:6 }}>Salão de Beleza</div>
          <div style={{ fontSize:22, fontWeight:700, color:"#fff", fontFamily:FD }}>{form.name||"Nome do Salão"}</div>
          {form.addressCity && <div style={{ fontSize:11, color:"rgba(255,255,255,0.5)", marginTop:6 }}>📍 {form.addressCity}{form.addressState?`, ${form.addressState}`:""}</div>}
          <div style={{ display:"flex", gap:10, justifyContent:"center", marginTop:16 }}>
            <a href={`https://www.zensalon.com.br/agendar/${form.slug||"beautytech"}`} target="_blank"
              style={{ padding:"8px 20px", background:form.primaryColor||C.gold, color:"#0f0f0f", borderRadius:50, fontSize:11, fontWeight:700, textDecoration:"none" }}>Agendar Agora</a>
            {form.whatsapp && <a href={`https://wa.me/55${form.whatsapp.replace(/\D/g,"")}`} target="_blank"
              style={{ padding:"8px 20px", border:"1px solid rgba(255,255,255,0.3)", color:"#fff", borderRadius:50, fontSize:11, textDecoration:"none" }}>WhatsApp</a>}
          </div>
        </div>
      </div>
    </div>
  );
}



