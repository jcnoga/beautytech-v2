import { useEffect, useState } from "react";

const API = import.meta.env["VITE_API_URL"];

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
    <div style={{ marginBottom: 16 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</label>
      <input
        type={type}
        value={value ?? ""}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ width: "100%", padding: "10px 14px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, fontSize: 13, fontFamily: FB, outline: "none", boxSizing: "border-box" }}
      />
    </div>
  );
}

export default function TenantSettingsPage() {
  const [form, setForm] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState("identity");

  const token = localStorage.getItem("sb-token") || sessionStorage.getItem("beautytech_token") || "";

  const f = (key: string) => (val: string) => setForm((p: any) => ({ ...p, [key]: val }));

  useEffect(() => {
    fetch(`${API}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => {
        const t = data.data ?? data;
        setForm({
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
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch(`${API}/api/v1/auth/me/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 3000); }
    } catch(e) { console.error(e); }
    finally { setSaving(false); }
  };

  const TABS = [
    { id: "identity", label: "Identidade" },
    { id: "contact",  label: "Contato" },
    { id: "address",  label: "Endereço" },
    { id: "landing",  label: "Landing Page" },
  ];

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 400, color: C.textMuted, fontFamily: FB }}>
      Carregando...
    </div>
  );

  return (
    <div style={{ fontFamily: FB, maxWidth: 800, margin: "0 auto" }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: FD, fontSize: 28, color: C.text, marginBottom: 6 }}>Configurações do Salão</h1>
        <p style={{ fontSize: 13, color: C.textMuted }}>Personalize as informações do seu estabelecimento</p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 28, borderBottom: `1px solid ${C.border}`, paddingBottom: 0 }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{ padding: "10px 20px", background: "none", border: "none", borderBottom: `2px solid ${activeTab === tab.id ? C.gold : "transparent"}`, color: activeTab === tab.id ? C.gold : C.textMuted, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: FB, marginBottom: -1 }}>
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: 28 }}>

        {/* IDENTIDADE */}
        {activeTab === "identity" && (
          <div>
            <Inp label="Nome do estabelecimento" value={form.name} onChange={f("name")} placeholder="Ex: Salão Beleza Total" />
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>Cor principal</label>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <input type="color" value={form.primaryColor} onChange={e => f("primaryColor")(e.target.value)}
                  style={{ width: 48, height: 40, borderRadius: 8, border: `1px solid ${C.border}`, background: "none", cursor: "pointer" }} />
                <input type="text" value={form.primaryColor} onChange={e => f("primaryColor")(e.target.value)}
                  style={{ padding: "10px 14px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, fontSize: 13, fontFamily: FB, outline: "none", width: 120 }} />
                <div style={{ width: 40, height: 40, borderRadius: 10, background: form.primaryColor }} />
              </div>
            </div>
          </div>
        )}

        {/* CONTATO */}
        {activeTab === "contact" && (
          <div>
            <Inp label="WhatsApp" value={form.whatsapp} onChange={f("whatsapp")} placeholder="34999999999" />
            <Inp label="Telefone" value={form.phone} onChange={f("phone")} placeholder="3433333333" />
            <Inp label="Instagram" value={form.instagram} onChange={f("instagram")} placeholder="@meusalao" />
            <Inp label="Facebook" value={form.facebook} onChange={f("facebook")} placeholder="meusalao" />
            <Inp label="Website" value={form.website} onChange={f("website")} placeholder="https://meusalao.com.br" />
          </div>
        )}

        {/* ENDEREÇO */}
        {activeTab === "address" && (
          <div>
            <Inp label="Rua / Endereço" value={form.addressStreet} onChange={f("addressStreet")} placeholder="Rua das Flores, 123" />
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
              <Inp label="Cidade" value={form.addressCity} onChange={f("addressCity")} placeholder="Uberaba" />
              <Inp label="Estado (UF)" value={form.addressState} onChange={f("addressState")} placeholder="MG" />
            </div>
            <Inp label="CEP" value={form.addressZip} onChange={f("addressZip")} placeholder="38000-000" />
          </div>
        )}

        {/* LANDING PAGE */}
        {activeTab === "landing" && (
          <div>
            <Inp label="URL da Logo" value={form.logoUrl} onChange={f("logoUrl")} placeholder="https://..." />
            {form.logoUrl && (
              <div style={{ marginBottom: 16 }}>
                <img src={form.logoUrl} alt="Logo" style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover", border: `2px solid ${C.gold}` }} />
              </div>
            )}
            <Inp label="URL da Foto de Capa" value={form.coverUrl} onChange={f("coverUrl")} placeholder="https://..." />
            {form.coverUrl && (
              <div style={{ marginBottom: 16 }}>
                <img src={form.coverUrl} alt="Cover" style={{ width: "100%", height: 160, objectFit: "cover", borderRadius: 12 }} />
              </div>
            )}
            <div style={{ background: `${C.gold}12`, border: `1px solid ${C.gold}30`, borderRadius: 12, padding: "12px 16px", fontSize: 12, color: C.textMuted }}>
              💡 Use links de imagens do Google Drive, Imgur, ou qualquer URL pública. A landing page em <strong style={{ color: C.gold }}>beautytech.zensalon.com.br</strong> será atualizada automaticamente.
            </div>
          </div>
        )}

        {/* Botão salvar */}
        <div style={{ marginTop: 24, display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={save} disabled={saving}
            style={{ padding: "12px 32px", background: C.gold, color: "#0f0f0f", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: saving ? "default" : "pointer", fontFamily: FB, opacity: saving ? 0.7 : 1 }}>
            {saving ? "Salvando..." : "Salvar Alterações"}
          </button>
          {saved && <span style={{ fontSize: 13, color: C.sage }}>✓ Salvo com sucesso!</span>}
        </div>
      </div>

      {/* Preview da landing */}
      <div style={{ marginTop: 24, background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 16 }}>Preview da Landing Page</div>
        <div style={{ background: "#080808", borderRadius: 12, padding: "32px 20px", textAlign: "center", backgroundImage: form.coverUrl ? `linear-gradient(rgba(0,0,0,0.6),rgba(0,0,0,0.8)), url(${form.coverUrl})` : "none", backgroundSize: "cover", backgroundPosition: "center" }}>
          {form.logoUrl
            ? <img src={form.logoUrl} style={{ width: 60, height: 60, borderRadius: "50%", objectFit: "cover", border: `2px solid ${form.primaryColor}`, marginBottom: 12 }} />
            : <div style={{ width: 60, height: 60, borderRadius: "50%", background: `${form.primaryColor}22`, border: `2px solid ${form.primaryColor}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, margin: "0 auto 12px" }}>✂</div>
          }
          <div style={{ fontSize: 11, color: form.primaryColor, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 6 }}>Salão de Beleza</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#fff", fontFamily: FD }}>{form.name || "Nome do Salão"}</div>
          {form.addressCity && <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 6 }}>📍 {form.addressCity}{form.addressState ? `, ${form.addressState}` : ""}</div>}
          <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 16 }}>
            <div style={{ padding: "8px 20px", background: form.primaryColor, color: "#0f0f0f", borderRadius: 50, fontSize: 11, fontWeight: 700 }}>Agendar Agora</div>
            {form.whatsapp && <div style={{ padding: "8px 20px", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", borderRadius: 50, fontSize: 11 }}>WhatsApp</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
