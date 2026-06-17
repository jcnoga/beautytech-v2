# -*- coding: utf-8 -*-
path = r"C:\projetos\beautytech-v2\frontend\src\LandingPageSobre.tsx"

content = '''import { useState } from "react";

export default function LandingPageSobre() {
  const [period, setPeriod] = useState("mensal");
  const [faqOpen, setFaqOpen] = useState(null);
  const prices = {
    basico: { mensal: "39,90", semestral: "35,90", anual: "31,90" },
    pro:    { mensal: "59,90", semestral: "53,90", anual: "47,90" },
    super:  { mensal: "99,90", semestral: "89,90", anual: "79,90" },
  };
  const C = {
    bg:"#0B0F1A", card:"#141826", card2:"#1C2235", surface:"#0F1320",
    border:"rgba(255,255,255,0.07)", borderHi:"rgba(255,255,255,0.12)",
    rose:"#C9847A", gold:"#C9A96E", sage:"#7EB8A0",
    text:"#E2E8F0", textMuted:"#94A3B8",
  };
  const FB = "'Inter', sans-serif";
  const FD = "'Syne', sans-serif";

  const planFeatures = [
    "Clientes ilimitados",
    "Agendamentos ilimitados",
    "WhatsApp automatico",
    "Financeiro completo",
    "Comissoes e fidelidade",
  ];

  const freeFeatures = ["1 profissional","Ate 30 clientes","Ate 50 agendamentos/mes","Agendamento basico","Gestao de servicos"];
  const freeLocked  = ["CRM avancado","Automacoes WhatsApp","Comissoes","Fidelidade"];

  const faqs = [
    { q: "Preciso de CNPJ para usar o ZenSalon?", a: "Nao. Qualquer profissional autonomo pode se cadastrar, seja pessoa fisica ou juridica." },
    { q: "O periodo gratis tem limitacoes?", a: "Nao. Durante 14 dias voce tem acesso completo. Sem cartao de credito." },
    { q: "Meus clientes precisam criar conta para agendar?", a: "Nao. Seus clientes agendam pelo link publico sem criar conta." },
    { q: "Como funciona o WhatsApp automatico?", a: "O sistema envia confirmacoes e lembretes automaticamente via WhatsApp." },
    { q: "Posso cancelar a qualquer momento?", a: "Sim. Sem fidelidade. Cancele quando quiser direto pelo painel." },
  ];

  const planColors: any = { FREE: C.textMuted, BASICO: C.rose, PRO: C.sage, SUPER: C.gold };

  const Tag = ({ label, color }: any) => (
    <span style={{ fontSize:".65rem", fontWeight:700, padding:"2px 8px", borderRadius:50, background:`${color}20`, color }}>{label}</span>
  );

  return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.text, fontFamily:FB }}>

      {/* NAV */}
      <nav style={{ position:"fixed", top:0, left:0, right:0, zIndex:100, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 40px", background:"rgba(11,15,26,0.92)", backdropFilter:"blur(16px)", borderBottom:`1px solid ${C.border}` }}>
        <a href="/" style={{ fontFamily:FD, fontSize:"1.1rem", fontWeight:800, color:C.rose, textDecoration:"none" }}>ZenSalon</a>
        <div style={{ display:"flex", gap:24 }}>
          {[["#planos","Planos"],["#funcoes","Funcionalidades"],["#faq","Duvidas"]].map(([h,l]) => (
            <a key={h} href={h} style={{ color:C.textMuted, textDecoration:"none", fontSize:".82rem", fontWeight:500 }}>{l}</a>
          ))}
        </div>
        <a href="/register" style={{ padding:"8px 20px", background:C.rose, color:"#fff", borderRadius:50, fontSize:".82rem", fontWeight:700, textDecoration:"none" }}>Testar Gratis</a>
      </nav>

      {/* HERO */}
      <div style={{ minHeight:"80vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", textAlign:"center", padding:"100px 24px 60px", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", inset:0, background:"radial-gradient(ellipse 80% 50% at 50% 0%, rgba(201,132,122,0.1) 0%, transparent 70%)", pointerEvents:"none" }} />
        <div style={{ fontSize:".68rem", fontWeight:700, letterSpacing:".12em", textTransform:"uppercase" as const, color:C.rose, marginBottom:16 }}>Sistema de Gestao Online</div>
        <h1 style={{ fontFamily:FD, fontSize:"clamp(2rem,5vw,3.2rem)", fontWeight:800, lineHeight:1.1, maxWidth:680, marginBottom:18 }}>
          Seu salao cheio,<br />sua agenda <span style={{ color:C.rose }}>no controle.</span>
        </h1>
        <p style={{ fontSize:".95rem", color:C.textMuted, maxWidth:440, marginBottom:32, lineHeight:1.65 }}>
          Agendamento online, financeiro, WhatsApp automatico e muito mais — tudo em uma plataforma.
        </p>
        <div style={{ display:"flex", gap:12, flexWrap:"wrap" as const, justifyContent:"center", marginBottom:28 }}>
          <a href="/register" style={{ padding:"12px 28px", borderRadius:50, fontSize:".875rem", fontWeight:700, textDecoration:"none", background:C.rose, color:"#fff", transition:"all .2s" }}>Criar conta gratis</a>
          <a href="/buscar" style={{ padding:"12px 28px", borderRadius:50, fontSize:".875rem", fontWeight:700, textDecoration:"none", border:`1px solid ${C.border}`, color:C.text }}>Ver saloes</a>
        </div>
        <div style={{ display:"flex", gap:20, fontSize:".75rem", color:C.textMuted, flexWrap:"wrap" as const, justifyContent:"center" }}>
          <span>✓ 14 dias gratis, sem cartao</span>
          <span>✓ Configuracao em minutos</span>
          <span>✓ Suporte via WhatsApp</span>
        </div>
      </div>

      {/* FUNCIONALIDADES */}
      <div id="funcoes" style={{ padding:"60px 24px", maxWidth:1000, margin:"0 auto" }}>
        <div style={{ fontSize:".68rem", fontWeight:700, letterSpacing:".12em", textTransform:"uppercase" as const, color:C.rose, marginBottom:10 }}>Funcionalidades</div>
        <h2 style={{ fontFamily:FD, fontSize:"clamp(1.5rem,3vw,2rem)", fontWeight:800, marginBottom:32 }}>Tudo que voce precisa para crescer</h2>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))", gap:14 }}>
          {[
            ["Agendamento Online","Clientes agendam 24h pelo link do seu salao, sem precisar ligar."],
            ["WhatsApp Automatico","Confirmacoes, lembretes e pos-atendimento enviados automaticamente."],
            ["Financeiro","Receitas, despesas, comissoes e relatorios gerenciais."],
            ["Profissionais","Horarios, comissoes e servicos configurados individualmente."],
            ["Programa de Fidelidade","Pontos, cashback e recompensas automaticas para clientes."],
            ["CRM","Historico completo, preferencias e campanhas segmentadas."],
            ["Pacotes de Servicos","Venda pacotes antecipados com desconto e controle de sessoes."],
            ["Pagina Publica","Pagina profissional com fotos, servicos e botao de agendar."],
            ["App no Celular","Instale na tela inicial como um app. Sem App Store."],
          ].map(([t,d]) => (
            <div key={t} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:20 }}>
              <div style={{ fontSize:".875rem", fontWeight:700, color:C.rose, marginBottom:6 }}>{t}</div>
              <div style={{ fontSize:".8rem", color:C.textMuted, lineHeight:1.6 }}>{d}</div>
            </div>
          ))}
        </div>
      </div>

      {/* COMO FUNCIONA */}
      <div style={{ background:C.surface, padding:"60px 24px" }}>
        <div style={{ maxWidth:1000, margin:"0 auto" }}>
          <div style={{ fontSize:".68rem", fontWeight:700, letterSpacing:".12em", textTransform:"uppercase" as const, color:C.rose, marginBottom:10 }}>Como funciona</div>
          <h2 style={{ fontFamily:FD, fontSize:"clamp(1.5rem,3vw,2rem)", fontWeight:800, marginBottom:36 }}>Comece em minutos</h2>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:28 }}>
            {[
              ["1","Crie sua conta","Cadastre seu estabelecimento em menos de 2 minutos."],
              ["2","Configure servicos","Adicione profissionais, servicos e horarios."],
              ["3","Compartilhe o link","Envie pelo WhatsApp, Instagram e Google."],
              ["4","Gerencie tudo","Agenda, financeiro e clientes em um painel."],
            ].map(([n,t,d]) => (
              <div key={n} style={{ textAlign:"center" as const }}>
                <div style={{ width:48, height:48, borderRadius:"50%", border:`2px solid ${C.rose}`, color:C.rose, fontFamily:FD, fontSize:"1.1rem", fontWeight:800, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px" }}>{n}</div>
                <div style={{ fontSize:".875rem", fontWeight:700, marginBottom:6 }}>{t}</div>
                <div style={{ fontSize:".78rem", color:C.textMuted, lineHeight:1.6 }}>{d}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* PLANOS */}
      <div id="planos" style={{ padding:"60px 24px", maxWidth:1000, margin:"0 auto" }}>
        <div style={{ fontSize:".68rem", fontWeight:700, letterSpacing:".12em", textTransform:"uppercase" as const, color:C.rose, marginBottom:10 }}>Planos</div>
        <h2 style={{ fontFamily:FD, fontSize:"clamp(1.5rem,3vw,2rem)", fontWeight:800, marginBottom:8 }}>Simples e transparente</h2>
        <p style={{ color:C.textMuted, fontSize:".85rem", marginBottom:24 }}>14 dias gratis em qualquer plano. Sem cartao de credito para comecar.</p>

        {/* Toggle periodo */}
        <div style={{ display:"flex", gap:8, marginBottom:32, flexWrap:"wrap" as const }}>
          {[["mensal","Mensal",""],["semestral","Semestral","-10%"],["anual","Anual","-20%"]].map(([id,label,tag]) => (
            <button key={id} onClick={() => setPeriod(id)} style={{ padding:"8px 18px", border:`1px solid ${period===id?C.rose:C.border}`, borderRadius:50, background:period===id?C.rose:"transparent", color:period===id?"#fff":C.textMuted, fontSize:".82rem", fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", gap:6 }}>
              {label}{tag && <span style={{ padding:"1px 6px", borderRadius:50, fontSize:".62rem", fontWeight:700, background:id==="anual"?C.rose:C.sage, color:"#fff" }}>{tag}</span>}
            </button>
          ))}
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(210px,1fr))", gap:16 }}>

          {/* FREE */}
          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:18, padding:24 }}>
            <div style={{ fontSize:".68rem", fontWeight:700, color:C.textMuted, textTransform:"uppercase" as const, letterSpacing:".08em", marginBottom:4 }}>FREE</div>
            <div style={{ fontSize:".8rem", color:C.textMuted, marginBottom:16 }}>Gratis para sempre</div>
            <div style={{ fontFamily:FD, fontSize:"1.8rem", fontWeight:800, marginBottom:4 }}>Gratis</div>
            <div style={{ fontSize:".75rem", color:C.textMuted, marginBottom:20 }}>Ate 1 profissional</div>
            <ul style={{ listStyle:"none", padding:0, marginBottom:20 }}>
              {freeFeatures.map(i => (
                <li key={i} style={{ fontSize:".78rem", padding:"6px 0", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ color:C.sage, fontWeight:700, flexShrink:0 }}>✓</span>{i}
                </li>
              ))}
              {freeLocked.map(i => (
                <li key={i} style={{ fontSize:".78rem", padding:"6px 0", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", gap:8, color:C.textMuted, opacity:.5 }}>
                  <span style={{ fontWeight:700, flexShrink:0 }}>×</span>{i}
                </li>
              ))}
            </ul>
            <a href="/register" style={{ display:"block", textAlign:"center", padding:"10px 0", border:`1px solid ${C.border}`, borderRadius:50, color:C.text, textDecoration:"none", fontWeight:700, fontSize:".8rem" }}>Comecar gratis</a>
          </div>

          {/* BASICO */}
          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:18, padding:24 }}>
            <div style={{ fontSize:".68rem", fontWeight:700, color:C.rose, textTransform:"uppercase" as const, letterSpacing:".08em", marginBottom:4 }}>BASICO</div>
            <div style={{ fontSize:".8rem", color:C.textMuted, marginBottom:16 }}>Para autonomos</div>
            <div style={{ fontFamily:FD, fontSize:"1.8rem", fontWeight:800, marginBottom:2 }}>R${prices.basico[period]}<span style={{ fontSize:".9rem", fontWeight:400, color:C.textMuted }}>/mes</span></div>
            <div style={{ fontSize:".75rem", color:C.textMuted, marginBottom:16 }}>Ate 1 profissional</div>
            <div style={{ background:`${C.rose}15`, border:`1px solid ${C.rose}30`, borderRadius:10, padding:"10px 12px", marginBottom:16 }}>
              <div style={{ color:C.rose, fontSize:".75rem", fontWeight:700, marginBottom:3 }}>+ Acesso completo a tudo</div>
              <div style={{ fontSize:".72rem", color:C.textMuted }}>Todas as funcionalidades desbloqueadas.</div>
            </div>
            <ul style={{ listStyle:"none", padding:0, marginBottom:20 }}>
              {["1 profissional",...planFeatures].map(i => (
                <li key={i} style={{ fontSize:".78rem", padding:"6px 0", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ color:C.sage, fontWeight:700, flexShrink:0 }}>✓</span>{i}
                </li>
              ))}
            </ul>
            <a href="/register" style={{ display:"block", textAlign:"center", padding:"10px 0", border:`1px solid ${C.border}`, borderRadius:50, color:C.text, textDecoration:"none", fontWeight:700, fontSize:".8rem" }}>Testar 14 dias gratis</a>
          </div>

          {/* PRO */}
          <div style={{ background:"linear-gradient(135deg,rgba(201,132,122,0.08) 0%,#141826 100%)", border:`2px solid ${C.rose}`, borderRadius:18, padding:24, position:"relative" }}>
            <div style={{ position:"absolute", top:-11, left:"50%", transform:"translateX(-50%)", background:C.rose, color:"#fff", fontSize:".62rem", fontWeight:700, padding:"3px 14px", borderRadius:50, whiteSpace:"nowrap" as const, letterSpacing:".06em", textTransform:"uppercase" as const }}>MAIS POPULAR</div>
            <div style={{ fontSize:".68rem", fontWeight:700, color:C.sage, textTransform:"uppercase" as const, letterSpacing:".08em", marginBottom:4 }}>PRO</div>
            <div style={{ fontSize:".8rem", color:C.textMuted, marginBottom:16 }}>Para saloes em crescimento</div>
            <div style={{ fontFamily:FD, fontSize:"1.8rem", fontWeight:800, marginBottom:2 }}>R${prices.pro[period]}<span style={{ fontSize:".9rem", fontWeight:400, color:C.textMuted }}>/mes</span></div>
            <div style={{ fontSize:".75rem", color:C.textMuted, marginBottom:16 }}>Ate 3 profissionais</div>
            <div style={{ background:`${C.sage}15`, border:`1px solid ${C.sage}30`, borderRadius:10, padding:"10px 12px", marginBottom:16 }}>
              <div style={{ color:C.sage, fontSize:".75rem", fontWeight:700, marginBottom:3 }}>+ Acesso completo a tudo</div>
              <div style={{ fontSize:".72rem", color:C.textMuted }}>Todas as funcionalidades desbloqueadas.</div>
            </div>
            <ul style={{ listStyle:"none", padding:0, marginBottom:20 }}>
              {["Ate 3 profissionais",...planFeatures].map(i => (
                <li key={i} style={{ fontSize:".78rem", padding:"6px 0", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ color:C.sage, fontWeight:700, flexShrink:0 }}>✓</span>{i}
                </li>
              ))}
            </ul>
            <a href="/register" style={{ display:"block", textAlign:"center", padding:"10px 0", background:C.rose, borderRadius:50, color:"#fff", textDecoration:"none", fontWeight:700, fontSize:".8rem" }}>Testar 14 dias gratis</a>
          </div>

          {/* SUPER */}
          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:18, padding:24 }}>
            <div style={{ fontSize:".68rem", fontWeight:700, color:C.gold, textTransform:"uppercase" as const, letterSpacing:".08em", marginBottom:4 }}>SUPER</div>
            <div style={{ fontSize:".8rem", color:C.textMuted, marginBottom:16 }}>Para grandes operacoes</div>
            <div style={{ fontFamily:FD, fontSize:"1.8rem", fontWeight:800, marginBottom:2 }}>R${prices.super[period]}<span style={{ fontSize:".9rem", fontWeight:400, color:C.textMuted }}>/mes</span></div>
            <div style={{ fontSize:".75rem", color:C.textMuted, marginBottom:16 }}>Ate 10 profissionais</div>
            <div style={{ background:`${C.gold}15`, border:`1px solid ${C.gold}30`, borderRadius:10, padding:"10px 12px", marginBottom:16 }}>
              <div style={{ color:C.gold, fontSize:".75rem", fontWeight:700, marginBottom:3 }}>+ Acesso completo a tudo</div>
              <div style={{ fontSize:".72rem", color:C.textMuted }}>Todas as funcionalidades desbloqueadas.</div>
            </div>
            <ul style={{ listStyle:"none", padding:0, marginBottom:20 }}>
              {["Ate 10 profissionais",...planFeatures].map(i => (
                <li key={i} style={{ fontSize:".78rem", padding:"6px 0", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ color:C.sage, fontWeight:700, flexShrink:0 }}>✓</span>{i}
                </li>
              ))}
            </ul>
            <a href="/register" style={{ display:"block", textAlign:"center", padding:"10px 0", border:`1px solid ${C.border}`, borderRadius:50, color:C.text, textDecoration:"none", fontWeight:700, fontSize:".8rem" }}>Testar 14 dias gratis</a>
          </div>

        </div>
      </div>

      {/* FAQ */}
      <div id="faq" style={{ background:C.surface, padding:"60px 24px" }}>
        <div style={{ maxWidth:680, margin:"0 auto" }}>
          <h2 style={{ fontFamily:FD, fontSize:"clamp(1.5rem,3vw,2rem)", fontWeight:800, marginBottom:28 }}>Perguntas frequentes</h2>
          {faqs.map((faq,i) => (
            <div key={i} style={{ borderBottom:`1px solid ${C.border}` }}>
              <button onClick={() => setFaqOpen(faqOpen===i?null:i)} style={{ width:"100%", textAlign:"left" as const, padding:"16px 0", background:"none", border:"none", color:C.text, fontFamily:FB, fontSize:".875rem", fontWeight:600, cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center", gap:16 }}>
                {faq.q}<span style={{ color:C.rose, transform:faqOpen===i?"rotate(45deg)":"none", transition:"transform .25s", flexShrink:0, fontSize:"1.1rem" }}>+</span>
              </button>
              {faqOpen===i && <div style={{ paddingBottom:16, color:C.textMuted, fontSize:".82rem", lineHeight:1.7 }}>{faq.a}</div>}
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{ padding:"60px 24px", textAlign:"center" as const, background:`linear-gradient(135deg,rgba(201,132,122,0.08) 0%,rgba(126,184,160,0.04) 100%)`, borderTop:`1px solid ${C.border}` }}>
        <h2 style={{ fontFamily:FD, fontSize:"clamp(1.5rem,3vw,2rem)", fontWeight:800, maxWidth:480, margin:"0 auto 12px" }}>Seu salao merece um sistema a altura</h2>
        <p style={{ color:C.textMuted, fontSize:".85rem", marginBottom:28 }}>14 dias gratis. Sem cartao de credito.</p>
        <a href="/register" style={{ padding:"12px 28px", background:C.rose, color:"#fff", borderRadius:50, fontSize:".875rem", fontWeight:700, textDecoration:"none" }}>Criar minha conta gratis</a>
        <div style={{ marginTop:14, fontSize:".75rem", color:C.textMuted }}>
          Duvidas? <a href="https://wa.me/5534997824990" style={{ color:C.sage, textDecoration:"none" }}>WhatsApp (34) 99782-4990</a>
        </div>
      </div>

      {/* FOOTER */}
      <footer style={{ padding:"24px", textAlign:"center" as const, borderTop:`1px solid ${C.border}` }}>
        <div style={{ fontFamily:FD, fontSize:"1rem", fontWeight:800, color:C.rose, marginBottom:6 }}>ZenSalon</div>
        <div style={{ display:"flex", gap:20, justifyContent:"center", flexWrap:"wrap" as const, marginBottom:12 }}>
          {[["#funcoes","Funcionalidades"],["#planos","Planos"],["#faq","Duvidas"],["/buscar","Buscar Saloes"],["https://wa.me/5534997824990","WhatsApp"]].map(([h,l]) => (
            <a key={h} href={h} style={{ color:C.textMuted, textDecoration:"none", fontSize:".75rem" }}>{l}</a>
          ))}
        </div>
        <p style={{ color:C.textMuted, fontSize:".72rem" }}>2026 ZenSalon - websitelog.com.br - Uberaba, MG</p>
      </footer>

    </div>
  );
}
'''

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

import os
print("OK - " + str(os.path.getsize(path)) + " bytes")
