# -*- coding: utf-8 -*-
path = r"C:\projetos\beautytech-v2\frontend\src\LandingPageSobre.tsx"

content = '''import { useState } from "react";

export default function LandingPageSobre() {
  const [period, setPeriod] = useState("mensal");

  const prices: any = {
    basico:  { mensal: "39,90", semestral: "35,90", anual: "31,90" },
    pro:     { mensal: "59,90", semestral: "53,90", anual: "47,90" },
    super:   { mensal: "99,90", semestral: "89,90", anual: "79,90" },
  };

  const C = {
    bg: "#080B12", surface: "#0F1320", card: "#141826",
    border: "rgba(255,255,255,0.07)", rose: "#C9847A",
    roseDim: "rgba(201,132,122,0.15)", gold: "#C9A96E",
    sage: "#7EB8A0", text: "#EEE9E2", muted: "rgba(238,233,226,0.45)",
  };
  const FB = "'Inter', sans-serif";
  const FD = "'Syne', sans-serif";

  const [faqOpen, setFaqOpen] = useState<number | null>(null);

  const faqs = [
    { q: "Preciso de CNPJ para usar o ZenSalon?", a: "N\u00e3o. Qualquer profissional aut\u00f4nomo ou dono de estabelecimento pode se cadastrar, seja pessoa f\u00edsica ou jur\u00eddica." },
    { q: "O per\u00edodo gr\u00e1tis tem limita\u00e7\u00f5es?", a: "Durante os 14 dias de teste voc\u00ea tem acesso completo ao plano B\u00e1sico sem nenhuma limita\u00e7\u00e3o. N\u00e3o pedimos cart\u00e3o de cr\u00e9dito para come\u00e7ar." },
    { q: "Meus clientes precisam criar conta para agendar?", a: "N\u00e3o. Seus clientes acessam seu link p\u00fablico e agendam diretamente, sem precisar criar conta ou baixar aplicativo." },
    { q: "Como funciona o WhatsApp autom\u00e1tico?", a: "O sistema envia mensagens de confirma\u00e7\u00e3o, lembrete e p\u00f3s-atendimento automaticamente via WhatsApp, usando o n\u00famero do seu pr\u00f3prio sal\u00e3o." },
    { q: "Posso cancelar a qualquer momento?", a: "Sim. N\u00e3o h\u00e1 fidelidade. Voc\u00ea pode cancelar quando quiser, direto pelo painel, sem burocracia." },
  ];

  const features = [
    { icon: "\\uD83D\\uDCC5", title: "Agendamento Online", desc: "Seus clientes agendam 24h por dia pelo link do seu sal\u00e3o, sem precisar ligar." },
    { icon: "\\uD83D\\uDCAC", title: "WhatsApp Autom\u00e1tico", desc: "Confirma\u00e7\u00f5es, lembretes e mensagens de retorno enviados automaticamente." },
    { icon: "\\uD83D\\uDCB0", title: "Controle Financeiro", desc: "Receitas, despesas, comiss\u00f5es e relat\u00f3rios gerenciais completos." },
    { icon: "\\uD83D\\uDC65", title: "Gest\u00e3o de Profissionais", desc: "Cadastre sua equipe, defina hor\u00e1rios, comiss\u00f5es e servi\u00e7os individualmente." },
    { icon: "\\uD83C\\uDFC6", title: "Programa de Fidelidade", desc: "Fidelize seus clientes com pontos, cashback e recompensas autom\u00e1ticas." },
    { icon: "\\uD83D\\uDCCA", title: "CRM de Clientes", desc: "Hist\u00f3rico completo, prefer\u00eancias, anivers\u00e1rios e campanhas segmentadas." },
    { icon: "\\uD83C\\uDF81", title: "Pacotes de Servi\u00e7os", desc: "Venda pacotes antecipados com desconto e controle o uso de cada sess\u00e3o." },
    { icon: "\\uD83C\\uDF10", title: "P\u00e1gina P\u00fablica do Sal\u00e3o", desc: "Seu sal\u00e3o ganha uma p\u00e1gina profissional com fotos, servi\u00e7os e bot\u00e3o de agendar." },
    { icon: "\\uD83D\\uDCF1", title: "Funciona no Celular", desc: "Instale na tela inicial como um app. Sem precisar da App Store." },
  ];

  const btn = (label: string, href: string, solid = false) => (
    <a href={href} style={{
      padding: "14px 32px", borderRadius: 50, fontFamily: FB,
      fontSize: ".95rem", fontWeight: 700, textDecoration: "none",
      display: "inline-block", transition: "all .2s",
      background: solid ? C.rose : "transparent",
      border: solid ? "none" : `1px solid ${C.border}`,
      color: solid ? "#fff" : C.text,
    }}>{label}</a>
  );

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: FB }}>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />

      {/* NAV */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 48px", background: "rgba(8,11,18,0.9)", backdropFilter: "blur(16px)", borderBottom: `1px solid ${C.border}` }}>
        <a href="/" style={{ fontFamily: FD, fontSize: "1.3rem", fontWeight: 800, color: C.rose, textDecoration: "none" }}>ZenSalon</a>
        <div style={{ display: "flex", gap: 28 }}>
          {[["#funcoes","Funcionalidades"],["#como","Como funciona"],["#planos","Planos"],["#faq","D\u00favidas"]].map(([href, label]) => (
            <a key={href} href={href} style={{ color: C.muted, textDecoration: "none", fontSize: ".875rem", fontWeight: 500 }}>{label}</a>
          ))}
        </div>
        <a href="/register" style={{ padding: "10px 24px", background: C.rose, color: "#fff", borderRadius: 50, fontSize: ".875rem", fontWeight: 700, textDecoration: "none" }}>Testar Gr\u00e1tis</a>
      </nav>

      {/* HERO */}
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "120px 24px 80px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(201,132,122,0.12) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 16px", border: `1px solid rgba(201,132,122,0.3)`, borderRadius: 50, fontSize: ".75rem", fontWeight: 600, color: C.rose, letterSpacing: ".08em", textTransform: "uppercase" as const, marginBottom: 28 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.rose, display: "inline-block", animation: "pulse 2s infinite" }} />
          Sistema de Gest\u00e3o Online
        </div>
        <h1 style={{ fontFamily: FD, fontSize: "clamp(2.6rem, 7vw, 5rem)", fontWeight: 800, lineHeight: 1.05, letterSpacing: "-0.03em", maxWidth: 820, marginBottom: 24 }}>
          Seu sal\u00e3o cheio,<br />sua agenda <span style={{ color: C.rose }}>no controle.</span>
        </h1>
        <p style={{ fontSize: "1.1rem", color: C.muted, maxWidth: 500, marginBottom: 40 }}>
          Agendamento online, financeiro, WhatsApp autom\u00e1tico e muito mais \u2014 tudo em uma plataforma feita para o seu neg\u00f3cio.
        </p>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "center", marginBottom: 40 }}>
          {btn("Criar conta gr\u00e1tis", "/register", true)}
          {btn("Ver sal\u00f5es", "/buscar")}
        </div>
        <div style={{ display: "flex", gap: 28, flexWrap: "wrap", justifyContent: "center", fontSize: ".8rem", color: C.muted }}>
          {["\u2713 14 dias gr\u00e1tis, sem cart\u00e3o", "\u2713 Configura\u00e7\u00e3o em minutos", "\u2713 Suporte via WhatsApp"].map(t => <span key={t}>{t}</span>)}
        </div>
      </div>

      {/* NICHOS */}
      <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", padding: "0 24px 60px" }}>
        {["\u2702\uFE0F Sal\u00e3o de Beleza", "\uD83D\uDC88 Barbearia", "\uD83C\uDF3F Cl\u00ednica Est\u00e9tica", "\uD83D\uDC85 Espa\u00e7o de Manicure", "\uD83E\uDD77 Studio de Sobrancelhas"].map(n => (
          <div key={n} style={{ padding: "10px 22px", border: `1px solid ${C.border}`, borderRadius: 50, fontSize: ".85rem", color: C.muted, background: C.surface }}>{n}</div>
        ))}
      </div>

      {/* FEATURES */}
      <div id="funcoes" style={{ padding: "100px 24px", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ fontSize: ".72rem", fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase" as const, color: C.rose, marginBottom: 12 }}>Funcionalidades</div>
        <h2 style={{ fontFamily: FD, fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.02em", marginBottom: 48 }}>Tudo que voc\u00ea precisa para crescer</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 }}>
          {features.map((f, i) => (
            <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: 28 }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: C.roseDim, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem", marginBottom: 16 }}>{f.icon}</div>
              <h3 style={{ fontFamily: FD, fontSize: "1.05rem", fontWeight: 700, marginBottom: 8 }}>{f.title}</h3>
              <p style={{ fontSize: ".875rem", color: C.muted, lineHeight: 1.65 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* COMO FUNCIONA */}
      <div id="como" style={{ background: C.surface, padding: "100px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ fontSize: ".72rem", fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase" as const, color: C.rose, marginBottom: 12 }}>Como funciona</div>
          <h2 style={{ fontFamily: FD, fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 800, marginBottom: 48 }}>Comece em minutos</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 32 }}>
            {[
              ["1", "Crie sua conta", "Cadastre seu estabelecimento com nome, endere\u00e7o e tipo de neg\u00f3cio. Leva menos de 2 minutos."],
              ["2", "Configure servi\u00e7os", "Adicione profissionais, servi\u00e7os, hor\u00e1rios e pre\u00e7os. Temos modelos prontos para facilitar."],
              ["3", "Compartilhe seu link", "Envie seu link de agendamento pelo WhatsApp, Instagram e Google."],
              ["4", "Gerencie tudo", "Acompanhe agenda, financeiro, clientes e mensagens em um painel simples."],
            ].map(([num, title, desc]) => (
              <div key={num} style={{ textAlign: "center" }}>
                <div style={{ width: 56, height: 56, borderRadius: "50%", border: `2px solid ${C.rose}`, color: C.rose, fontFamily: FD, fontSize: "1.3rem", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>{num}</div>
                <h3 style={{ fontFamily: FD, fontWeight: 700, marginBottom: 8 }}>{title}</h3>
                <p style={{ fontSize: ".875rem", color: C.muted }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* PLANOS */}
      <div id="planos" style={{ padding: "100px 24px", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ fontSize: ".72rem", fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase" as const, color: C.rose, marginBottom: 12 }}>Planos</div>
        <h2 style={{ fontFamily: FD, fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 800, marginBottom: 12 }}>Simples e transparente</h2>
        <p style={{ color: C.muted, marginBottom: 36 }}>14 dias gr\u00e1tis em qualquer plano. Sem cart\u00e3o de cr\u00e9dito para come\u00e7ar.</p>

        {/* Toggle */}
        <div style={{ display: "flex", gap: 10, marginBottom: 48, flexWrap: "wrap" as const }}>
          {[["mensal","Mensal",""],["semestral","Semestral","-10%"],["anual","Anual","-20%"]].map(([id, label, tag]) => (
            <button key={id} onClick={() => setPeriod(id)} style={{ padding: "10px 22px", border: `1px solid ${period === id ? C.rose : C.border}`, borderRadius: 50, background: period === id ? C.rose : "transparent", color: period === id ? "#fff" : C.muted, fontFamily: FB, fontSize: ".875rem", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
              {label} {tag && <span style={{ padding: "2px 8px", borderRadius: 50, fontSize: ".7rem", fontWeight: 700, background: id === "anual" ? C.rose : C.sage, color: "#fff" }}>{tag}</span>}
            </button>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 20 }}>
          {/* FREE */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 24, padding: 32 }}>
            <div style={{ fontSize: ".75rem", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase" as const, color: C.muted, marginBottom: 4 }}>FREE</div>
            <div style={{ fontSize: ".875rem", color: C.muted, marginBottom: 20 }}>Gr\u00e1tis para sempre</div>
            <div style={{ fontFamily: FD, fontSize: "2.5rem", fontWeight: 800, marginBottom: 4 }}>Gr\u00e1tis</div>
            <div style={{ fontSize: ".8rem", color: C.muted, marginBottom: 24 }}>At\u00e9 1 profissional</div>
            <ul style={{ listStyle: "none", marginBottom: 28 }}>
              {["1 profissional","At\u00e9 30 clientes","At\u00e9 50 agendamentos/m\u00eas","Agendamento b\u00e1sico","Gest\u00e3o de servi\u00e7os"].map(i => (
                <li key={i} style={{ fontSize: ".875rem", padding: "8px 0", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ color: C.sage, fontWeight: 700 }}>\u2713</span>{i}
                </li>
              ))}
              {["CRM avan\u00e7ado","WhatsApp autom\u00e1tico","Comiss\u00f5es","Fidelidade"].map(i => (
                <li key={i} style={{ fontSize: ".875rem", padding: "8px 0", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 10, color: C.muted }}>
                  <span style={{ color: C.border, fontWeight: 700 }}>\u00d7</span>{i}
                </li>
              ))}
            </ul>
            <a href="/register" style={{ display: "block", textAlign: "center", padding: "14px 0", border: `1px solid ${C.border}`, borderRadius: 50, color: C.text, textDecoration: "none", fontWeight: 700, fontSize: ".9rem" }}>Come\u00e7ar gr\u00e1tis</a>
          </div>

          {/* BASICO */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 24, padding: 32 }}>
            <div style={{ fontSize: ".75rem", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase" as const, color: C.rose, marginBottom: 4 }}>B\u00c1SICO</div>
            <div style={{ fontSize: ".875rem", color: C.muted, marginBottom: 20 }}>Para aut\u00f4nomos</div>
            <div style={{ fontFamily: FD, fontSize: "2.5rem", fontWeight: 800, marginBottom: 4 }}>R${prices.basico[period]}<span style={{ fontSize: "1rem", fontWeight: 400, color: C.muted }}>/m\u00eas</span></div>
            <div style={{ fontSize: ".8rem", color: C.muted, marginBottom: 24 }}>At\u00e9 1 profissional</div>
            <div style={{ background: "rgba(201,132,122,0.1)", border: "1px solid rgba(201,132,122,0.25)", borderRadius: 12, padding: 14, marginBottom: 20 }}>
              <div style={{ color: C.rose, fontSize: ".8rem", fontWeight: 700, marginBottom: 4 }}>\u2726 Acesso completo a tudo</div>
              <div style={{ fontSize: ".78rem", color: C.muted }}>Todas as funcionalidades desbloqueadas. Limite apenas de profissionais.</div>
            </div>
            <a href="/register" style={{ display: "block", textAlign: "center", padding: "14px 0", border: `1px solid ${C.border}`, borderRadius: 50, color: C.text, textDecoration: "none", fontWeight: 700, fontSize: ".9rem" }}>Testar 14 dias gr\u00e1tis</a>
          </div>

          {/* PRO */}
          <div style={{ background: "linear-gradient(135deg, rgba(201,132,122,0.08) 0%, #141826 100%)", border: `1px solid ${C.rose}`, borderRadius: 24, padding: 32, position: "relative" }}>
            <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: C.rose, color: "#fff", fontSize: ".72rem", fontWeight: 700, padding: "4px 16px", borderRadius: 50, whiteSpace: "nowrap" as const }}>Mais popular</div>
            <div style={{ fontSize: ".75rem", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase" as const, color: C.sage, marginBottom: 4 }}>PRO</div>
            <div style={{ fontSize: ".875rem", color: C.muted, marginBottom: 20 }}>Para sal\u00f5es em crescimento</div>
            <div style={{ fontFamily: FD, fontSize: "2.5rem", fontWeight: 800, marginBottom: 4 }}>R${prices.pro[period]}<span style={{ fontSize: "1rem", fontWeight: 400, color: C.muted }}>/m\u00eas</span></div>
            <div style={{ fontSize: ".8rem", color: C.muted, marginBottom: 24 }}>At\u00e9 3 profissionais</div>
            <div style={{ background: "rgba(126,184,160,0.1)", border: "1px solid rgba(126,184,160,0.25)", borderRadius: 12, padding: 14, marginBottom: 20 }}>
              <div style={{ color: C.sage, fontSize: ".8rem", fontWeight: 700, marginBottom: 4 }}>\u2726 Acesso completo a tudo</div>
              <div style={{ fontSize: ".78rem", color: C.muted }}>Todas as funcionalidades desbloqueadas. Limite apenas de profissionais.</div>
            </div>
            <a href="/register" style={{ display: "block", textAlign: "center", padding: "14px 0", background: C.rose, borderRadius: 50, color: "#fff", textDecoration: "none", fontWeight: 700, fontSize: ".9rem", border: "none" }}>Testar 14 dias gr\u00e1tis</a>
          </div>

          {/* SUPER */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 24, padding: 32 }}>
            <div style={{ fontSize: ".75rem", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase" as const, color: C.gold, marginBottom: 4 }}>SUPER</div>
            <div style={{ fontSize: ".875rem", color: C.muted, marginBottom: 20 }}>Para grandes opera\u00e7\u00f5es</div>
            <div style={{ fontFamily: FD, fontSize: "2.5rem", fontWeight: 800, marginBottom: 4 }}>R${prices.super[period]}<span style={{ fontSize: "1rem", fontWeight: 400, color: C.muted }}>/m\u00eas</span></div>
            <div style={{ fontSize: ".8rem", color: C.muted, marginBottom: 24 }}>At\u00e9 10 profissionais</div>
            <div style={{ background: "rgba(201,169,110,0.1)", border: "1px solid rgba(201,169,110,0.25)", borderRadius: 12, padding: 14, marginBottom: 20 }}>
              <div style={{ color: C.gold, fontSize: ".8rem", fontWeight: 700, marginBottom: 4 }}>\u2726 Acesso completo a tudo</div>
              <div style={{ fontSize: ".78rem", color: C.muted }}>Todas as funcionalidades desbloqueadas. Limite apenas de profissionais.</div>
            </div>
            <a href="/register" style={{ display: "block", textAlign: "center", padding: "14px 0", border: `1px solid ${C.border}`, borderRadius: 50, color: C.text, textDecoration: "none", fontWeight: 700, fontSize: ".9rem" }}>Testar 14 dias gr\u00e1tis</a>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div id="faq" style={{ background: C.surface, padding: "100px 24px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <div style={{ fontSize: ".72rem", fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase" as const, color: C.rose, marginBottom: 12 }}>D\u00favidas frequentes</div>
          <h2 style={{ fontFamily: FD, fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 800, marginBottom: 40 }}>Perguntas comuns</h2>
          {faqs.map((faq, i) => (
            <div key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
              <button onClick={() => setFaqOpen(faqOpen === i ? null : i)} style={{ width: "100%", textAlign: "left", padding: "20px 0", background: "none", border: "none", color: C.text, fontFamily: FB, fontSize: ".95rem", fontWeight: 600, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
                {faq.q}
                <span style={{ color: C.rose, fontSize: "1.2rem", transform: faqOpen === i ? "rotate(45deg)" : "none", transition: "transform .25s", flexShrink: 0 }}>+</span>
              </button>
              {faqOpen === i && <div style={{ paddingBottom: 20, color: C.muted, fontSize: ".875rem", lineHeight: 1.75 }}>{faq.a}</div>}
            </div>
          ))}
        </div>
      </div>

      {/* CTA FINAL */}
      <div style={{ background: "linear-gradient(135deg, rgba(201,132,122,0.1) 0%, rgba(126,184,160,0.05) 100%)", borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, padding: "100px 24px", textAlign: "center" }}>
        <div style={{ fontSize: ".72rem", fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase" as const, color: C.rose, marginBottom: 12 }}>Comece agora</div>
        <h2 style={{ fontFamily: FD, fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 800, maxWidth: 600, margin: "0 auto 16px" }}>Seu sal\u00e3o merece um sistema \u00e0 altura</h2>
        <p style={{ color: C.muted, marginBottom: 36 }}>14 dias gr\u00e1tis. Configure em minutos. Sem cart\u00e3o de cr\u00e9dito.</p>
        <a href="/register" style={{ padding: "16px 36px", background: C.rose, color: "#fff", borderRadius: 50, fontSize: "1rem", fontWeight: 700, textDecoration: "none" }}>Criar minha conta gr\u00e1tis</a>
        <div style={{ marginTop: 20, fontSize: ".8rem", color: C.muted }}>
          D\u00favidas? <a href="https://wa.me/5534997824990" style={{ color: C.sage, textDecoration: "none" }}>WhatsApp (34) 99782-4990</a>
        </div>
      </div>

      {/* FOOTER */}
      <footer style={{ padding: "40px 24px", textAlign: "center", borderTop: `1px solid ${C.border}` }}>
        <div style={{ fontFamily: FD, fontSize: "1.1rem", fontWeight: 800, color: C.rose, marginBottom: 8 }}>ZenSalon</div>
        <div style={{ display: "flex", gap: 24, justifyContent: "center", flexWrap: "wrap", marginBottom: 20 }}>
          {[["#funcoes","Funcionalidades"],["#planos","Planos"],["#faq","D\u00favidas"],["/buscar","Buscar Sal\u00f5es"],["mailto:websitelogx@gmail.com","Contato"],["https://wa.me/5534997824990","WhatsApp"]].map(([href, label]) => (
            <a key={href} href={href} style={{ color: C.muted, textDecoration: "none", fontSize: ".8rem" }}>{label}</a>
          ))}
        </div>
        <p style={{ color: C.muted, fontSize: ".78rem" }}>
          \u00a9 2026 ZenSalon \u00b7 <a href="https://www.websitelog.com.br" style={{ color: C.muted, textDecoration: "none" }}>websitelog.com.br</a> \u00b7 Uberaba, MG
        </p>
      </footer>
    </div>
  );
}
'''

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("OK")
