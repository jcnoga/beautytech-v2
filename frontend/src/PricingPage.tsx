import { useState, useEffect } from "react";
import { supabase } from "./api/client";

const C = {
  bg: "#0a0a0a", card: "#111", border: "rgba(255,255,255,0.08)",
  gold: "#c9a96e", rose: "#e8a598", sage: "#7eb8a0",
  text: "#f0ece4", textMuted: "rgba(255,255,255,0.35)",
  ruby: "#e05c5c", green: "#4ade80",
};
const FB = "'Outfit', sans-serif";
const FD = "'Playfair Display', serif";

const PLANS = [
  {
    id: "free", name: "Free", color: "rgba(255,255,255,0.35)",
    monthly: 0, professionals: "1 profissional",
    highlight: false, description: "Gratis para sempre",
    includes: ["1 profissional","Ate 30 clientes","Ate 50 agendamentos/mes","Agendamento basico","Gestao de servicos"],
    locked: ["CRM avancado","Automacoes WhatsApp","Comissoes","Fidelidade","Relatorios avancados","Campanhas"],
  },
  {
    id: "basic", name: "Basico", color: "#e8a598",
    monthly: 39.90, professionals: "Ate 1 profissional",
    highlight: false, description: "Para autonomos",
    includes: [], locked: [],
  },
  {
    id: "pro", name: "Pro", color: "#c9a96e",
    monthly: 59.90, professionals: "Ate 5 profissionais",
    highlight: true, description: "Para saloes em crescimento",
    includes: [], locked: [],
  },
  {
    id: "super", name: "Super", color: "#7eb8a0",
    monthly: 99.90, professionals: "Ate 12 profissionais",
    highlight: false, description: "Para grandes operacoes",
    includes: [], locked: [],
  },
];

const ALL_FEATURES = [
  "Agendamento online ilimitado","Cadastro ilimitado de clientes","CRM completo",
  "Gestao financeira","Controle de servicos e produtos","Comissoes de profissionais",
  "Automacoes de WhatsApp","Programa de fidelidade","Relatorios avancados",
  "Campanhas de marketing","Notificacoes automaticas","Suporte via WhatsApp",
];

const PERIODS = [
  { id: "monthly",    label: "Mensal",    discount: 0,  months: 1 },
  { id: "semiannual", label: "Semestral", discount: 10, months: 6 },
  { id: "annual",     label: "Anual",     discount: 20, months: 12 },
];

const API = "https://beautytech-v2-production.up.railway.app/api/v1";

export default function PricingPage({ currentPlan }: { token?: string; currentPlan?: string }) {
  const [period, setPeriod] = useState("monthly");
  const [loading, setLoading] = useState<string | null>(null);
  const [status, setStatus] = useState<any>(null);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [planPrices, setPlanPrices] = useState<any>({
    basic: { monthly: 39.90, semiannual: 35.91, annual: 31.92 },
    pro:   { monthly: 59.90, semiannual: 53.91, annual: 47.92 },
    super: { monthly: 99.90, semiannual: 89.91, annual: 79.92 },
  });

  const disc = PERIODS.find(p => p.id === period)?.discount ?? 0;
  const months = PERIODS.find(p => p.id === period)?.months ?? 1;

  const [dynamicPlans, setDynamicPlans] = useState<any>(null);

  useEffect(() => {
    fetch(`${API}/billing/plans`)
      .then(r => r.json())
      .then(d => {
        if (d.success && d.data) {
          const p: any = {};
          Object.entries(d.data).forEach(([tier, plan]: any) => {
            if (tier === "free") return;
            p[tier] = {
              monthly:    plan.monthlyPrice,
              semiannual: parseFloat((plan.monthlyPrice * 0.9).toFixed(2)),
              annual:     parseFloat((plan.monthlyPrice * 0.8).toFixed(2)),
              professionals: plan.professionals,
            };
          });
          if (Object.keys(p).length > 0) { setPlanPrices(p); setDynamicPlans(d.data); }
        }
      }).catch(() => {});
  }, []);

  useEffect(() => {
    const key = Object.keys(localStorage).find(k => k.includes('auth-token'));
    if (key) {
      try {
        const parsed = JSON.parse(localStorage.getItem(key) || '{}');
        setToken(parsed?.access_token ?? null);
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (!token) return;
    fetch(`${API}/billing/status`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setStatus(d.data); })
      .catch(() => {});
  }, [token]);

  const price = (planId: string, monthly: number) => {
    if (monthly === 0) return 0;
    if (planPrices[planId]) {
      const p = planPrices[planId];
      if (period === "semiannual") return p.semiannual;
      if (period === "annual") return p.annual;
      return p.monthly;
    }
    return monthly * (1 - disc / 100);
  };
  const totalPrice = (planId: string, monthly: number) => price(planId, monthly) * months;

  const handleSubscribe = async (planId: string) => {
    const lsKey = Object.keys(localStorage).find(k => k.includes('auth-token'));
    const lsToken = lsKey ? JSON.parse(localStorage.getItem(lsKey) || '{}')?.access_token : null;
    const activeToken = lsToken || token;
    if (!activeToken) { setMsg({ type: "err", text: "Voce precisa estar logado para assinar." }); return; }
    if (planId === "free") return;
    setLoading(planId);
    setMsg(null);
    try {
      const res = await fetch(`${API}/billing/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${activeToken}` },
        body: JSON.stringify({ tier: planId, period }),
      });
      const data = await res.json();
      if (data.success) {
        let text = "Assinatura processada com sucesso!";
        if (data.data.creditApplied > 0) text += ` Credito de R$${Number(data.data.creditApplied).toFixed(2)} aplicado.`;
        if (data.data.paymentUrl) { text += " Redirecionando para pagamento..."; window.open(data.data.paymentUrl, "_blank"); }
        setMsg({ type: "ok", text });
        const s = await fetch(`${API}/billing/status`, { headers: { Authorization: `Bearer ${activeToken}` } }).then(r => r.json());
        if (s.success) setStatus(s.data);
      } else {
        setMsg({ type: "err", text: data.error ?? "Erro ao processar assinatura." });
      }
    } catch(e: any) {
      console.error("BILLING ERROR:", e);
      setMsg({ type: "err", text: "Erro: " + (e?.message || String(e)) });
    } finally {
      setLoading(null);
    }
  };

  const handleCancel = async () => {
    if (!token || !confirm("Confirma o cancelamento? Voce mantem acesso ate o fim do periodo.")) return;
    setLoading("cancel");
    try {
      const res = await fetch(`${API}/billing/cancel`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) {
        setMsg({ type: "ok", text: "Assinatura cancelada. Acesso mantido ate o fim do periodo." });
        const s = await fetch(`${API}/billing/status`, { headers: { Authorization: `Bearer ${activeToken}` } }).then(r => r.json());
        if (s.success) setStatus(s.data);
      } else {
        setMsg({ type: "err", text: data.error ?? "Erro ao cancelar." });
      }
    } catch {
      setMsg({ type: "err", text: "Erro de conexao." });
    } finally {
      setLoading(null);
    }
  };

  const activePlan = status?.planTier ?? currentPlan ?? "free";
  const planStatus = status?.planStatus ?? "trial";
  const expiresAt = status?.planExpiresAt ? new Date(status.planExpiresAt).toLocaleDateString("pt-BR") : null;
  const cancelAtEnd = status?.cancelAtPeriodEnd ?? false;
  const planOrder = ["free","basic","pro","super"];

  const getCta = (planId: string) => {
    if (planId === "free") return activePlan === "free" ? "Plano atual" : "Downgrade para Free";
    if (activePlan === planId) return cancelAtEnd ? "Reativar assinatura" : "Plano atual";
    const ci = planOrder.indexOf(activePlan);
    const ni = planOrder.indexOf(planId);
    const name = PLANS.find(p => p.id === planId)?.name ?? planId;
    return ni > ci ? `Upgrade para ${name}` : `Mudar para ${name}`;
  };

  const isCurrentPlan = (planId: string) => activePlan === planId && !cancelAtEnd;

  return (
    <div style={{ minHeight:"100vh", background:C.bg, fontFamily:FB, padding:"40px 20px" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Outfit:wght@300;400;500;600;700&display=swap'); *{box-sizing:border-box;} button:not(:disabled):hover{opacity:0.85;transition:opacity 0.2s;}`}</style>

      {/* Status do plano atual */}
      {status && activePlan !== "free" && (
        <div style={{ maxWidth:1000, margin:"0 auto 24px", background:planStatus==="active"?"#4ade8010":"#e05c5c10", border:`1px solid ${planStatus==="active"?"#4ade8040":"#e05c5c40"}`, borderRadius:16, padding:"14px 24px", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <span style={{ fontSize:20 }}>{planStatus==="active"?"✅":"⚠️"}</span>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:planStatus==="active"?C.green:C.ruby }}>
                Plano {PLANS.find(p=>p.id===activePlan)?.name} — {planStatus==="active"?"Ativo":planStatus==="past_due"?"Pagamento pendente":planStatus==="canceled"?"Cancelado":"Expirado"}
              </div>
              {expiresAt && (
                <div style={{ fontSize:12, color:C.textMuted }}>
                  {cancelAtEnd ? `Acesso ate ${expiresAt}` : `Proximo vencimento: ${expiresAt}`}
                </div>
              )}
            </div>
          </div>
          {activePlan !== "free" && !cancelAtEnd && planStatus === "active" && (
            <button onClick={handleCancel} disabled={loading==="cancel"}
              style={{ padding:"8px 18px", borderRadius:8, border:`1px solid ${C.ruby}40`, background:"transparent", color:C.ruby, fontSize:12, cursor:"pointer", fontFamily:FB }}>
              {loading==="cancel" ? "Cancelando..." : "Cancelar assinatura"}
            </button>
          )}
        </div>
      )}

      {/* Mensagem feedback */}
      {msg && (
        <div style={{ maxWidth:1000, margin:"0 auto 20px", background:msg.type==="ok"?"#4ade8010":"#e05c5c10", border:`1px solid ${msg.type==="ok"?"#4ade8040":"#e05c5c40"}`, borderRadius:12, padding:"12px 20px", fontSize:13, color:msg.type==="ok"?C.green:C.ruby }}>
          {msg.type==="ok"?"✅":"❌"} {msg.text}
        </div>
      )}

      {/* Banner Trial */}
      {planStatus === "trial" && (
        <div style={{ maxWidth:1000, margin:"0 auto 32px", background:"linear-gradient(135deg,#c9a96e18,#c9a96e08)", border:"1px solid #c9a96e40", borderRadius:16, padding:"16px 24px", display:"flex", alignItems:"center", gap:14 }}>
          <span style={{ fontSize:28 }}>🎉</span>
          <div>
            <div style={{ fontSize:14, fontWeight:700, color:C.gold, marginBottom:4 }}>Voce esta no periodo de trial gratuito!</div>
            <div style={{ fontSize:12, color:"rgba(255,255,255,0.5)", lineHeight:1.5 }}>30 dias com acesso TOTAL. Escolha um plano antes do fim do trial para nao perder o acesso.</div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ textAlign:"center", marginBottom:48 }}>
        <div style={{ fontSize:11, letterSpacing:"0.3em", color:C.gold, textTransform:"uppercase", marginBottom:12 }}>Planos & Precos</div>
        <h1 style={{ fontFamily:FD, fontSize:"clamp(32px,5vw,52px)", color:C.text, fontWeight:700, marginBottom:16 }}>Escolha o plano ideal</h1>
        <p style={{ fontSize:15, color:C.textMuted, maxWidth:520, margin:"0 auto" }}>
          30 dias gratis com acesso completo. Apos o trial, escolha um plano ou continue no Free com limitacoes.
        </p>
      </div>

      {/* Seletor de periodo */}
      <div style={{ display:"flex", justifyContent:"center", gap:8, marginBottom:48, flexWrap:"wrap" }}>
        {PERIODS.map(p => (
          <button key={p.id} onClick={() => setPeriod(p.id)}
            style={{ padding:"10px 22px", borderRadius:50, border:`1px solid ${period===p.id?C.gold:C.border}`, background:period===p.id?`${C.gold}18`:"transparent", color:period===p.id?C.gold:C.textMuted, fontSize:13, cursor:"pointer", fontFamily:FB, fontWeight:600, display:"flex", alignItems:"center", gap:8 }}>
            {p.label}
            {p.discount > 0 && <span style={{ fontSize:10, background:`${C.sage}25`, color:C.sage, padding:"2px 8px", borderRadius:20, fontWeight:700 }}>-{p.discount}%</span>}
          </button>
        ))}
      </div>

      {/* Cards de planos */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(220px,1fr))", gap:16, maxWidth:1000, margin:"0 auto 48px" }}>
        {PLANS.map(plan => {
          const isCurrent = isCurrentPlan(plan.id);
          const isLoading = loading === plan.id;
          const cta = getCta(plan.id);
          const disabled = plan.id === "free" || isCurrent || isLoading;

          return (
            <div key={plan.id} style={{ background:plan.highlight?`linear-gradient(135deg,${C.gold}12,${C.gold}06)`:C.card, border:`2px solid ${isCurrent?C.green:plan.highlight?C.gold+"40":C.border}`, borderRadius:20, padding:28, position:"relative", boxShadow:plan.highlight?`0 0 40px ${C.gold}15`:"none" }}>
              {plan.highlight && !isCurrent && (
                <div style={{ position:"absolute", top:-12, left:"50%", transform:"translateX(-50%)", background:C.gold, color:"#0a0a0a", fontSize:10, fontWeight:700, padding:"4px 16px", borderRadius:20, letterSpacing:"0.1em", whiteSpace:"nowrap" }}>MAIS POPULAR</div>
              )}
              {isCurrent && (
                <div style={{ position:"absolute", top:-12, left:"50%", transform:"translateX(-50%)", background:C.green, color:"#0a0a0a", fontSize:10, fontWeight:700, padding:"4px 16px", borderRadius:20, letterSpacing:"0.1em", whiteSpace:"nowrap" }}>PLANO ATUAL</div>
              )}

              <div style={{ marginBottom:20 }}>
                <div style={{ fontSize:12, fontWeight:700, color:plan.color, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:4 }}>{plan.name}</div>
                <div style={{ fontSize:11, color:C.textMuted, marginBottom:12 }}>{plan.description}</div>
                {plan.monthly === 0 ? (
                  <div style={{ fontSize:36, fontWeight:700, color:C.text, fontFamily:FD }}>Gratis</div>
                ) : (
                  <>
                    <div style={{ display:"flex", alignItems:"baseline", gap:4 }}>
                      <span style={{ fontSize:13, color:C.textMuted }}>R$</span>
                      <span style={{ fontSize:40, fontWeight:700, color:C.text, fontFamily:FD, lineHeight:1 }}>{price(plan.id, plan.monthly).toFixed(2).replace(".",",")}</span>
                      <span style={{ fontSize:12, color:C.textMuted }}>/mes</span>
                    </div>
                    {period !== "monthly" && (
                      <div style={{ fontSize:11, color:C.textMuted, marginTop:4 }}>
                        Total: R${totalPrice(plan.id, plan.monthly).toFixed(2).replace(".",",")} / {period==="semiannual"?"6 meses":"12 meses"}
                      </div>
                    )}
                    {disc > 0 && (
                      <div style={{ fontSize:11, color:C.sage, marginTop:2 }}>
                        Economia de R${(plan.monthly * disc / 100 * months).toFixed(2).replace(".",",")} no periodo
                      </div>
                    )}
                  </>
                )}
                <div style={{ fontSize:13, color:plan.color, marginTop:8, fontWeight:600 }}>{dynamicPlans?.[plan.id]?.professionals ? `Ate ${dynamicPlans[plan.id].professionals} profissional${dynamicPlans[plan.id].professionals > 1 ? "is" : ""}` : plan.professionals}</div>
              </div>

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

              {plan.id !== "free" && (
                <div style={{ marginBottom:16, background:`${plan.color}10`, borderRadius:10, padding:"12px 14px" }}>
                  <div style={{ fontSize:12, color:plan.color, fontWeight:700, marginBottom:6 }}>✦ Acesso completo a tudo</div>
                  <div style={{ fontSize:11, color:C.textMuted, lineHeight:1.6 }}>
                    Todas as funcionalidades desbloqueadas.<br/>Limite apenas de profissionais.
                  </div>
                </div>
              )}

              {plan.id !== "free" && activePlan !== "free" && activePlan !== plan.id && planOrder.indexOf(plan.id) > planOrder.indexOf(activePlan) && (
                <div style={{ fontSize:10, color:C.gold, marginBottom:12, background:`${C.gold}08`, borderRadius:8, padding:"8px 10px" }}>
                  💡 Seu saldo restante sera abatido no valor do upgrade.
                </div>
              )}

              <button disabled={disabled} onClick={() => handleSubscribe(plan.id)}
                style={{ width:"100%", padding:"13px", borderRadius:12, background:isCurrent?`${C.green}15`:plan.id==="free"?"transparent":plan.highlight&&!isCurrent?C.gold:"transparent", border:`1px solid ${plan.id==="free"?C.border:isCurrent?C.green:plan.highlight?C.gold:plan.color}`, color:plan.id==="free"?C.textMuted:isCurrent?C.green:plan.highlight&&!isCurrent?"#0a0a0a":plan.color, fontSize:13, fontWeight:700, cursor:disabled?"default":"pointer", fontFamily:FB, opacity:disabled?0.6:1 }}>
                {isLoading ? "Processando..." : cta}
              </button>
            </div>
          );
        })}
      </div>

      {/* Todas as features */}
      <div style={{ maxWidth:800, margin:"0 auto 48px", background:C.card, border:`1px solid ${C.border}`, borderRadius:20, padding:36 }}>
        <h2 style={{ fontFamily:FD, fontSize:24, color:C.text, marginBottom:8, textAlign:"center" }}>Tudo incluido nos planos pagos</h2>
        <p style={{ fontSize:13, color:C.textMuted, textAlign:"center", marginBottom:28 }}>Acesso completo a todas as funcionalidades. O unico diferencial e o numero de profissionais.</p>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(220px,1fr))", gap:12 }}>
          {ALL_FEATURES.map((f, i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:10, fontSize:13, color:C.text }}>
              <span style={{ color:C.sage, fontSize:16 }}>✓</span>{f}
            </div>
          ))}
        </div>
      </div>

      <div style={{ textAlign:"center", fontSize:12, color:C.textMuted, paddingBottom:40 }}>
        Cobranca recorrente ate cancelar · Cancele a qualquer momento · Sem fidelidade
      </div>
    </div>
  );
}
