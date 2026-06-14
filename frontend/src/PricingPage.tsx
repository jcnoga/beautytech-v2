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
    id: "free", name: "Free", color: "rgba(255,255,255,0.35)",
    monthly: 0, professionals: "1 profissional",
    highlight: false, disabled: true, cta: "Plano atual",
    description: "Grátis para sempre",
    includes: ["1 profissional","Até 30 clientes","Até 50 agendamentos/mês","Agendamento básico","Gestão de serviços"],
    locked: ["CRM avançado","Automações WhatsApp","Comissões","Fidelidade","Relatórios avançados","Campanhas"],
  },
  {
    id: "basic", name: "Básico", color: "#e8a598",
    monthly: 39.90, professionals: "Até 1 profissional",
    highlight: false, cta: "Assinar Básico",
    description: "Para autônomos",
    includes: [],
    locked: [],
  },
  {
    id: "pro", name: "Pro", color: "#c9a96e",
    monthly: 59.90, professionals: "Até 5 profissionais",
    highlight: true, cta: "Assinar Pro",
    description: "Para salões em crescimento",
    includes: [],
    locked: [],
  },
  {
    id: "super", name: "Super", color: "#7eb8a0",
    monthly: 99.90, professionals: "Até 12 profissionais",
    highlight: false, cta: "Assinar Super",
    description: "Para grandes operações",
    includes: [],
    locked: [],
  },
];

const ALL_FEATURES = [
  "Agendamento online ilimitado",
  "Cadastro ilimitado de clientes",
  "CRM completo",
  "Gestão financeira",
  "Controle de serviços e produtos",
  "Comissões de profissionais",
  "Automações de WhatsApp",
  "Programa de fidelidade",
  "Relatórios avançados",
  "Campanhas de marketing",
  "Notificações automáticas",
  "Suporte via WhatsApp",
];

const PERIODS = [
  { id: "monthly",    label: "Mensal",    discount: 0 },
  { id: "semiannual", label: "Semestral", discount: 10 },
  { id: "annual",     label: "Anual",     discount: 20 },
];

const WHATSAPP = '5534997824990';

const PLAN_LABELS: any = { basic: 'Básico', pro: 'Pro', super: 'Super' };
const PERIOD_LABELS: any = { monthly: 'Mensal', semiannual: 'Semestral', annual: 'Anual' };

export default function PricingPage({ onUpgrade }: { onUpgrade?: (plan: string, period: string) => void }) {
  const [period, setPeriod] = useState("monthly");
  const disc = PERIODS.find(p => p.id === period)?.discount ?? 0;

  const price = (monthly: number) => {
    if (monthly === 0) return 0;
    return monthly * (1 - disc / 100);
  };

  return (
    <div style={{ minHeight:"100vh", background:C.bg, fontFamily:FB, padding:"40px 20px" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Outfit:wght@300;400;500;600;700&display=swap'); *{box-sizing:border-box;}`}</style>

      {/* Banner Trial */}
      <div style={{ maxWidth:1000, margin:'0 auto 32px', background:'linear-gradient(135deg, #c9a96e18, #c9a96e08)', border:'1px solid #c9a96e40', borderRadius:16, padding:'16px 24px', display:'flex', alignItems:'center', gap:14 }}>
        <span style={{ fontSize:28 }}>🎉</span>
        <div>
          <div style={{ fontSize:14, fontWeight:700, color:'#c9a96e', marginBottom:4 }}>Você está no período de trial gratuito!</div>
          <div style={{ fontSize:12, color:'rgba(255,255,255,0.5)', lineHeight:1.5 }}>Durante 30 dias você tem acesso TOTAL a todas as funcionalidades, sem nenhuma limitação. Aproveite para conhecer tudo antes de escolher seu plano.</div>
        </div>
      </div>

      {/* Header */}
      <div style={{ textAlign:"center", marginBottom:48 }}>
        <div style={{ fontSize:11, letterSpacing:"0.3em", color:C.gold, textTransform:"uppercase", marginBottom:12 }}>Planos & Preços</div>
        <h1 style={{ fontFamily:FD, fontSize:"clamp(32px,5vw,52px)", color:C.text, fontWeight:700, marginBottom:16 }}>Escolha o plano ideal</h1>
        <p style={{ fontSize:15, color:C.textMuted, maxWidth:520, margin:"0 auto" }}>
          30 dias grátis com acesso completo. Após o trial, escolha um plano ou continue no Free com limitações.
        </p>
      </div>

      {/* Período */}
      <div style={{ display:"flex", justifyContent:"center", gap:8, marginBottom:48 }}>
        {PERIODS.map(p => (
          <button key={p.id} onClick={() => setPeriod(p.id)}
            style={{ padding:"10px 22px", borderRadius:50, border:`1px solid ${period===p.id?C.gold:C.border}`, background:period===p.id?`${C.gold}18`:"transparent", color:period===p.id?C.gold:C.textMuted, fontSize:13, cursor:"pointer", fontFamily:FB, fontWeight:600, display:"flex", alignItems:"center", gap:8 }}>
            {p.label}
            {p.discount > 0 && <span style={{ fontSize:10, background:`${C.sage}25`, color:C.sage, padding:"2px 8px", borderRadius:20, fontWeight:700 }}>-{p.discount}%</span>}
          </button>
        ))}
      </div>

      {/* Cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(220px,1fr))", gap:16, maxWidth:1000, margin:"0 auto 48px" }}>
        {PLANS.map(plan => (
          <div key={plan.id} style={{ background:plan.highlight?`linear-gradient(135deg,${C.gold}12,${C.gold}06)`:C.card, border:`1px solid ${plan.highlight?C.gold+"40":C.border}`, borderRadius:20, padding:28, position:"relative", boxShadow:plan.highlight?`0 0 40px ${C.gold}15`:"none" }}>
            {plan.highlight && (
              <div style={{ position:"absolute", top:-12, left:"50%", transform:"translateX(-50%)", background:C.gold, color:"#0a0a0a", fontSize:10, fontWeight:700, padding:"4px 16px", borderRadius:20, letterSpacing:"0.1em", whiteSpace:"nowrap" }}>MAIS POPULAR</div>
            )}

            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:12, fontWeight:700, color:plan.color, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:4 }}>{plan.name}</div>
              <div style={{ fontSize:11, color:C.textMuted, marginBottom:12 }}>{plan.description}</div>
              {plan.monthly === 0 ? (
                <div style={{ fontSize:36, fontWeight:700, color:C.text, fontFamily:FD }}>Grátis</div>
              ) : (
                <div style={{ display:"flex", alignItems:"baseline", gap:4 }}>
                  <span style={{ fontSize:13, color:C.textMuted }}>R$</span>
                  <span style={{ fontSize:40, fontWeight:700, color:C.text, fontFamily:FD, lineHeight:1 }}>{price(plan.monthly).toFixed(2).replace(".",",")}</span>
                  <span style={{ fontSize:12, color:C.textMuted }}>/mês</span>
                </div>
              )}
              {disc > 0 && plan.monthly > 0 && (
                <div style={{ fontSize:11, color:C.sage, marginTop:4 }}>
                  Economia de R${(plan.monthly * disc / 100 * (period==="semiannual"?6:12)).toFixed(2).replace(".",",")}/período
                </div>
              )}
              <div style={{ fontSize:13, color:plan.color, marginTop:8, fontWeight:600 }}>{plan.professionals}</div>
            </div>

            {/* Features do Free */}
            {plan.id === "free" && (
              <div style={{ marginBottom:20 }}>
                {plan.includes.map((f, i) => (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:8, fontSize:12, color:C.text, marginBottom:6 }}>
                    <span style={{ color:C.sage }}>✓</span>{f}
                  </div>
                ))}
                {plan.locked.map((f, i) => (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:8, fontSize:12, color:C.textMuted, marginBottom:6, opacity:0.5 }}>
                    <span style={{ color:C.ruby }}>✕</span>{f}
                  </div>
                ))}
              </div>
            )}

            {/* Planos pagos — acesso total */}
            {plan.id !== "free" && (
              <div style={{ marginBottom:20, background:`${plan.color}10`, borderRadius:10, padding:"12px 14px" }}>
                <div style={{ fontSize:12, color:plan.color, fontWeight:700, marginBottom:6 }}>✦ Acesso completo a tudo</div>
                <div style={{ fontSize:11, color:C.textMuted, lineHeight:1.6 }}>
                  Todas as funcionalidades desbloqueadas.<br/>Limite apenas de profissionais.
                </div>
              </div>
            )}

            <button disabled={plan.disabled} onClick={() => {
              if (!plan.disabled) {
                const msg = encodeURIComponent(Olá! Quero assinar o Plano  () do ZenSalon. Pode me ajudar?);
                window.open(https://wa.me/?text=, '_blank');
              }
            }}
              style={{ width:"100%", padding:"13px", borderRadius:12, background:plan.disabled?"transparent":plan.highlight?C.gold:"transparent", border:`1px solid ${plan.disabled?C.border:plan.highlight?C.gold:plan.color}`, color:plan.disabled?C.textMuted:plan.highlight?"#0a0a0a":plan.color, fontSize:14, fontWeight:700, cursor:plan.disabled?"default":"pointer", fontFamily:FB }}>
              {plan.cta}
            </button>
          </div>
        ))}
      </div>

      {/* Todas as features incluídas nos planos pagos */}
      <div style={{ maxWidth:800, margin:"0 auto 48px", background:C.card, border:`1px solid ${C.border}`, borderRadius:20, padding:36 }}>
        <h2 style={{ fontFamily:FD, fontSize:24, color:C.text, marginBottom:8, textAlign:"center" }}>Tudo incluído nos planos pagos</h2>
        <p style={{ fontSize:13, color:C.textMuted, textAlign:"center", marginBottom:28 }}>Acesso completo a todas as funcionalidades. O único diferencial é o número de profissionais.</p>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(220px,1fr))", gap:12 }}>
          {ALL_FEATURES.map((f, i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:10, fontSize:13, color:C.text }}>
              <span style={{ color:C.sage, fontSize:16 }}>✓</span>{f}
            </div>
          ))}
        </div>
      </div>

      <div style={{ textAlign:"center", fontSize:12, color:C.textMuted }}>
        30 dias grátis com acesso total · Sem cartão de crédito · Cancele a qualquer momento
      </div>
    </div>
  );
}


