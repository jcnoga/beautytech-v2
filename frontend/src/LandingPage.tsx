import { useEffect, useState } from "react";

const API = import.meta.env["VITE_API_URL"];

async function fetchTenantByHostname(): Promise<any> {
  const hostname = window.location.hostname;
  const baseDomains = ["zensalon.com.br", "beautytech.com.br", "vercel.app", "localhost"];

  // Tenta por hostname primeiro
  try {
    const res = await fetch(`${API}/api/v1/public/tenant-by-host`, {
      headers: { "x-forwarded-host": hostname }
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.tenant) return data.tenant;
    }
  } catch {}

  // Fallback: extrai slug do subdominio
  for (const base of baseDomains) {
    if (hostname.endsWith(`.${base}`)) {
      const slug = hostname.replace(`.${base}`, "");
      const res = await fetch(`${API}/api/v1/public/tenant/${slug}`);
      if (res.ok) {
        const data = await res.json();
        if (data?.tenant) return data.tenant;
      }
    }
  }
  return null;
}

export default function LandingPage() {
  const [tenant, setTenant] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTenantByHostname()
      .then(setTenant)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#0f0f0f" }}>
      <div style={{ color:"#c9a96e", fontSize:28, fontFamily:"serif" }}>Carregando...</div>
    </div>
  );

  if (!tenant) return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#0f0f0f" }}>
      <div style={{ color:"#fff", fontSize:18, fontFamily:"serif" }}>Salão não encontrado.</div>
    </div>
  );

  const primary = tenant.primaryColor ?? "#c9a96e";
  const businessLabel =
    tenant.businessType === "barbershop" ? "Barbearia" :
    tenant.businessType === "aesthetics_clinic" ? "Clínica de Estética" :
    "Salão de Beleza";

  return (
    <div style={{ minHeight:"100vh", background:"#0f0f0f", fontFamily:"'Outfit', sans-serif", color:"#fff" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Outfit:wght@300;400;500;600&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        body { background:#0f0f0f; }
      `}</style>

      {/* HERO */}
      <div style={{
        minHeight:"100vh",
        background: tenant.coverUrl
          ? `linear-gradient(to bottom, rgba(0,0,0,0.55), rgba(0,0,0,0.85)), url(${tenant.coverUrl}) center/cover no-repeat`
          : `linear-gradient(135deg, #1a1a1a 0%, #0f0f0f 100%)`,
        display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
        textAlign:"center", padding:"40px 20px", position:"relative"
      }}>
        {/* Logo */}
        {tenant.logoUrl ? (
          <img src={tenant.logoUrl} alt={tenant.name}
            style={{ width:100, height:100, borderRadius:"50%", objectFit:"cover", border:`3px solid ${primary}`, marginBottom:28 }} />
        ) : (
          <div style={{ width:100, height:100, borderRadius:"50%", background:`${primary}22`, border:`3px solid ${primary}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:40, marginBottom:28 }}>
            ✂
          </div>
        )}

        <div style={{ fontSize:12, letterSpacing:"0.3em", color:primary, textTransform:"uppercase", marginBottom:10 }}>
          {businessLabel}
        </div>
        <h1 style={{ fontSize:"clamp(32px, 6vw, 64px)", fontWeight:700, fontFamily:"'Playfair Display', serif", marginBottom:16, lineHeight:1.1 }}>
          {tenant.name}
        </h1>
        {tenant.addressCity && (
          <p style={{ fontSize:14, color:"rgba(255,255,255,0.5)", marginBottom:32 }}>
            📍 {tenant.addressCity}{tenant.addressState ? `, ${tenant.addressState}` : ""}
          </p>
        )}

        {/* CTAs */}
        <div style={{ display:"flex", gap:16, flexWrap:"wrap", justifyContent:"center" }}>
          <a href={`/agendar/${tenant.slug}`}
            style={{ display:"inline-block", padding:"14px 32px", background:primary, color:"#0f0f0f", borderRadius:50, fontWeight:700, fontSize:15, textDecoration:"none", letterSpacing:"0.05em" }}>
            Agendar Agora
          </a>
          {tenant.whatsapp && (
            <a href={`https://wa.me/55${tenant.whatsapp.replace(/\D/g,"")}`} target="_blank"
              style={{ display:"inline-block", padding:"14px 32px", background:"transparent", color:"#fff", border:"2px solid rgba(255,255,255,0.3)", borderRadius:50, fontWeight:600, fontSize:15, textDecoration:"none" }}>
              WhatsApp
            </a>
          )}
        </div>
      </div>

      {/* GALERIA */}
      {tenant.galleryImages?.length > 0 && (
        <div style={{ padding:"80px 20px", maxWidth:1100, margin:"0 auto" }}>
          <h2 style={{ textAlign:"center", fontFamily:"'Playfair Display', serif", fontSize:36, marginBottom:48, color:primary }}>
            Nosso Trabalho
          </h2>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(260px,1fr))", gap:16 }}>
            {tenant.galleryImages.map((img: string, i: number) => (
              <div key={i} style={{ borderRadius:16, overflow:"hidden", aspectRatio:"1", background:"#1a1a1a" }}>
                <img src={img} alt={`Foto ${i+1}`} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* REDES SOCIAIS */}
      {(tenant.instagram || tenant.facebook) && (
        <div style={{ padding:"60px 20px", textAlign:"center", borderTop:"1px solid rgba(255,255,255,0.08)" }}>
          <h2 style={{ fontFamily:"'Playfair Display', serif", fontSize:28, marginBottom:32, color:primary }}>
            Siga nas Redes
          </h2>
          <div style={{ display:"flex", gap:20, justifyContent:"center", flexWrap:"wrap" }}>
            {tenant.instagram && (
              <a href={`https://instagram.com/${tenant.instagram}`} target="_blank"
                style={{ padding:"12px 28px", border:`1px solid ${primary}40`, borderRadius:50, color:primary, textDecoration:"none", fontWeight:600, fontSize:14 }}>
                📸 @{tenant.instagram}
              </a>
            )}
            {tenant.facebook && (
              <a href={`https://facebook.com/${tenant.facebook}`} target="_blank"
                style={{ padding:"12px 28px", border:`1px solid ${primary}40`, borderRadius:50, color:primary, textDecoration:"none", fontWeight:600, fontSize:14 }}>
                👍 Facebook
              </a>
            )}
          </div>
        </div>
      )}

      {/* FOOTER */}
      <div style={{ padding:"32px 20px", textAlign:"center", borderTop:"1px solid rgba(255,255,255,0.06)", fontSize:12, color:"rgba(255,255,255,0.3)" }}>
        {tenant.name} — Powered by ZenSalon
      </div>
    </div>
  );
}
