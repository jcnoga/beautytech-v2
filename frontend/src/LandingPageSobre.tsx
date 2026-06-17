import { useState } from "react";

export default function LandingPageSobre() {
  const [period, setPeriod] = useState("mensal");
  const [faqOpen, setFaqOpen] = useState(null);
  const prices = {
    basico: { mensal: "39,90", semestral: "35,90", anual: "31,90" },
    pro:    { mensal: "59,90", semestral: "53,90", anual: "47,90" },
    super:  { mensal: "99,90", semestral: "89,90", anual: "79,90" },
  };
  const C = { bg:"#080B12", surface:"#0F1320", card:"#141826", border:"rgba(255,255,255,0.07)", rose:"#C9847A", gold:"#C9A96E", sage:"#7EB8A0", text:"#EEE9E2", muted:"rgba(238,233,226,0.45)" };
  const FB = "'Inter', sans-serif";
  const FD = "'Syne', sans-serif";

  return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.text, fontFamily:FB }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Inter:wght@400;500;600&display=swap');`}</style>
      <nav style={{ position:"fixed", top:0, left:0, right:0, zIndex:100, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"18px 48px", background:"rgba(8,11,18,0.9)", backdropFilter:"blur(16px)", borderBottom:`1px solid ${C.border}` }}>
        <a href="/" style={{ fontFamily:FD, fontSize:"1.3rem", fontWeight:800, color:C.rose, textDecoration:"none" }}>ZenSalon</a>
        <a href="/register" style={{ padding:"10px 24px", background:C.rose, color:"#fff", borderRadius:50, fontSize:".875rem", fontWeight:700, textDecoration:"none" }}>Testar Gratis</a>
      </nav>
      <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", textAlign:"center", padding:"120px 24px 80px" }}>
        <h1 style={{ fontFamily:FD, fontSize:"clamp(2.6rem,7vw,5rem)", fontWeight:800, lineHeight:1.05, maxWidth:820, marginBottom:24 }}>
          Seu salao cheio, sua agenda <span style={{ color:C.rose }}>no controle.</span>
        </h1>
        <p style={{ fontSize:"1.1rem", color:C.muted, maxWidth:500, marginBottom:40 }}>Agendamento online, financeiro, WhatsApp automatico e muito mais.</p>
        <div style={{ display:"flex", gap:14, flexWrap:"wrap", justifyContent:"center", marginBottom:40 }}>
          <a href="/register" style={{ padding:"14px 32px", borderRadius:50, fontSize:".95rem", fontWeight:700, textDecoration:"none", background:C.rose, color:"#fff" }}>Criar conta gratis</a>
          <a href="/buscar" style={{ padding:"14px 32px", borderRadius:50, fontSize:".95rem", fontWeight:700, textDecoration:"none", border:`1px solid ${C.border}`, color:C.text }}>Ver saloes</a>
        </div>
        <div style={{ display:"flex", gap:24, fontSize:".8rem", color:C.muted }}>
          <span>14 dias gratis, sem cartao</span>
          <span>Configuracao em minutos</span>
          <span>Suporte via WhatsApp</span>
        </div>
      </div>
      <div id="planos" style={{ padding:"80px 24px", maxWidth:1100, margin:"0 auto" }}>
        <h2 style={{ fontFamily:FD, fontSize:"2.5rem", fontWeight:800, marginBottom:12 }}>Planos</h2>
        <p style={{ color:C.muted, marginBottom:36 }}>14 dias gratis. Sem cartao.</p>
        <div style={{ display:"flex", gap:10, marginBottom:40, flexWrap:"wrap" }}>
          {["mensal","semestral","anual"].map(id => (
            <button key={id} onClick={() => setPeriod(id)} style={{ padding:"10px 22px", border:`1px solid ${period===id?C.rose:C.border}`, borderRadius:50, background:period===id?C.rose:"transparent", color:period===id?"#fff":C.muted, fontSize:".875rem", fontWeight:600, cursor:"pointer" }}>
              {id.charAt(0).toUpperCase()+id.slice(1)}
            </button>
          ))}
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(230px,1fr))", gap:20 }}>
          {[
            { name:"FREE", color:C.muted, price:"Gratis", sub:"Ate 1 profissional", featured:false },
            { name:"BASICO", color:C.rose, price:`R$${prices.basico[period]}/mes`, sub:"1 profissional", featured:false },
            { name:"PRO", color:C.sage, price:`R$${prices.pro[period]}/mes`, sub:"3 profissionais", featured:true },
            { name:"SUPER", color:C.gold, price:`R$${prices.super[period]}/mes`, sub:"10 profissionais", featured:false },
          ].map(p => (
            <div key={p.name} style={{ background:p.featured?"linear-gradient(135deg,rgba(201,132,122,0.08),#141826)":C.card, border:`1px solid ${p.featured?C.rose:C.border}`, borderRadius:24, padding:32, position:"relative" }}>
              {p.featured && <div style={{ position:"absolute", top:-12, left:"50%", transform:"translateX(-50%)", background:C.rose, color:"#fff", fontSize:".72rem", fontWeight:700, padding:"4px 16px", borderRadius:50, whiteSpace:"nowrap" }}>Mais popular</div>}
              <div style={{ fontSize:".75rem", fontWeight:700, color:p.color, textTransform:"uppercase", letterSpacing:".08em", marginBottom:8 }}>{p.name}</div>
              <div style={{ fontFamily:FD, fontSize:"2rem", fontWeight:800, marginBottom:4 }}>{p.price}</div>
              <div style={{ fontSize:".8rem", color:C.muted, marginBottom:24 }}>{p.sub} - acesso completo</div>
              <a href="/register" style={{ display:"block", textAlign:"center", padding:"14px 0", background:p.featured?C.rose:"transparent", border:`1px solid ${p.featured?C.rose:C.border}`, borderRadius:50, color:p.featured?"#fff":C.text, textDecoration:"none", fontWeight:700 }}>
                {p.name==="FREE"?"Comecar gratis":"Testar 14 dias gratis"}
              </a>
            </div>
          ))}
        </div>
      </div>
      <footer style={{ padding:"40px 24px", textAlign:"center", borderTop:`1px solid ${C.border}` }}>
        <div style={{ fontFamily:FD, fontSize:"1.1rem", fontWeight:800, color:C.rose, marginBottom:8 }}>ZenSalon</div>
        <p style={{ color:C.muted, fontSize:".78rem" }}>2026 ZenSalon - websitelog.com.br - Uberaba, MG</p>
      </footer>
    </div>
  );
}