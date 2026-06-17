# -*- coding: utf-8 -*-
path = r"C:\projetos\beautytech-v2\frontend\src\LandingPageSobre.tsx"

content = '''import { useState } from "react";

export default function LandingPageSobre() {
  const [period, setPeriod] = useState("mensal");
  const [faqOpen, setFaqOpen] = useState<number | null>(null);
  const prices: any = {
    basico: { mensal: "39,90", semestral: "35,90", anual: "31,90" },
    pro:    { mensal: "59,90", semestral: "53,90", anual: "47,90" },
    super:  { mensal: "99,90", semestral: "89,90", anual: "79,90" },
  };
  const C = { bg:"#080B12", surface:"#0F1320", card:"#141826", border:"rgba(255,255,255,0.07)", rose:"#C9847A", roseDim:"rgba(201,132,122,0.15)", gold:"#C9A96E", sage:"#7EB8A0", text:"#EEE9E2", muted:"rgba(238,233,226,0.45)" };
  const FB = "'Inter', sans-serif";
  const FD = "'Syne', sans-serif";
  const faqs = [
    { q: "Preciso de CNPJ para usar o ZenSalon?", a: "Nao. Qualquer profissional autonomo pode se cadastrar, seja pessoa fisica ou juridica." },
    { q: "O periodo gratis tem limitacoes?", a: "Durante os 14 dias voce tem acesso completo. Nao pedimos cartao de credito." },
    { q: "Meus clientes precisam criar conta para agendar?", a: "Nao. Seus clientes agendam pelo link publico, sem criar conta." },
    { q: "Como funciona o WhatsApp automatico?", a: "O sistema envia confirmacoes e lembretes automaticamente via WhatsApp." },
    { q: "Posso cancelar a qualquer momento?", a: "Sim. Sem fidelidade. Cancele quando quiser direto pelo painel." },
  ];

  return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.text, fontFamily:FB }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Inter:wght@400;500;600&display=swap'); *{box-sizing:border-box;} @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}`}</style>

      <nav style={{ position:"fixed", top:0, left:0, right:0, zIndex:100, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"18px 48px", background:"rgba(8,11,18,0.9)", backdropFilter:"blur(16px)", borderBottom:`1px solid ${C.border}` }}>
        <a href="/" style={{ fontFamily:FD, fontSize:"1.3rem", fontWeight:800, color:C.rose, textDecoration:"none" }}>ZenSalon</a>
        <div style={{ display:"flex", gap:28 }}>
          {[["#funcoes","Funcionalidades"],["#planos","Planos"],["#faq","Duvidas"]].map(([h,l]) => (
            <a key={h} href={h} style={{ color:C.muted, textDecoration:"none", fontSize:".875rem" }}>{l}</a>
          ))}
        </div>
        <a href="/register" style={{ padding:"10px 24px", background:C.rose, color:"#fff", borderRadius:50, fontSize:".875rem", fontWeight:700, textDecoration:"none" }}>Testar Gratis</a>
      </nav>

      <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", textAlign:"center", padding:"120px 24px 80px", position:"relative" }}>
        <div style={{ position:"absolute", inset:0, background:"radial-gradient(ellipse 80% 60% at 50% 0%, rgba(201,132,122,0.12) 0%, transparent 70%)", pointerEvents:"none" }} />
        <h1 style={{ fontFamily:FD, fontSize:"clamp(2.6rem, 7vw, 5rem)", fontWeight:800, lineHeight:1.05, letterSpacing:"-0.03em", maxWidth:820, marginBottom:24 }}>
          Seu salao cheio,<br />sua agenda <span style={{ color:C.rose }}>no controle.</span>
        </h1>
        <p style={{ fontSize:"1.1rem", color:C.muted, maxWidth:500, marginBottom:40 }}>
          Agendamento online, financeiro, WhatsApp automatico e muito mais.
        </p>
        <div style={{ display:"flex", gap:14, flexWrap:"wrap", justifyContent:"center", marginBottom:40 }}>
          <a href="/register" style={{ padding:"14px 32px", borderRadius:50, fontFamily:FB, fontSize:".95rem", fontWeight:700, textDecoration:"none", background:C.rose, color:"#fff" }}>Criar conta gratis</a>
          <a href="/buscar" style={{ padding:"14px 32px", borderRadius:50, fontFamily:FB, fontSize:".95rem", fontWeight:700, textDecoration:"none", border:`1px solid ${C.border}`, color:C.text }}>Ver saloes</a>
        </div>
        <div style={{ display:"flex", gap:24, flexWrap:"wrap", justifyContent:"center", fontSize:".8rem", color:C.muted }}>
          <span>14 dias gratis, sem cartao</span>
          <span>Configuracao em minutos</span>
          <span>Suporte via WhatsApp</span>
        </div>
      </div>

      <div id="funcoes" style={{ padding:"100px 24px", maxWidth:1100, margin:"0 auto" }}>
        <div style={{ fontSize:".72rem", fontWeight:700, letterSpacing:".12em", textTransform:"uppercase", color:C.rose, marginBottom:12 }}>Funcionalidades</div>
        <h2 style={{ fontFamily:FD, fontSize:"clamp(2rem,4vw,3rem)", fontWeight:800, marginBottom:48 }}>Tudo que voce precisa</h2>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:20 }}>
          {[
            ["Agendamento Online","Clientes agendam 24h pelo link do seu salao."],
            ["WhatsApp Automatico","Confirmacoes e lembretes enviados automaticamente."],
            ["Financeiro","Receitas, despesas, comissoes e relatorios."],
            ["Profissionais","Horarios, comissoes e servicos por profissional."],
            ["Fidelidade","Pontos, cashback e recompensas automaticas."],
            ["CRM","Historico completo e campanhas segmentadas."],
            ["Pacotes","Venda pacotes antecipados com desconto."],
            ["Pagina Publica","Pagina profissional com fotos e botao de agendar."],
            ["App no Celular","Instale na tela inicial sem App Store."],
          ].map(([t,d]) => (
            <div key={t} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:20, padding:28 }}>
              <h3 style={{ fontFamily:FD, fontSize:"1.05rem", fontWeight:700, marginBottom:8, color:C.rose }}>{t}</h3>
              <p style={{ fontSize:".875rem", color:C.muted, lineHeight:1.65 }}>{d}</p>
            </div>
          ))}
        </div>
      </div>

      <div id="planos" style={{ padding:"100px 24px", maxWidth:1100, margin:"0 auto" }}>
        <div style={{ fontSize:".72rem", fontWeight:700, letterSpacing:".12em", textTransform:"uppercase", color:C.rose, marginBottom:12 }}>Planos</div>
        <h2 style={{ fontFamily:FD, fontSize:"clamp(2rem,4vw,3rem)", fontWeight:800, marginBottom:12 }}>Simples e transparente</h2>
        <p style={{ color:C.muted, marginBottom:36 }}>14 dias gratis em qualquer plano. Sem cartao.</p>
        <div style={{ display:"flex", gap:10, marginBottom:48, flexWrap:"wrap" }}>
          {[["mensal","Mensal",""],["semestral","Semestral","-10%"],["anual","Anual","-20%"]].map(([id,label,tag]) => (
            <button key={id} onClick={() => setPeriod(id)} style={{ padding:"10px 22px", border:`1px solid ${period===id?C.rose:C.border}`, borderRadius:50, background:period===id?C.rose:"transparent", color:period===id?"#fff":C.muted, fontFamily:FB, fontSize:".875rem", fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", gap:8 }}>
              {label}{tag && <span style={{ padding:"2px 8px", borderRadius:50, fontSize:".7rem", fontWeight:700, background:C.sage, color:"#fff" }}>{tag}</span>}
            </button>
          ))}
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(230px,1fr))", gap:20 }}>

          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:24, padding:32 }}>
            <div style={{ fontSize:".75rem", fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:".08em" }}>FREE</div>
            <div style={{ fontFamily:FD, fontSize:"2.5rem", fontWeight:800, margin:"12px 0 4px" }}>Gratis</div>
            <div style={{ fontSize:".8rem", color:C.muted, marginBottom:24 }}>Ate 1 profissional</div>
            <a href="/register" style={{ display:"block", textAlign:"center", padding:"14px 0", border:`1px solid ${C.border}`, borderRadius:50, color:C.text, textDecoration:"none", fontWeight:700 }}>Comecar gratis</a>
          </div>

          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:24, padding:32 }}>
            <div style={{ fontSize:".75rem", fontWeight:700, color:C.rose, textTransform:"uppercase", letterSpacing:".08em" }}>BASICO</div>
            <div style={{ fontFamily:FD, fontSize:"2.5rem", fontWeight:800, margin:"12px 0 4px" }}>R${prices.basico[period]}<span style={{ fontSize:"1rem", color:C.muted }}>/mes</span></div>
            <div style={{ fontSize:".8rem", color:C.muted, marginBottom:24 }}>1 profissional - acesso completo</div>
            <a href="/register" style={{ display:"block", textAlign:"center", padding:"14px 0", border:`1px solid ${C.border}`, borderRadius:50, color:C.text, textDecoration:"none", fontWeight:700 }}>Testar 14 dias gratis</a>
          </div>

          <div style={{ background:"linear-gradient(135deg,rgba(201,132,122,0.08) 0%,#141826 100%)", border:`1px solid ${C.rose}`, borderRadius:24, padding:32, position:"relative" }}>
            <div style={{ position:"absolute", top:-12, left:"50%", transform:"translateX(-50%)", background:C.rose, color:"#fff", fontSize:".72rem", fontWeight:700, padding:"4px 16px", borderRadius:50, whiteSpace:"nowrap" }}>Mais popular</div>
            <div style={{ fontSize:".75rem", fontWeight:700, color:C.sage, textTransform:"uppercase", letterSpacing:".08em" }}>PRO</div>
            <div style={{ fontFamily:FD, fontSize:"2.5rem", fontWeight:800, margin:"12px 0 4px" }}>R${prices.pro[period]}<span style={{ fontSize:"1rem", color:C.muted }}>/mes</span></div>
            <div style={{ fontSize:".8rem", color:C.muted, marginBottom:24 }}>3 profissionais - acesso completo</div>
            <a href="/register" style={{ display:"block", textAlign:"center", padding:"14px 0", background:C.rose, borderRadius:50, color:"#fff", textDecoration:"none", fontWeight:700 }}>Testar 14 dias gratis</a>
          </div>

          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:24, padding:32 }}>
            <div style={{ fontSize:".75rem", fontWeight:700, color:C.gold, textTransform:"uppercase", letterSpacing:".08em" }}>SUPER</div>
            <div style={{ fontFamily:FD, fontSize:"2.5rem", fontWeight:800, margin:"12px 0 4px" }}>R${prices.super[period]}<span style={{ fontSize:"1rem", color:C.muted }}>/mes</span></div>
            <div style={{ fontSize:".8rem", color:C.muted, marginBottom:24 }}>10 profissionais - acesso completo</div>
            <a href="/register" style={{ display:"block", textAlign:"center", padding:"14px 0", border:`1px solid ${C.border}`, borderRadius:50, color:C.text, textDecoration:"none", fontWeight:700 }}>Testar 14 dias gratis</a>
          </div>

        </div>
      </div>

      <div id="faq" style={{ background:C.surface, padding:"100px 24px" }}>
        <div style={{ maxWidth:720, margin:"0 auto" }}>
          <h2 style={{ fontFamily:FD, fontSize:"clamp(2rem,4vw,3rem)", fontWeight:800, marginBottom:40 }}>Perguntas frequentes</h2>
          {faqs.map((faq,i) => (
            <div key={i} style={{ borderBottom:`1px solid ${C.border}` }}>
              <button onClick={() => setFaqOpen(faqOpen===i?null:i)} style={{ width:"100%", textAlign:"left", padding:"20px 0", background:"none", border:"none", color:C.text, fontFamily:FB, fontSize:".95rem", fontWeight:600, cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center", gap:16 }}>
                {faq.q}<span style={{ color:C.rose, fontSize:"1.2rem", transform:faqOpen===i?"rotate(45deg)":"none", transition:"transform .25s", flexShrink:0 }}>+</span>
              </button>
              {faqOpen===i && <div style={{ paddingBottom:20, color:C.muted, fontSize:".875rem", lineHeight:1.75 }}>{faq.a}</div>}
            </div>
          ))}
        </div>
      </div>

      <div style={{ background:"linear-gradient(135deg,rgba(201,132,122,0.1) 0%,rgba(126,184,160,0.05) 100%)", borderTop:`1px solid ${C.border}`, padding:"100px 24px", textAlign:"center" }}>
        <h2 style={{ fontFamily:FD, fontSize:"clamp(2rem,4vw,3rem)", fontWeight:800, maxWidth:600, margin:"0 auto 16px" }}>Seu salao merece um sistema a altura</h2>
        <p style={{ color:C.muted, marginBottom:36 }}>14 dias gratis. Sem cartao de credito.</p>
        <a href="/register" style={{ padding:"16px 36px", background:C.rose, color:"#fff", borderRadius:50, fontSize:"1rem", fontWeight:700, textDecoration:"none" }}>Criar minha conta gratis</a>
        <div style={{ marginTop:20, fontSize:".8rem", color:C.muted }}>
          Duvidas? <a href="https://wa.me/5534997824990" style={{ color:C.sage, textDecoration:"none" }}>WhatsApp (34) 99782-4990</a>
        </div>
      </div>

      <footer style={{ padding:"40px 24px", textAlign:"center", borderTop:`1px solid ${C.border}` }}>
        <div style={{ fontFamily:FD, fontSize:"1.1rem", fontWeight:800, color:C.rose, marginBottom:8 }}>ZenSalon</div>
        <div style={{ display:"flex", gap:24, justifyContent:"center", flexWrap:"wrap", marginBottom:20 }}>
          {[["#funcoes","Funcionalidades"],["#planos","Planos"],["#faq","Duvidas"],["/buscar","Buscar Saloes"],["https://wa.me/5534997824990","WhatsApp"]].map(([h,l]) => (
            <a key={h} href={h} style={{ color:C.muted, textDecoration:"none", fontSize:".8rem" }}>{l}</a>
          ))}
        </div>
        <p style={{ color:C.muted, fontSize:".78rem" }}>2026 ZenSalon - websitelog.com.br - Uberaba, MG</p>
      </footer>
    </div>
  );
}
'''

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

import os
print("OK - " + str(os.path.getsize(path)) + " bytes")
