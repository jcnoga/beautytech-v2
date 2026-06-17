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
  const faqs = [
    { q: "Preciso de CNPJ?", a: "Nao. Qualquer profissional autonomo pode se cadastrar, pessoa fisica ou juridica." },
    { q: "O periodo gratis tem limitacoes?", a: "Nao. 14 dias com acesso completo, sem cartao de credito." },
    { q: "Meus clientes precisam criar conta?", a: "Nao. Agendam pelo link publico sem criar conta." },
    { q: "Como funciona o WhatsApp automatico?", a: "Envia confirmacoes e lembretes automaticamente." },
    { q: "Posso cancelar a qualquer momento?", a: "Sim, sem fidelidade, direto pelo painel." },
  ];

  return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.text, fontFamily:FB }}>

      <nav style={{ position:"fixed", top:0, left:0, right:0, zIndex:100, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 40px", background:"rgba(8,11,18,0.9)", backdropFilter:"blur(16px)", borderBottom:`1px solid ${C.border}` }}>
        <a href="/" style={{ fontFamily:FD, fontSize:"1.1rem", fontWeight:800, color:C.rose, textDecoration:"none" }}>ZenSalon</a>
        <div style={{ display:"flex", gap:24 }}>
          {[["#planos","Planos"],["#funcoes","Funcionalidades"],["#faq","Duvidas"]].map(([h,l]) => (
            <a key={h} href={h} style={{ color:C.muted, textDecoration:"none", fontSize:".82rem" }}>{l}</a>
          ))}
        </div>
        <a href="/register" style={{ padding:"8px 20px", background:C.rose, color:"#fff", borderRadius:50, fontSize:".82rem", fontWeight:700, textDecoration:"none" }}>Testar Gratis</a>
      </nav>

      <div style={{ minHeight:"80vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", textAlign:"center", padding:"100px 24px 60px" }}>
        <div style={{ fontSize:".7rem", fontWeight:700, letterSpacing:".12em", textTransform:"uppercase", color:C.rose, marginBottom:16 }}>Sistema de Gestao Online</div>
        <h1 style={{ fontFamily:FD, fontSize:"clamp(2rem,5vw,3.5rem)", fontWeight:800, lineHeight:1.1, maxWidth:700, marginBottom:20 }}>
          Seu salao cheio,<br />sua agenda <span style={{ color:C.rose }}>no controle.</span>
        </h1>
        <p style={{ fontSize:".95rem", color:C.muted, maxWidth:460, marginBottom:32 }}>Agendamento online, financeiro, WhatsApp automatico e muito mais.</p>
        <div style={{ display:"flex", gap:12, flexWrap:"wrap", justifyContent:"center", marginBottom:28 }}>
          <a href="/register" style={{ padding:"12px 28px", borderRadius:50, fontSize:".875rem", fontWeight:700, textDecoration:"none", background:C.rose, color:"#fff" }}>Criar conta gratis</a>
          <a href="/buscar" style={{ padding:"12px 28px", borderRadius:50, fontSize:".875rem", fontWeight:700, textDecoration:"none", border:`1px solid ${C.border}`, color:C.text }}>Ver saloes</a>
        </div>
        <div style={{ display:"flex", gap:20, fontSize:".75rem", color:C.muted, flexWrap:"wrap", justifyContent:"center" }}>
          <span>✓ 14 dias gratis, sem cartao</span>
          <span>✓ Configuracao em minutos</span>
          <span>✓ Suporte via WhatsApp</span>
        </div>
      </div>

      <div id="funcoes" style={{ padding:"60px 24px", maxWidth:1000, margin:"0 auto" }}>
        <div style={{ fontSize:".7rem", fontWeight:700, letterSpacing:".12em", textTransform:"uppercase", color:C.rose, marginBottom:10 }}>Funcionalidades</div>
        <h2 style={{ fontFamily:FD, fontSize:"clamp(1.6rem,3vw,2.2rem)", fontWeight:800, marginBottom:36 }}>Tudo que voce precisa</h2>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))", gap:16 }}>
          {[
            ["Agendamento Online","Clientes agendam 24h pelo link do seu salao."],
            ["WhatsApp Automatico","Confirmacoes e lembretes automaticamente."],
            ["Financeiro","Receitas, despesas, comissoes e relatorios."],
            ["Profissionais","Horarios, comissoes e servicos individuais."],
            ["Fidelidade","Pontos, cashback e recompensas automaticas."],
            ["CRM","Historico completo e campanhas segmentadas."],
            ["Pacotes","Venda pacotes antecipados com desconto."],
            ["Pagina Publica","Pagina com fotos, servicos e botao de agendar."],
            ["App no Celular","Instale na tela inicial sem App Store."],
          ].map(([t,d]) => (
            <div key={t} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:22 }}>
              <h3 style={{ fontFamily:FD, fontSize:".95rem", fontWeight:700, marginBottom:6, color:C.rose }}>{t}</h3>
              <p style={{ fontSize:".82rem", color:C.muted, lineHeight:1.6 }}>{d}</p>
            </div>
          ))}
        </div>
      </div>

      <div id="planos" style={{ padding:"60px 24px", maxWidth:1000, margin:"0 auto" }}>
        <div style={{ fontSize:".7rem", fontWeight:700, letterSpacing:".12em", textTransform:"uppercase", color:C.rose, marginBottom:10 }}>Planos</div>
        <h2 style={{ fontFamily:FD, fontSize:"clamp(1.6rem,3vw,2.2rem)", fontWeight:800, marginBottom:10 }}>Simples e transparente</h2>
        <p style={{ color:C.muted, fontSize:".85rem", marginBottom:28 }}>14 dias gratis em qualquer plano. Sem cartao.</p>
        <div style={{ display:"flex", gap:8, marginBottom:32, flexWrap:"wrap" }}>
          {[["mensal","Mensal",""],["semestral","Semestral","-10%"],["anual","Anual","-20%"]].map(([id,label,tag]) => (
            <button key={id} onClick={() => setPeriod(id)} style={{ padding:"8px 18px", border:`1px solid ${period===id?C.rose:C.border}`, borderRadius:50, background:period===id?C.rose:"transparent", color:period===id?"#fff":C.muted, fontSize:".82rem", fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", gap:6 }}>
              {label}{tag && <span style={{ padding:"1px 6px", borderRadius:50, fontSize:".65rem", fontWeight:700, background:C.sage, color:"#fff" }}>{tag}</span>}
            </button>
          ))}
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(210px,1fr))", gap:16 }}>
          {[
            { name:"FREE", color:C.muted, price:"Gratis", sub:"Ate 1 profissional", featured:false },
            { name:"BASICO", color:C.rose, price:`R$${prices.basico[period]}/mes`, sub:"1 profissional", featured:false },
            { name:"PRO", color:C.sage, price:`R$${prices.pro[period]}/mes`, sub:"3 profissionais", featured:true },
            { name:"SUPER", color:C.gold, price:`R$${prices.super[period]}/mes`, sub:"10 profissionais", featured:false },
          ].map(p => (
            <div key={p.name} style={{ background:p.featured?"linear-gradient(135deg,rgba(201,132,122,0.08),#141826)":C.card, border:`1px solid ${p.featured?C.rose:C.border}`, borderRadius:20, padding:24, position:"relative" }}>
              {p.featured && <div style={{ position:"absolute", top:-10, left:"50%", transform:"translateX(-50%)", background:C.rose, color:"#fff", fontSize:".65rem", fontWeight:700, padding:"3px 14px", borderRadius:50, whiteSpace:"nowrap" }}>Mais popular</div>}
              <div style={{ fontSize:".68rem", fontWeight:700, color:p.color, textTransform:"uppercase", letterSpacing:".08em", marginBottom:8 }}>{p.name}</div>
              <div style={{ fontFamily:FD, fontSize:"1.6rem", fontWeight:800, marginBottom:4 }}>{p.price}</div>
              <div style={{ fontSize:".75rem", color:C.muted, marginBottom:20 }}>{p.sub}</div>
              <a href="/register" style={{ display:"block", textAlign:"center", padding:"10px 0", background:p.featured?C.rose:"transparent", border:`1px solid ${p.featured?C.rose:C.border}`, borderRadius:50, color:p.featured?"#fff":C.text, textDecoration:"none", fontWeight:700, fontSize:".82rem" }}>
                {p.name==="FREE"?"Comecar gratis":"Testar 14 dias gratis"}
              </a>
            </div>
          ))}
        </div>
      </div>

      <div id="faq" style={{ background:C.surface, padding:"60px 24px" }}>
        <div style={{ maxWidth:680, margin:"0 auto" }}>
          <h2 style={{ fontFamily:FD, fontSize:"clamp(1.6rem,3vw,2.2rem)", fontWeight:800, marginBottom:32 }}>Perguntas frequentes</h2>
          {faqs.map((faq,i) => (
            <div key={i} style={{ borderBottom:`1px solid ${C.border}` }}>
              <button onClick={() => setFaqOpen(faqOpen===i?null:i)} style={{ width:"100%", textAlign:"left", padding:"16px 0", background:"none", border:"none", color:C.text, fontFamily:FB, fontSize:".875rem", fontWeight:600, cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center", gap:16 }}>
                {faq.q}<span style={{ color:C.rose, transform:faqOpen===i?"rotate(45deg)":"none", transition:"transform .25s", flexShrink:0 }}>+</span>
              </button>
              {faqOpen===i && <div style={{ paddingBottom:16, color:C.muted, fontSize:".82rem", lineHeight:1.7 }}>{faq.a}</div>}
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding:"60px 24px", textAlign:"center" }}>
        <h2 style={{ fontFamily:FD, fontSize:"clamp(1.6rem,3vw,2.2rem)", fontWeight:800, maxWidth:500, margin:"0 auto 12px" }}>Seu salao merece um sistema a altura</h2>
        <p style={{ color:C.muted, fontSize:".85rem", marginBottom:28 }}>14 dias gratis. Sem cartao de credito.</p>
        <a href="/register" style={{ padding:"12px 28px", background:C.rose, color:"#fff", borderRadius:50, fontSize:".875rem", fontWeight:700, textDecoration:"none" }}>Criar minha conta gratis</a>
        <div style={{ marginTop:16, fontSize:".75rem", color:C.muted }}>Duvidas? <a href="https://wa.me/5534997824990" style={{ color:C.sage, textDecoration:"none" }}>WhatsApp (34) 99782-4990</a></div>
      </div>

      <footer style={{ padding:"28px 24px", textAlign:"center", borderTop:`1px solid ${C.border}` }}>
        <div style={{ fontFamily:FD, fontSize:"1rem", fontWeight:800, color:C.rose, marginBottom:6 }}>ZenSalon</div>
        <p style={{ color:C.muted, fontSize:".75rem" }}>2026 ZenSalon - websitelog.com.br - Uberaba, MG</p>
      </footer>
    </div>
  );
}