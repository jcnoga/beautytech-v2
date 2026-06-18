# -*- coding: utf-8 -*-
path = r"C:\projetos\beautytech-v2\frontend\src\BookingPage.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Adiciona coverUrl e businessType na interface Tenant
old_interface = "interface Tenant { id:string; name:string; slug:string; logoUrl?:string; primaryColor?:string; phone?:string; addressCity?:string; addressState?:string; businessHours?:any; }"
new_interface = "interface Tenant { id:string; name:string; slug:string; logoUrl?:string; coverUrl?:string; primaryColor?:string; phone?:string; addressCity?:string; addressState?:string; businessHours?:any; businessType?:string; whatsapp?:string; }"
content = content.replace(old_interface, new_interface)

# 2. Adiciona fotos padrao por nicho e componente hero
hero_component = '''
const COVER_DEFAULTS: any = {
  beauty_salon:      "https://images.unsplash.com/photo-1562322140-8baeececf3df?w=1200&q=80",
  barbershop:        "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=1200&q=80",
  aesthetics_clinic: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=1200&q=80",
};

function BookingHero({ tenant, accent }: { tenant: Tenant; accent: string }) {
  const cover = tenant.coverUrl || COVER_DEFAULTS[tenant.businessType ?? "beauty_salon"] || COVER_DEFAULTS.beauty_salon;
  const city = [tenant.addressCity, tenant.addressState].filter(Boolean).join(", ");
  return (
    <div style={{
      position: "relative", height: 220, overflow: "hidden",
      background: `url(${cover}) center/cover no-repeat`,
    }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)" }} />
      <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center", padding: "0 24px", textAlign: "center" as const }}>
        {tenant.logoUrl && (
          <img src={tenant.logoUrl} alt={tenant.name}
            style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover" as const, border: `3px solid ${accent}`, marginBottom: 12, boxShadow: "0 4px 16px rgba(0,0,0,0.4)" }} />
        )}
        <h1 style={{ fontSize: "1.4rem", fontWeight: 800, color: "#fff", margin: "0 0 4px", fontFamily: "'Outfit', sans-serif", textShadow: "0 2px 8px rgba(0,0,0,0.5)" }}>{tenant.name}</h1>
        {city && <div style={{ fontSize: ".8rem", color: "rgba(255,255,255,0.75)", marginBottom: 6 }}>📍 {city}</div>}
        <div style={{ fontSize: ".78rem", color: accent, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase" as const }}>Agendamento Online</div>
      </div>
    </div>
  );
}

'''

# Insere antes do export default
content = content.replace(
    "export default function BookingPage",
    hero_component + "export default function BookingPage"
)

# 3. Adiciona o hero no inicio do return do BookingPage
old_return = '''  if (loading) return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ color:C.textMuted, fontFamily:FB }}>Carregando...</div>
    </div>
  );'''

# Busca o return principal do BookingPage para adicionar o hero
old_header = '''      {/* HEADER */}
      <div style={{ background:C.card, borderBottom:`1px solid ${C.border}`, padding:"16px 24px", display:"flex", alignItems:"center", gap:12 }}>'''

new_header = '''      {/* HERO COM FOTO DE FUNDO */}
      {tenant && <BookingHero tenant={tenant} accent={accent} />}

      {/* HEADER */}
      <div style={{ background:C.card, borderBottom:`1px solid ${C.border}`, padding:"16px 24px", display:"flex", alignItems:"center", gap:12 }}>'''

content = content.replace(old_header, new_header)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("OK")
