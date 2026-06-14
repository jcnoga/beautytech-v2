import { useState } from "react";

const C = {
  bg: "#0a0a0a", card: "#111", border: "rgba(255,255,255,0.08)",
  gold: "#c9a96e", rose: "#e8a598", sage: "#7eb8a0",
  text: "#f0ece4", textMuted: "rgba(255,255,255,0.35)",
  ruby: "#e05c5c",
};
const FB = "'Outfit', sans-serif";
const FD = "'Playfair Display', serif";

const PLANS = [
  {
    id: "free", name: "Free", color: C.textMuted,
    monthly: 0, users: "1 usuário",
    features: ["Agendamento básico","Cadastro de clientes","Gestão de serviços","Relatórios básicos"],
    locked: ["CRM avançado","Automações","Comissões","Fidelidade","WhatsApp"],
    cta: "Plano atual", disabled: true,
  },
  {
    id: "basic", name: "Básico", color: C.rose,
    monthly: 39.90, users: "1 usuário",
    features: ["Agendamento online","Cadastro de clientes","CRM básico","Gestão financeira","Controle de serviços","Relatórios gerenciais","Suporte padrão"],
    locked: ["Automações","Comissões","Fidelidade","WhatsApp"],
    cta: "Assinar Básico",
  },
  {
    id: "pro", name: "Pro", color: C.gold, highlight: true,
    monthly: 59.90, users: "Até 5 usuários",
    features: ["Tudo do Básico","CRM avançado","Automação de marketing","Gestão de equipe","Controle de comissões","Relatórios avançados","Ferramentas de fidelização"],
    locked: [],
    cta: "Assinar Pro",
  },
  {
    id: "super", name: "Super", color: C.sage,
    monthly: 99.90, users: "Até 12 usuários",
    features: ["Tudo do Pro","Recursos Premium","Automações avançadas","Dashboards estratégicos","Indicadores de desempenho","Suporte prioritário","Gestão completa"],
    locked: [],
    cta: "Assinar Super",
  },
];

const PERIODS = [
  { id: "monthly",    label: "Mensal",    discount: 0 },
  { id: "semiannual", label: "Semestral", discount: 10 },
  { id: "annual",     label: "Anual",     discount: 20 },
];

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function PricingPage({ onUpgrade }: { onUpgrade?: (plan: string, period: string) => void }) {
  const [period, setPeriod] = useState("monthly");
  const disc = PERIODS.find(p => p.id === period)?.discount ?? 0;

  const price = (monthly: number) => {
    if (monthly === 0) return 0;
    return monthly * (1 - disc / 100);
  };

  return (
    <div style={{ minHeight:"100vh", background:C.bg, fontFamily:FB, padding:"40px 20px" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Outfit:wght@300;400;500;600;700&display=swap');
        * { box-sizing:border-box; }
      `}</style>

      {/* Header */}
      <div style={{ textAlign:"center", marginBottom:48 }}>
        <div style={{ fontSize:11, letterSpacing:"0.3em", color:C.gold, textTransform:"uppercase", marginBottom:12 }}>
          Planos & Preços
        </div>
        <h1 style={{ fontFamily:FD, fontSize:"clamp(32px,5vw,52px)", color:C.text, fontWeight:700, marginBottom:16 }}>
          Escolha o plano ideal
        </h1>
        <p style={{ fontSize:15, color:C.textMuted, maxWidth:480, margin:"0 auto" }}>
          30 dias grátis para testar tudo. Sem cartão de crédito.
        </p>
      </div>

      {/* Seletor de período */}
      <div style={{ display:"flex", justifyContent:"center", gap:8, marginBottom:48 }}>
        {PERIODS.map(p => (
          <button key={p.id} onClick={() => setPeriod(p.id)}
            style={{ padding:"10px 22px", borderRadius:50, border:`1px solid ${period===p.id ? C.gold : C.border}`, background: period===p.id ? `${C.gold}18` : "transparent", color: period===p.id ? C.gold : C.textMuted, fontSize:13, cursor:"pointer", fontFamily:FB, fontWeight:600, display:"flex", alignItems:"center", gap:8 }}>
            {p.label}
            {p.discount > 0 && (
              <span style={{ fontSize:10, background:`${C.sage}25`, color:C.sage, padding:"2px 8px", borderRadius:20, fontWeight:700 }}>
                -{p.discount}%
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Cards dos planos */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(240px,1fr))", gap:16, maxWidth:1100, margin:"0 auto 60px" }}>
        {PLANS.map(plan => (
          <div key={plan.id} style={{
            background: plan.highlight ? `linear-gradient(135deg, ${C.gold}12, ${C.gold}06)` : C.card,
            border: `1px solid ${plan.highlight ? C.gold + "40" : C.border}`,
            borderRadius:20, padding:28, position:"relative",
            boxShadow: plan.highlight ? `0 0 40px ${C.gold}15` : "none",
          }}>
            {plan.highlight && (
              <div style={{ position:"absolute", top:-12, left:"50%", transform:"translateX(-50%)", background:C.gold, color:"#0a0a0a", fontSize:10, fontWeight:700, padding:"4px 16px", borderRadius:20, letterSpacing:"0.1em", whiteSpace:"nowrap" }}>
                MAIS POPULAR
              </div>
            )}

            {/* Nome e preço */}
            <div style={{ marginBottom:24 }}>
              <div style={{ fontSize:12, fontWeight:700, color:plan.color, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:8 }}>
                {plan.name}
              </div>
              <div style={{ display:"flex", alignItems:"baseline", gap:6, marginBottom:4 }}>
                {plan.monthly === 0 ? (
                  <span style={{ fontSize:36, fontWeight:700, color:C.text, fontFamily:FD }}>Grátis</span>
                ) : (
                  <>
                    <span style={{ fontSize:11, color:C.textMuted, marginTop:8 }}>R$</span>
                    <span style={{ fontSize:40, fontWeight:700, color:C.text, fontFamily:FD, lineHeight:1 }}>
                      {price(plan.monthly).toFixed(2).replace(".",",")}
                    </span>
                    <span style={{ fontSize:12, color:C.textMuted }}>/mês</span>
                  </>
                )}
              </div>
              {disc > 0 && plan.monthly > 0 && (
                <div style={{ fontSize:11, color:C.sage }}>
                  Economia de {brl(plan.monthly * disc / 100 * (period === "semiannual" ? 6 : 12))}/período
                </div>
              )}
              <div style={{ fontSize:12, color:C.textMuted, marginTop:6 }}>{plan.users}</div>
            </div>

            {/* Features */}
            <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:24 }}>
              {plan.features.map((f, i) => (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, color:C.text }}>
                  <span style={{ color:C.sage, fontSize:14 }}>✓</span>
                  {f}
                </div>
              ))}
              {plan.locked.map((f, i) => (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, color:C.textMuted, opacity:0.5 }}>
                  <span style={{ fontSize:14 }}>✕</span>
                  {f}
                </div>
              ))}
            </div>

            {/* CTA */}
            <button
              disabled={plan.disabled}
              onClick={() => onUpgrade?.(plan.id, period)}
              style={{
                width:"100%", padding:"13px", borderRadius:12,
                background: plan.disabled ? "transparent" : plan.highlight ? C.gold : "transparent",
                border: `1px solid ${plan.disabled ? C.border : plan.highlight ? C.gold : plan.color}`,
                color: plan.disabled ? C.textMuted : plan.highlight ? "#0a0a0a" : plan.color,
                fontSize:14, fontWeight:700, cursor: plan.disabled ? "default" : "pointer",
                fontFamily:FB, transition:"all 0.2s",
              }}
            >
              {plan.cta}
            </button>
          </div>
        ))}
      </div>

      {/* Nota */}
      <div style={{ textAlign:"center", fontSize:12, color:C.textMuted }}>
        Todos os planos incluem 30 dias de teste gratuito · Cancele a qualquer momento · Suporte via WhatsApp
      </div>
    </div>
  );
}
