import { useState, useEffect } from "react";

const API_URL = import.meta.env.VITE_API_URL ?? "https://beautytech-v2-production.up.railway.app";

/* ============================================================
   ZenSalon — HomePage (zensalon.com.br)
   Inspirada na estrutura da home do AppBarber:
   hero > sobre > objetivos > funcionalidades > como começar >
   preços > cadastro > FAQ > footer
   ============================================================ */

const COLORS = {
  bg: "#080B12",
  surface: "#0F1320",
  card: "#141826",
  border: "rgba(255,255,255,0.07)",
  rose: "#C9847A",
  roseDim: "rgba(201,132,122,0.15)",
  gold: "#C9A96E",
  sage: "#7EB8A0",
  text: "#EEE9E2",
  muted: "rgba(238,233,226,0.45)",
};

const FONT_BODY = "'Inter', sans-serif";
const FONT_DISPLAY = "'Syne', sans-serif";

type PlanPeriod = "mensal" | "semestral" | "anual";

const PERIOD_LABELS: Record<PlanPeriod, string> = {
  mensal: "Mensal",
  semestral: "Semestral · 10% off",
  anual: "Anual · 20% off",
};

type PlanSettings = {
  plan_basic_monthly: string;
  plan_basic_semiannual: string;
  plan_basic_annual: string;
  plan_basic_max_users: string;
  plan_pro_monthly: string;
  plan_pro_semiannual: string;
  plan_pro_annual: string;
  plan_pro_max_users: string;
  plan_super_monthly: string;
  plan_super_semiannual: string;
  plan_super_annual: string;
  plan_super_max_users: string;
  free_max_clients: string;
  free_max_appointments_month: string;
  trial_days: string;
};

// Valores padrão usados enquanto a API não responde ou em caso de falha
// (espelham o que está hoje em plan_settings; o Super Admin é a fonte real)
const DEFAULT_SETTINGS: PlanSettings = {
  plan_basic_monthly: "29.90", plan_basic_semiannual: "26.90", plan_basic_annual: "23.90", plan_basic_max_users: "1",
  plan_pro_monthly: "49.90", plan_pro_semiannual: "44.90", plan_pro_annual: "39.90", plan_pro_max_users: "3",
  plan_super_monthly: "99.90", plan_super_semiannual: "79.90", plan_super_annual: "69.90", plan_super_max_users: "10",
  free_max_clients: "30", free_max_appointments_month: "50", trial_days: "30",
};

function formatBRL(value: string | undefined): string {
  const n = Number(value);
  if (!value || Number.isNaN(n)) return "--";
  return n.toFixed(2).replace(".", ",");
}

function maxUsersLabel(value: string | undefined): string {
  const n = Number(value);
  if (!value || Number.isNaN(n)) return "";
  return n === 1 ? "1 profissional" : `Até ${n} profissionais`;
}

const OBJECTIVES = [
  {
    title: "Otimize seu Tempo",
    desc: "Organize sua agenda e reduza faltas com lembretes automáticos por WhatsApp.",
  },
  {
    title: "Fidelize seu Cliente",
    desc: "Agendamento online, histórico de atendimentos e mensagens de retorno automáticas.",
  },
  {
    title: "Aumente seu Faturamento",
    desc: "Menos horários vagos, mais recorrência e controle financeiro em tempo real.",
  },
];

const FEATURES = [
  { title: "Agendamento Online 24h", desc: "Clientes marcam horário a qualquer hora, sem precisar ligar." },
  { title: "Lembretes no WhatsApp", desc: "Avisos automáticos antes do horário marcado, reduzindo faltas." },
  { title: "Gestão Financeira", desc: "Controle de entradas, saídas e comissão de cada profissional." },
  { title: "CRM com Funil de Leads", desc: "Acompanhe prospecção e conversão de novos clientes em um Kanban." },
  { title: "Pacotes de Serviços", desc: "Venda combos e pacotes com controle de sessões utilizadas." },
  { title: "Multi-Profissional", desc: "Cada profissional com sua própria agenda dentro do mesmo salão." },
  { title: "Relatórios Gerenciais", desc: "Faturamento, ticket médio e desempenho por período, em tempo real." },
  { title: "Página Pública do Salão", desc: "Site com seus serviços, fotos e link de agendamento para divulgar." },
];

const STEPS = [
  { n: "1", title: "Faça o Cadastro", desc: "Informe os dados básicos do seu salão, barbearia ou clínica." },
  { n: "2", title: "Configure em Minutos", desc: "Cadastre serviços, profissionais e horários de funcionamento." },
  { n: "3", title: "Teste Grátis", desc: "Use todas as funcionalidades sem compromisso, sem cartão de crédito." },
];

const FAQS = [
  { q: "Preciso de CNPJ para usar o ZenSalon?", a: "Não. O ZenSalon pode ser usado tanto por pessoa física quanto jurídica." },
  { q: "O período gratuito tem alguma limitação?", a: "Não. Durante o período de teste você tem acesso completo às funcionalidades do plano Básico, sem precisar cadastrar cartão de crédito." },
  { q: "Meus profissionais têm acesso ao sistema?", a: "Sim. Cada profissional pode ter login próprio para ver sua própria agenda, com permissões definidas por você." },
  { q: "Posso mudar de plano depois?", a: "Sim. Você pode alterar seu plano a qualquer momento direto no painel, sem precisar abrir chamado." },
  { q: "Os clientes pagam para usar o agendamento online?", a: "Não. O link de agendamento é gratuito para os seus clientes, em qualquer dispositivo." },
];

export default function HomePage() {
  const [period, setPeriod] = useState<PlanPeriod>("mensal");
  const [faqOpen, setFaqOpen] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [settings, setSettings] = useState<PlanSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_URL}/api/v1/public/plan-settings`)
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled && json?.success && json.data) {
          setSettings((prev) => ({ ...prev, ...json.data }));
        }
      })
      .catch(() => {
        // mantém os valores padrão em caso de falha de rede
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const trialDays = settings.trial_days || DEFAULT_SETTINGS.trial_days;

  const plans = [
    {
      key: "basico",
      label: "Básico",
      desc: maxUsersLabel(settings.plan_basic_max_users),
      prices: {
        mensal: formatBRL(settings.plan_basic_monthly),
        semestral: formatBRL(settings.plan_basic_semiannual),
        anual: formatBRL(settings.plan_basic_annual),
      },
    },
    {
      key: "pro",
      label: "Pro",
      desc: maxUsersLabel(settings.plan_pro_max_users),
      prices: {
        mensal: formatBRL(settings.plan_pro_monthly),
        semestral: formatBRL(settings.plan_pro_semiannual),
        anual: formatBRL(settings.plan_pro_annual),
      },
    },
    {
      key: "super",
      label: "Super",
      desc: maxUsersLabel(settings.plan_super_max_users),
      prices: {
        mensal: formatBRL(settings.plan_super_monthly),
        semestral: formatBRL(settings.plan_super_semiannual),
        anual: formatBRL(settings.plan_super_annual),
      },
    },
  ];

  const scrollTo = (id: string) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div style={{ background: COLORS.bg, color: COLORS.text, fontFamily: FONT_BODY, minHeight: "100vh" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Syne:wght@600;700;800&display=swap');
        * { box-sizing: border-box; }
        .zs-nav-link { color: ${COLORS.muted}; text-decoration: none; font-size: 14px; font-weight: 500; transition: color .2s; cursor: pointer; }
        .zs-nav-link:hover { color: ${COLORS.text}; }
        .zs-btn-primary { background: ${COLORS.rose}; color: #0A0A0A; border: none; border-radius: 10px; padding: 14px 28px; font-weight: 700; font-size: 15px; cursor: pointer; transition: transform .15s, box-shadow .15s; }
        .zs-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(201,132,122,0.35); }
        .zs-btn-ghost { background: transparent; color: ${COLORS.text}; border: 1px solid ${COLORS.border}; border-radius: 10px; padding: 13px 28px; font-weight: 600; font-size: 15px; cursor: pointer; transition: border-color .2s; }
        .zs-btn-ghost:hover { border-color: ${COLORS.rose}; }
        .zs-card { background: ${COLORS.card}; border: 1px solid ${COLORS.border}; border-radius: 16px; padding: 28px; }
        .zs-grid-features { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
        .zs-grid-objectives { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        .zs-grid-steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
        .zs-grid-pricing { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        .zs-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        @media (max-width: 900px) {
          .zs-grid-features { grid-template-columns: repeat(2, 1fr); }
          .zs-grid-objectives { grid-template-columns: 1fr; }
          .zs-grid-steps { grid-template-columns: 1fr; }
          .zs-grid-pricing { grid-template-columns: 1fr; }
          .zs-form-grid { grid-template-columns: 1fr; }
          .zs-desktop-nav { display: none !important; }
          .zs-mobile-toggle { display: flex !important; }
          .zs-hero-title { font-size: 36px !important; }
        }
        .zs-period-btn { background: transparent; border: 1px solid ${COLORS.border}; color: ${COLORS.muted}; border-radius: 8px; padding: 8px 16px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all .2s; }
        .zs-period-btn.active { background: ${COLORS.roseDim}; border-color: ${COLORS.rose}; color: ${COLORS.rose}; }
        @keyframes zsBadgePulse { 0%, 100% { box-shadow: 0 0 24px rgba(201,132,122,0.25); } 50% { box-shadow: 0 0 36px rgba(201,132,122,0.5); } }
        .zs-hero-badge { animation: zsBadgePulse 3s ease-in-out infinite; }
        input.zs-input { width: 100%; background: ${COLORS.surface}; border: 1px solid ${COLORS.border}; border-radius: 8px; padding: 12px 14px; color: ${COLORS.text}; font-size: 14px; font-family: ${FONT_BODY}; }
        input.zs-input:focus { outline: none; border-color: ${COLORS.rose}; }
        input.zs-input::placeholder { color: ${COLORS.muted}; }
      `}</style>

      {/* ============ HEADER ============ */}
      <header style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(8,11,18,0.85)", backdropFilter: "blur(12px)",
        borderBottom: `1px solid ${COLORS.border}`,
      }}>
        <div style={{
          maxWidth: 1180, margin: "0 auto", padding: "16px 24px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 22, letterSpacing: -0.5 }}>
            Zen<span style={{ color: COLORS.rose }}>Salon</span>
          </div>

          <nav className="zs-desktop-nav" style={{ display: "flex", alignItems: "center", gap: 28 }}>
            <span className="zs-nav-link" onClick={() => scrollTo("sobre")}>Sobre</span>
            <span className="zs-nav-link" onClick={() => scrollTo("funcionalidades")}>Funcionalidades</span>
            <span className="zs-nav-link" onClick={() => scrollTo("precos")}>Preços</span>
            <span className="zs-nav-link" onClick={() => scrollTo("faq")}>Dúvidas</span>
            <a className="zs-nav-link" href="/buscar">Sou Cliente</a>
            <a className="zs-nav-link" href="https://beautytech-v2.vercel.app">Entrar</a>
            <button className="zs-btn-primary" onClick={() => scrollTo("cadastro")}>
              Teste Grátis
            </button>
          </nav>

          <button
            className="zs-mobile-toggle"
            style={{ display: "none", background: "none", border: "none", color: COLORS.text, fontSize: 24, cursor: "pointer" }}
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Abrir menu"
          >
            {menuOpen ? "✕" : "☰"}
          </button>
        </div>

        {menuOpen && (
          <div style={{ padding: "12px 24px 20px", display: "flex", flexDirection: "column", gap: 16, borderTop: `1px solid ${COLORS.border}` }}>
            <span className="zs-nav-link" onClick={() => scrollTo("sobre")}>Sobre</span>
            <span className="zs-nav-link" onClick={() => scrollTo("funcionalidades")}>Funcionalidades</span>
            <span className="zs-nav-link" onClick={() => scrollTo("precos")}>Preços</span>
            <span className="zs-nav-link" onClick={() => scrollTo("faq")}>Dúvidas</span>
            <a className="zs-nav-link" href="/buscar">Sou Cliente</a>
            <a className="zs-nav-link" href="https://beautytech-v2.vercel.app">Entrar</a>
          </div>
        )}
      </header>

      {/* ============ HERO ============ */}
      <section style={{ maxWidth: 1180, margin: "0 auto", padding: "100px 24px 80px", textAlign: "center" }}>
        <div className="zs-hero-badge" style={{
          display: "inline-block", background: COLORS.roseDim, color: COLORS.rose,
          fontSize: 15, fontWeight: 700, letterSpacing: 0.3, padding: "10px 22px", borderRadius: 999,
          marginBottom: 28, border: `1.5px solid ${COLORS.rose}`, boxShadow: "0 0 24px rgba(201,132,122,0.25)",
        }}>
          Sistema de gestão para salões, barbearias e clínicas de estética
        </div>
        <h1 className="zs-hero-title" style={{
          fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 52, lineHeight: 1.1,
          letterSpacing: -1, margin: "0 0 20px",
        }}>
          Uma nova experiência<br />para uma antiga tradição.
        </h1>
        <p style={{ color: COLORS.muted, fontSize: 18, maxWidth: 560, margin: "0 auto 36px", lineHeight: 1.6 }}>
          Agenda, financeiro, clientes e WhatsApp em um só lugar.
          Organize seu salão e nunca mais perca um horário.
        </p>
        <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
          <button className="zs-btn-primary" onClick={() => scrollTo("cadastro")}>
            Iniciar Teste Grátis de {trialDays} Dias
          </button>
          <button className="zs-btn-ghost" onClick={() => scrollTo("precos")}>
            Ver Planos e Preços
          </button>
        </div>
      </section>

      {/* ============ SOBRE ============ */}
      <section id="sobre" style={{ maxWidth: 1180, margin: "0 auto", padding: "40px 24px 80px" }}>
        <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 32, fontWeight: 700, textAlign: "center", marginBottom: 16 }}>
          Sobre o ZenSalon
        </h2>
        <p style={{ color: COLORS.muted, fontSize: 16, maxWidth: 700, margin: "0 auto 48px", textAlign: "center", lineHeight: 1.7 }}>
          O ZenSalon é um sistema de gestão online para salões de beleza, barbearias e clínicas de estética
          que organiza agendamentos, equipe e financeiro em uma única plataforma, acessível de qualquer lugar.
        </p>
        <div className="zs-grid-objectives">
          <div className="zs-card">
            <div style={{ color: COLORS.gold, fontSize: 13, fontWeight: 700, letterSpacing: 1, marginBottom: 10 }}>
              PAINEL DE GESTÃO
            </div>
            <p style={{ color: COLORS.muted, fontSize: 14, lineHeight: 1.7, margin: 0 }}>
              Controle completo do seu negócio: agenda, profissionais, histórico de clientes,
              estoque e relatórios financeiros, com acesso seguro de qualquer dispositivo.
            </p>
          </div>
          <div className="zs-card">
            <div style={{ color: COLORS.sage, fontSize: 13, fontWeight: 700, letterSpacing: 1, marginBottom: 10 }}>
              AGENDAMENTO PÚBLICO
            </div>
            <p style={{ color: COLORS.muted, fontSize: 14, lineHeight: 1.7, margin: 0 }}>
              Seus clientes marcam horário sozinhos pelo link do seu salão,
              recebem confirmação e lembretes automáticos por WhatsApp.
            </p>
          </div>
          <div className="zs-card">
            <div style={{ color: COLORS.rose, fontSize: 13, fontWeight: 700, letterSpacing: 1, marginBottom: 10 }}>
              CRM E PROSPECÇÃO
            </div>
            <p style={{ color: COLORS.muted, fontSize: 14, lineHeight: 1.7, margin: 0 }}>
              Acompanhe leads e oportunidades em um funil visual,
              fortalecendo o relacionamento e a recorrência dos seus clientes.
            </p>
          </div>
        </div>
      </section>

      {/* ============ OBJETIVOS ============ */}
      <section style={{ background: COLORS.surface, padding: "80px 24px" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 32, fontWeight: 700, textAlign: "center", marginBottom: 48 }}>
            Nosso Objetivo
          </h2>
          <div className="zs-grid-objectives">
            {OBJECTIVES.map((o) => (
              <div key={o.title} style={{ textAlign: "center" }}>
                <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 19, fontWeight: 700, marginBottom: 10 }}>
                  {o.title}
                </h3>
                <p style={{ color: COLORS.muted, fontSize: 14, lineHeight: 1.7, margin: 0 }}>
                  {o.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ FUNCIONALIDADES ============ */}
      <section id="funcionalidades" style={{ maxWidth: 1180, margin: "0 auto", padding: "80px 24px" }}>
        <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 32, fontWeight: 700, textAlign: "center", marginBottom: 48 }}>
          Funcionalidades do ZenSalon
        </h2>
        <div className="zs-grid-features">
          {FEATURES.map((f) => (
            <div key={f.title} className="zs-card">
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>{f.title}</h3>
              <p style={{ color: COLORS.muted, fontSize: 13, lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ============ COMO COMEÇAR ============ */}
      <section style={{ background: COLORS.surface, padding: "80px 24px" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 32, fontWeight: 700, textAlign: "center", marginBottom: 48 }}>
            Como Começar
          </h2>
          <div className="zs-grid-steps">
            {STEPS.map((s) => (
              <div key={s.n} style={{ textAlign: "center" }}>
                <div style={{
                  width: 48, height: 48, borderRadius: "50%", background: COLORS.roseDim,
                  color: COLORS.rose, display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 20, margin: "0 auto 16px",
                }}>
                  {s.n}
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{s.title}</h3>
                <p style={{ color: COLORS.muted, fontSize: 14, lineHeight: 1.7, margin: 0 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ PREÇOS ============ */}
      <section id="precos" style={{ maxWidth: 1180, margin: "0 auto", padding: "80px 24px" }}>
        <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 32, fontWeight: 700, textAlign: "center", marginBottom: 16 }}>
          Planos e Preços
        </h2>
        <p style={{ color: COLORS.muted, textAlign: "center", marginBottom: 32 }}>
          {trialDays} dias grátis em qualquer plano, sem cartão de crédito.
        </p>

        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 40 }}>
          {(Object.keys(PERIOD_LABELS) as PlanPeriod[]).map((p) => (
            <button
              key={p}
              className={`zs-period-btn ${period === p ? "active" : ""}`}
              onClick={() => setPeriod(p)}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>

        <div className="zs-grid-pricing">
          {plans.map((plan) => (
            <div
              key={plan.key}
              className="zs-card"
              style={plan.key === "pro" ? { borderColor: COLORS.rose, position: "relative" } : undefined}
            >
              {plan.key === "pro" && (
                <div style={{
                  position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)",
                  background: COLORS.rose, color: "#0A0A0A", fontSize: 11, fontWeight: 700,
                  padding: "4px 12px", borderRadius: 999,
                }}>
                  MAIS ESCOLHIDO
                </div>
              )}
              <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
                {plan.label}
              </h3>
              <p style={{ color: COLORS.muted, fontSize: 13, marginBottom: 20 }}>{plan.desc}</p>
              <div style={{ marginBottom: 24 }}>
                <span style={{ fontSize: 13, color: COLORS.muted }}>R$ </span>
                <span style={{ fontFamily: FONT_DISPLAY, fontSize: 36, fontWeight: 800 }}>
                  {plan.prices[period]}
                </span>
                <span style={{ fontSize: 13, color: COLORS.muted }}>/mês</span>
              </div>
              <button
                className={plan.key === "pro" ? "zs-btn-primary" : "zs-btn-ghost"}
                style={{ width: "100%" }}
                onClick={() => scrollTo("cadastro")}
              >
                Começar agora
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ============ CADASTRO ============ */}
      <section id="cadastro" style={{ background: COLORS.surface, padding: "80px 24px" }}>
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 28, fontWeight: 700, textAlign: "center", marginBottom: 12 }}>
            Comece seu teste grátis
          </h2>
          <p style={{ color: COLORS.muted, textAlign: "center", marginBottom: 32 }}>
            {trialDays} dias com todas as funcionalidades liberadas, sem compromisso.
          </p>

          <form
            className="zs-card"
            style={{ display: "flex", flexDirection: "column", gap: 14 }}
            onSubmit={(e) => {
              e.preventDefault();
              // TODO(Nogueira): conectar este submit ao endpoint real de cadastro
              // de tenant já existente no backend (mesmo fluxo usado no
              // formulário de registro atual). Confirme a rota antes de publicar.
              window.location.href = "/cadastro";
            }}
          >
            <input className="zs-input" placeholder="Nome do salão / barbearia / clínica" required />
            <div className="zs-form-grid">
              <input className="zs-input" placeholder="Seu nome" required />
              <input className="zs-input" placeholder="WhatsApp" required />
            </div>
            <input className="zs-input" type="email" placeholder="E-mail para acesso" required />
            <input className="zs-input" type="password" placeholder="Senha (mínimo 6 caracteres)" minLength={6} required />
            <button type="submit" className="zs-btn-primary" style={{ marginTop: 8 }}>
              Criar Conta Grátis
            </button>
            <p style={{ fontSize: 12, color: COLORS.muted, textAlign: "center", margin: 0 }}>
              Já tem conta?{" "}
              <a href="https://beautytech-v2.vercel.app" style={{ color: COLORS.rose }}>Entrar</a>
            </p>
          </form>
        </div>
      </section>

      {/* ============ FAQ ============ */}
      <section id="faq" style={{ maxWidth: 760, margin: "0 auto", padding: "80px 24px" }}>
        <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 32, fontWeight: 700, textAlign: "center", marginBottom: 40 }}>
          Perguntas Frequentes
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {FAQS.map((f, i) => {
            const isTrialFaq = f.q === "O período gratuito tem alguma limitação?";
            const answer = isTrialFaq
              ? `Não. Durante os ${trialDays} dias de teste você tem acesso completo às funcionalidades do plano Básico, sem precisar cadastrar cartão de crédito.`
              : f.a;
            return (
              <div key={f.q} className="zs-card" style={{ padding: "18px 24px", cursor: "pointer" }} onClick={() => setFaqOpen(faqOpen === i ? null : i)}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 600, fontSize: 15 }}>{f.q}</span>
                  <span style={{ color: COLORS.rose, fontSize: 18 }}>{faqOpen === i ? "−" : "+"}</span>
                </div>
                {faqOpen === i && (
                  <p style={{ color: COLORS.muted, fontSize: 14, lineHeight: 1.7, marginTop: 12, marginBottom: 0 }}>
                    {answer}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer style={{ borderTop: `1px solid ${COLORS.border}`, padding: "48px 24px 32px" }}>
        <div style={{
          maxWidth: 1180, margin: "0 auto", display: "flex", justifyContent: "space-between",
          flexWrap: "wrap", gap: 32,
        }}>
          <div>
            <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 18, marginBottom: 10 }}>
              Zen<span style={{ color: COLORS.rose }}>Salon</span>
            </div>
            <p style={{ color: COLORS.muted, fontSize: 13, maxWidth: 280, lineHeight: 1.6 }}>
              Sistema de gestão e agendamento online para salões de beleza,
              barbearias e clínicas de estética.
            </p>
          </div>
          <div style={{ display: "flex", gap: 48, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: COLORS.gold }}>Produto</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <span className="zs-nav-link" onClick={() => scrollTo("funcionalidades")}>Funcionalidades</span>
                <span className="zs-nav-link" onClick={() => scrollTo("precos")}>Preços</span>
                <a className="zs-nav-link" href="/buscar">Buscar Salões</a>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: COLORS.gold }}>Contato</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <a className="zs-nav-link" href="https://wa.me/5534997824990">WhatsApp</a>
                <a className="zs-nav-link" href="mailto:contato@zensalon.com.br">contato@zensalon.com.br</a>
              </div>
            </div>
          </div>
        </div>
        <div style={{
          maxWidth: 1180, margin: "32px auto 0", paddingTop: 24, borderTop: `1px solid ${COLORS.border}`,
          color: COLORS.muted, fontSize: 12, textAlign: "center",
        }}>
          © {new Date().getFullYear()} ZenSalon. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
}
