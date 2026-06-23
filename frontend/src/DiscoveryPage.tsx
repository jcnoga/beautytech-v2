import { useEffect, useState, useCallback } from "react";

const API = ((import.meta as any).env?.VITE_API_URL ?? "http://localhost:3000/api/v1").replace(/\/+$/, "");

const C = {
  bg: "#0B0F1A", card: "#141826", card2: "#1C2235",
  primary: "#C9847A", text: "#E2E8F0", textMuted: "#94A3B8",
  border: "#2A3150", green: "#22C55E",
};
const FB = "'Inter', sans-serif";

const TIPOS = [
  { id: "", label: "Todos", icon: "\u2B50" },
  { id: "beauty_salon", label: "Salão de Beleza", icon: "\u2702\uFE0F" },
  { id: "barbershop", label: "Barbearia", icon: "\uD83D\uDC88" },
  { id: "aesthetics_clinic", label: "Clínica de Estética", icon: "\uD83D\uDC86" },
];

interface Tenant {
  id: string; name: string; slug: string; businessType: string;
  addressCity?: string; addressState?: string; addressStreet?: string;
  phone?: string; whatsapp?: string; logoUrl?: string;
  primaryColor?: string; coverUrl?: string;
  lat?: number; lng?: number; distKm?: number;
}

function calcDistKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

export default function DiscoveryPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [tipo, setTipo] = useState("");
  const [buscaInput, setBuscaInput] = useState("");
  const [cidadeInput, setCidadeInput] = useState("");
  const [userCoords, setUserCoords] = useState<{lat:number,lng:number}|null>(null);
  const [geoStatus, setGeoStatus] = useState<"loading"|"ok"|"denied"|"none">("loading");

  // Tenta pegar localizacao do usuario
  useEffect(() => {
    if (!navigator.geolocation) { setGeoStatus("none"); return; }
    navigator.geolocation.getCurrentPosition(
      pos => {
        setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoStatus("ok");
      },
      () => setGeoStatus("denied"),
      { timeout: 6000 }
    );
  }, []);

  const buscarTenants = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (tipo) params.set("businessType", tipo);
    if (cidadeInput.trim()) params.set("city", cidadeInput.trim());
    const url = `${API}/api/v1/public/tenants${params.toString() ? "?" + params.toString() : ""}`;
    try {
      const r = await fetch(url).then(res => res.json());
      if (r.success) {
        let data = r.data as Tenant[];

        // Filtra por busca local (nome)
        const q = buscaInput.trim().toLowerCase();
        if (q) data = data.filter(x =>
          x.name.toLowerCase().includes(q) ||
          x.addressCity?.toLowerCase().includes(q) ||
          x.addressStreet?.toLowerCase().includes(q)
        );

        // Ordena por proximidade se tiver coords e o tenant tiver lat/lng
        if (userCoords && !cidadeInput.trim()) {
          data = data
            .map(t => {
              if (t.lat && t.lng) {
                return { ...t, distKm: calcDistKm(userCoords.lat, userCoords.lng, t.lat, t.lng) };
              }
              return t;
            })
            .sort((a, b) => {
              if (a.distKm != null && b.distKm != null) return a.distKm - b.distKm;
              if (a.distKm != null) return -1;
              if (b.distKm != null) return 1;
              return 0;
            });
        }

        // Limita a 15
        setTenants(data.slice(0, 15));
      }
    } catch { setTenants([]); }
    setLoading(false);
  }, [tipo, buscaInput, cidadeInput, userCoords]);

  useEffect(() => {
    if (geoStatus !== "loading") buscarTenants();
  }, [tipo, geoStatus, buscarTenants]);

  const handleBuscar = () => buscarTenants();

  const labelTipo = (t: string) => {
    const m: any = { beauty_salon: "Salão de Beleza", barbershop: "Barbearia", aesthetics_clinic: "Clínica de Estética" };
    return m[t] || t;
  };

  const iconTipo = (t: string) => {
    const m: any = { beauty_salon: "\u2702\uFE0F", barbershop: "\uD83D\uDC88", aesthetics_clinic: "\uD83D\uDC86" };
    return m[t] || "\uD83C\uDFE0";
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: FB, color: C.text }}>

      {/* HEADER */}
      <div style={{ background: C.card, borderBottom: `1px solid ${C.border}`, padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: "1.3rem", fontWeight: 800, color: C.primary }}>ZenSalon</div>
        <div style={{ fontSize: ".8rem", color: C.textMuted }}>
          {geoStatus === "ok" && "\uD83D\uDCCD Usando sua localizacao"}
          {geoStatus === "denied" && "\uD83D\uDCCD Localizacao negada — mostrando todos"}
          {geoStatus === "none" && "Encontre o melhor para você"}
        </div>
      </div>

      {/* HERO BUSCA */}
      <div style={{ background: `linear-gradient(135deg, ${C.card} 0%, ${C.primary}18 100%)`, padding: "48px 24px 32px" }}>
        <div style={{ maxWidth: 680, margin: "0 auto", textAlign: "center" }}>
          <h1 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: 8 }}>
            Agende com os melhores da sua cidade
          </h1>
          <p style={{ color: C.textMuted, fontSize: ".95rem", marginBottom: 28 }}>
            Salões de Beleza, Barbearias e Clínicas de Estética perto de você
          </p>

          <div style={{ display: "flex", gap: 8, background: C.card2, border: `1px solid ${C.border}`, borderRadius: 14, padding: 8 }}>
            <input
              placeholder="Buscar por nome..."
              value={buscaInput}
              onChange={e => setBuscaInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleBuscar()}
              style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: C.text, fontSize: ".9rem", padding: "8px 12px", fontFamily: FB }}
            />
            <input
              placeholder="Cidade"
              value={cidadeInput}
              onChange={e => setCidadeInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleBuscar()}
              style={{ width: 140, background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, outline: "none", color: C.text, fontSize: ".9rem", padding: "8px 12px", fontFamily: FB }}
            />
            <button onClick={handleBuscar} style={{
              background: `linear-gradient(135deg, ${C.primary}, #A06050)`,
              border: "none", borderRadius: 8, color: "#fff",
              padding: "10px 20px", cursor: "pointer", fontWeight: 700, fontSize: ".9rem", fontFamily: FB,
            }}>
              Buscar
            </button>
          </div>
        </div>
      </div>

      {/* FILTROS */}
      <div style={{ padding: "20px 24px 0", maxWidth: 900, margin: "0 auto" }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {TIPOS.map(t => (
            <button key={t.id} onClick={() => setTipo(t.id)} style={{
              padding: "8px 18px", border: `2px solid ${tipo === t.id ? C.primary : C.border}`,
              borderRadius: 50, background: tipo === t.id ? `${C.primary}20` : C.card2,
              color: tipo === t.id ? C.primary : C.textMuted,
              cursor: "pointer", fontWeight: 600, fontSize: ".85rem", fontFamily: FB,
            }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* RESULTADOS */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px" }}>
        <div style={{ fontSize: ".82rem", color: C.textMuted, marginBottom: 16 }}>
          {loading ? "Buscando..." : `${tenants.length} estabelecimento${tenants.length !== 1 ? "s" : ""} encontrado${tenants.length !== 1 ? "s" : ""}`}
          {geoStatus === "ok" && !cidadeInput && !loading && " — ordenados por proximidade"}
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: C.textMuted }}>Carregando...</div>
        ) : tenants.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{ fontSize: "3rem", marginBottom: 16 }}>{"🔍"}</div>
            <div style={{ color: C.textMuted }}>Nenhum estabelecimento encontrado.</div>
            <div style={{ color: C.textMuted, fontSize: ".85rem", marginTop: 8 }}>Tente buscar em outra cidade ou sem filtros.</div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 18 }}>
            {tenants.map(t => {
              const cor = t.primaryColor || C.primary;
              return (
                <div key={t.id} style={{
                  background: C.card, border: `1px solid ${C.border}`,
                  borderRadius: 16, overflow: "hidden", cursor: "pointer", transition: "all .2s",
                }}
                  onMouseOver={e => { e.currentTarget.style.borderColor = cor; e.currentTarget.style.transform = "translateY(-2px)"; }}
                  onMouseOut={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.transform = "translateY(0)"; }}
                >
                  <div style={{
                    height: 90,
                    background: t.coverUrl ? `url(${t.coverUrl}) center/cover` : `linear-gradient(135deg, ${cor}40, ${cor}15)`,
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2.5rem",
                  }}>
                    {!t.coverUrl && iconTipo(t.businessType)}
                  </div>
                  <div style={{ padding: 16 }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "1rem", marginBottom: 3 }}>{t.name}</div>
                        <div style={{ fontSize: ".75rem", color: cor, fontWeight: 600 }}>
                          {iconTipo(t.businessType)} {labelTipo(t.businessType)}
                        </div>
                      </div>
                      {t.logoUrl && <img src={t.logoUrl} style={{ width: 36, height: 36, borderRadius: 8, objectFit: "cover" }} alt={t.name} />}
                    </div>
                    {(t.addressCity || t.addressStreet) && (
                      <div style={{ fontSize: ".8rem", color: C.textMuted, marginBottom: 8 }}>
                        📍 {[t.addressStreet, t.addressCity, t.addressState].filter(Boolean).join(", ")}
                      </div>
                    )}
                    {t.distKm != null && (
                      <div style={{ fontSize: ".75rem", color: C.green, marginBottom: 8, fontWeight: 600 }}>
                        {t.distKm < 1 ? `${Math.round(t.distKm*1000)}m de você` : `${t.distKm.toFixed(1)}km de você`}
                      </div>
                    )}
                    <a href={`/agendar/${t.slug}`} style={{
                      display: "block", textAlign: "center", padding: "10px 0",
                      background: `linear-gradient(135deg, ${cor}, ${cor}CC)`,
                      color: "#fff", borderRadius: 10, fontWeight: 700, fontSize: ".88rem",
                      textDecoration: "none",
                    }}>
                      Agendar agora
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ textAlign: "center", padding: "32px 24px", borderTop: `1px solid ${C.border}`, marginTop: 40 }}>
        <div style={{ fontSize: "1rem", fontWeight: 800, color: C.primary, marginBottom: 4 }}>ZenSalon</div>
        <div style={{ fontSize: ".78rem", color: C.textMuted, marginBottom: 8 }}>Sua plataforma de agendamento online</div>
        <div style={{ fontSize: ".78rem", color: C.textMuted, display:"flex", flexDirection:"column", gap:4 }}>
          <a href="https://www.websitelog.com.br" target="_blank" style={{ color: C.primary, textDecoration:"none" }}>www.websitelog.com.br</a>
          <a href="mailto:websitelogx@gmail.com" style={{ color: C.textMuted, textDecoration:"none" }}>websitelogx@gmail.com</a>
          <a href="https://wa.me/5534997824990" target="_blank" style={{ color: C.textMuted, textDecoration:"none" }}>WhatsApp: (34) 99782-4990</a>
        </div>
      </div>
    </div>
  );
}
