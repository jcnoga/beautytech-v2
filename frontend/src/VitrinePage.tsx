import { useEffect, useState } from "react";

const API = ((import.meta as any).env?.VITE_API_URL ?? "http://localhost:3000/api/v1").replace(/\/+$/, "");

const C = {
  bg: "#0B0F1A", card: "#141826", card2: "#1C2235",
  primary: "#C9847A", primaryDeep: "#A06050",
  text: "#E2E8F0", textMuted: "#94A3B8", border: "#2A3150",
  green: "#22C55E", error: "#EF4444", gold: "#E8C468",
};
const FB = "'Inter', sans-serif";

interface Tenant {
  id: string; name: string; slug: string; logoUrl?: string; coverUrl?: string;
  primaryColor?: string; phone?: string; whatsapp?: string; instagram?: string;
  addressCity?: string; addressState?: string; businessHours?: any; businessType?: string;
}
interface SalonProfile {
  tagline?: string; description?: string; coverImageUrl?: string;
  instagramUrl?: string; whatsappNumber?: string; addressFull?: string;
  isPremiumEnabled: boolean;
}
interface Service { id: string; name: string; description?: string; durationMinutes: number; price: number; }
interface Professional { id: string; fullName: string; displayName?: string; avatarUrl?: string; specialties?: string[]; }
interface PortfolioImage { id: string; imageUrl: string; caption?: string; category?: string; professionalName?: string; }
interface Testimonial { id: string; rating: number; comment?: string; clientName: string; }
interface Promotion { id: string; title: string; description?: string; discountType: string; discountValue: string; validUntil: string; }

const COVER_DEFAULTS: any = {
  beauty_salon: "https://images.unsplash.com/photo-1562322140-8baeececf3df?w=1600&q=80",
  barbershop: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=1600&q=80",
  aesthetics_clinic: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=1600&q=80",
};

function formatPrice(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function Section({ title, children, accent }: { title: string; children: React.ReactNode; accent: string }) {
  return (
    <div style={{ padding: "32px 20px" }}>
      <h2 style={{
        fontSize: "1.1rem", fontWeight: 800, color: C.text, margin: "0 0 16px",
        fontFamily: "'Outfit', sans-serif", display: "flex", alignItems: "center", gap: 8,
      }}>
        <span style={{ width: 4, height: 18, background: accent, borderRadius: 2, display: "inline-block" }} />
        {title}
      </h2>
      {children}
    </div>
  );
}

export default function VitrinePage({ slug }: { slug: string }) {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [profile, setProfile] = useState<SalonProfile | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioImage[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch(`${API}/public/tenants/${slug}`).then(r => r.json()),
      fetch(`${API}/public/tenants/${slug}/salon-profile`).then(r => r.json()),
      fetch(`${API}/public/tenants/${slug}/services`).then(r => r.json()),
      fetch(`${API}/public/tenants/${slug}/professionals`).then(r => r.json()),
      fetch(`${API}/public/tenants/${slug}/portfolio`).then(r => r.json()),
      fetch(`${API}/public/tenants/${slug}/testimonials`).then(r => r.json()),
      fetch(`${API}/public/tenants/${slug}/promotions`).then(r => r.json()),
    ]).then(([t, pr, s, p, pf, ts, promo]) => {
      if (t.success) setTenant(t.data);
      if (pr.success) setProfile(pr.data);
      if (s.success) setServices(s.data);
      if (p.success) setProfessionals(p.data);
      if (pf.success) setPortfolio(pf.data);
      if (ts.success) setTestimonials(ts.data);
      if (promo.success) setPromotions(promo.data);
      setLoading(false);
    }).catch(() => { setError("Erro ao carregar dados do estabelecimento."); setLoading(false); });
  }, [slug]);

  const goToBooking = (serviceId?: string) => {
    const url = `/agendar/${slug}/booking${serviceId ? `?service=${serviceId}` : ""}`;
    window.location.href = url;
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FB, color: C.textMuted }}>
        Carregando...
      </div>
    );
  }

  if (error || !tenant) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FB, color: C.error, padding: 24, textAlign: "center" as const }}>
        {error || "Estabelecimento não encontrado."}
      </div>
    );
  }

  const accent = tenant.primaryColor || C.primary;
  const cover = profile?.coverImageUrl || tenant.coverUrl || COVER_DEFAULTS[tenant.businessType ?? "beauty_salon"] || COVER_DEFAULTS.beauty_salon;
  const city = [tenant.addressCity, tenant.addressState].filter(Boolean).join(", ");
  const whatsapp = profile?.whatsappNumber || tenant.whatsapp || tenant.phone;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: FB, color: C.text, paddingBottom: 90 }}>

      {/* HERO */}
      <div style={{ position: "relative", height: 340, overflow: "hidden", background: `url(${cover}) center/cover no-repeat` }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(11,15,26,0.95) 100%)" }} />
        <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "flex-end", padding: "0 24px 28px", textAlign: "center" as const }}>
          {tenant.logoUrl && (
            <img src={tenant.logoUrl} alt={tenant.name}
              style={{ width: 76, height: 76, borderRadius: "50%", objectFit: "cover" as const, border: `3px solid ${accent}`, marginBottom: 12, boxShadow: "0 4px 20px rgba(0,0,0,0.5)" }} />
          )}
          <h1 style={{ fontSize: "1.7rem", fontWeight: 800, margin: "0 0 4px", fontFamily: "'Outfit', sans-serif", textShadow: "0 2px 10px rgba(0,0,0,0.6)" }}>
            {tenant.name}
          </h1>
          {profile?.tagline && (
            <div style={{ fontSize: ".9rem", color: accent, fontWeight: 600, marginBottom: 4 }}>{profile.tagline}</div>
          )}
          {city && <div style={{ fontSize: ".8rem", color: "rgba(255,255,255,0.75)" }}>📍 {city}</div>}
        </div>
      </div>

      {/* CTA principal */}
      <div style={{ padding: "20px 20px 0" }}>
        <button onClick={() => goToBooking()} style={{
          width: "100%", padding: "16px", borderRadius: 12, border: "none",
          background: accent, color: "#0B0F1A", fontWeight: 800, fontSize: "1rem",
          cursor: "pointer", fontFamily: "'Outfit', sans-serif", letterSpacing: ".02em",
        }}>
          Agendar horário
        </button>
      </div>

      {/* SOBRE */}
      {profile?.description && (
        <Section title="Sobre" accent={accent}>
          <p style={{ fontSize: ".92rem", lineHeight: 1.6, color: C.textMuted, margin: 0 }}>{profile.description}</p>
        </Section>
      )}

      {/* PROMOÇÕES */}
      {promotions.length > 0 && (
        <Section title="Promoções ativas" accent={accent}>
          <div style={{ display: "flex", flexDirection: "column" as const, gap: 10 }}>
            {promotions.map(p => (
              <div key={p.id} style={{
                background: C.card, border: `1px solid ${accent}55`, borderRadius: 12, padding: 14,
                display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12,
              }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: ".9rem" }}>{p.title}</div>
                  {p.description && <div style={{ fontSize: ".78rem", color: C.textMuted, marginTop: 2 }}>{p.description}</div>}
                </div>
                <div style={{ fontWeight: 800, color: C.gold, fontSize: ".95rem", whiteSpace: "nowrap" as const }}>
                  {p.discountType === "percentage" ? `${p.discountValue}% OFF` : `-${formatPrice(Number(p.discountValue))}`}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* LISTA DE SERVIÇOS — clique escolhe o serviço e vai direto pro agendamento */}
      <Section title="Serviços" accent={accent}>
        {services.length === 0 ? (
          <div style={{ fontSize: ".85rem", color: C.textMuted }}>Nenhum serviço disponível no momento.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" as const, gap: 10 }}>
            {services.map(s => (
              <button key={s.id} onClick={() => goToBooking(s.id)} style={{
                textAlign: "left" as const, background: C.card, border: `1px solid ${C.border}`,
                borderRadius: 12, padding: 14, cursor: "pointer", color: C.text,
                display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12,
              }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: ".92rem" }}>{s.name}</div>
                  {s.description && <div style={{ fontSize: ".78rem", color: C.textMuted, marginTop: 2 }}>{s.description}</div>}
                  <div style={{ fontSize: ".72rem", color: C.textMuted, marginTop: 4 }}>{s.durationMinutes} min</div>
                </div>
                <div style={{ fontWeight: 800, color: accent, fontSize: ".95rem", whiteSpace: "nowrap" as const }}>
                  {formatPrice(Number(s.price))}
                </div>
              </button>
            ))}
          </div>
        )}
      </Section>

      {/* PROFISSIONAIS */}
      {professionals.length > 0 && (
        <Section title="Nossa equipe" accent={accent}>
          <div style={{ display: "flex", gap: 12, overflowX: "auto" as const, paddingBottom: 4 }}>
            {professionals.map(p => (
              <div key={p.id} style={{ flex: "0 0 auto", width: 92, textAlign: "center" as const }}>
                <img
                  src={p.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.fullName)}&background=1C2235&color=E2E8F0`}
                  alt={p.fullName}
                  style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover" as const, border: `2px solid ${C.border}`, marginBottom: 6 }}
                />
                <div style={{ fontSize: ".76rem", fontWeight: 600 }}>{p.displayName || p.fullName}</div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* PORTFÓLIO */}
      {portfolio.length > 0 && (
        <Section title="Nossos trabalhos" accent={accent}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
            {portfolio.map(img => (
              <div key={img.id} style={{ aspectRatio: "1", borderRadius: 8, overflow: "hidden", background: C.card2 }}>
                <img src={img.imageUrl} alt={img.caption || ""} style={{ width: "100%", height: "100%", objectFit: "cover" as const }} />
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* DEPOIMENTOS */}
      {testimonials.length > 0 && (
        <Section title="O que dizem nossos clientes" accent={accent}>
          <div style={{ display: "flex", flexDirection: "column" as const, gap: 10 }}>
            {testimonials.map(t => (
              <div key={t.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14 }}>
                <div style={{ color: C.gold, fontSize: ".8rem", marginBottom: 6 }}>{"★".repeat(t.rating)}{"☆".repeat(5 - t.rating)}</div>
                {t.comment && <div style={{ fontSize: ".85rem", color: C.text, lineHeight: 1.5, marginBottom: 6 }}>{t.comment}</div>}
                <div style={{ fontSize: ".76rem", color: C.textMuted, fontWeight: 600 }}>{t.clientName}</div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* CONTATO / LOCALIZAÇÃO */}
      <Section title="Contato" accent={accent}>
        <div style={{ display: "flex", flexDirection: "column" as const, gap: 8, fontSize: ".85rem", color: C.textMuted }}>
          {(profile?.addressFull || city) && <div>📍 {profile?.addressFull || city}</div>}
          {whatsapp && <div>💬 {whatsapp}</div>}
          {profile?.instagramUrl && (
            <a href={profile.instagramUrl} target="_blank" rel="noreferrer" style={{ color: accent, textDecoration: "none" }}>
              📷 Instagram
            </a>
          )}
        </div>
      </Section>

      {/* CTA fixo no rodapé (mobile) */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, padding: 12,
        background: "rgba(11,15,26,0.92)", backdropFilter: "blur(8px)",
        borderTop: `1px solid ${C.border}`, zIndex: 10,
      }}>
        <button onClick={() => goToBooking()} style={{
          width: "100%", padding: "14px", borderRadius: 12, border: "none",
          background: accent, color: "#0B0F1A", fontWeight: 800, fontSize: ".95rem",
          cursor: "pointer", fontFamily: "'Outfit', sans-serif",
        }}>
          Agendar horário
        </button>
      </div>
    </div>
  );
}
