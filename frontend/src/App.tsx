import DiscoveryPage from './DiscoveryPage';
import { WhatsAppPage as WhatsAppPageComponent } from "./WhatsAppPage";
import BookingPage from './BookingPage';
import PaymentSuccessPage from './PaymentSuccessPage';
// ============================================================
// BEAUTYTECH v2 - Frontend Completo
// Design: luxury refinado - rose gold + noir + cream
// Tipografia: Playfair Display + Outfit
// 10 modulos: Dashboard, Clientes, Agenda, Profissionais,
//             Servicos, Pacotes, Financeiro, Comissoes, CRM, Fidelidade
// ============================================================

import { useState, useEffect } from "react";
import { supabase, api, dashboardApi, clientsApi, professionalsApi, servicesApi, financialApi, commissionsApi, crmApi, packagesApi, appointmentsApi } from "./api/client";

// --- DESIGN TOKENS -------------------------------------------
// --- TEMAS ---------------------------------------------------
const THEMES: Record<string, any> = {
  noir:      { name:"Noir",      icon:"N", bg:"#0C0A09", card:"#141210", surface:"#1A1714", border:"#2A2420", borderHi:"#3D3028", rose:"#E8A598", roseDeep:"#C4766A", roseDim:"#E8A59820", gold:"#D4AF7A", goldDeep:"#B8924A", goldDim:"#D4AF7A18", cream:"#F5EDD8", sage:"#8FAF8A", sapphire:"#6B8CAE", ruby:"#C4606A", text:"#F0E8DC", textSec:"#C4A882", textMuted:"#6B5A48", overlay:"rgba(12,10,9,0.85)", fd:"'Playfair Display', serif", fb:"'Outfit', sans-serif" },
  sakura:    { name:"Sakura",    icon:"S", bg:"#FDF6F8", card:"#FFFFFF", surface:"#FFF0F3", border:"#F5D5DC", borderHi:"#EBB8C3", rose:"#D4637A", roseDeep:"#B84860", roseDim:"#D4637A18", gold:"#C4956A", goldDeep:"#A87850", goldDim:"#C4956A18", cream:"#4A3040", sage:"#5A8F6A", sapphire:"#5878A8", ruby:"#C43050", text:"#2A1820", textSec:"#6A3848", textMuted:"#B898A8", overlay:"rgba(253,246,248,0.92)", fd:"'Playfair Display', serif", fb:"'Outfit', sans-serif" },
  dourado:   { name:"Dourado",   icon:"D", bg:"#FAFAF7", card:"#FFFFFF", surface:"#F7F5F0", border:"#E8E0D0", borderHi:"#D4C8A8", rose:"#B8924A", roseDeep:"#9A7830", roseDim:"#B8924A18", gold:"#C8A050", goldDeep:"#A88030", goldDim:"#C8A05018", cream:"#3A3020", sage:"#607850", sapphire:"#506880", ruby:"#A84040", text:"#2A2010", textSec:"#6A5830", textMuted:"#B0A080", overlay:"rgba(250,250,247,0.92)", fd:"'Cormorant Garamond', serif", fb:"'Outfit', sans-serif" },
  esmeralda: { name:"Esmeralda", icon:"E", bg:"#0A120E", card:"#111A14", surface:"#182218", border:"#243028", borderHi:"#304038", rose:"#7AC8A0", roseDeep:"#58A880", roseDim:"#7AC8A020", gold:"#D4AF7A", goldDeep:"#B8924A", goldDim:"#D4AF7A18", cream:"#E8F5EE", sage:"#A8D8B8", sapphire:"#6898B8", ruby:"#C87868", text:"#E0F0E8", textSec:"#A0C8B0", textMuted:"#506858", overlay:"rgba(10,18,14,0.88)", fd:"'Playfair Display', serif", fb:"'Outfit', sans-serif" },
  violeta:   { name:"Violeta",   icon:"V", bg:"#0E0A14", card:"#150F1E", surface:"#1C1428", border:"#2A2038", borderHi:"#382C4C", rose:"#C898E8", roseDeep:"#A870D0", roseDim:"#C898E820", gold:"#E8C878", goldDeep:"#D0A848", goldDim:"#E8C87818", cream:"#F0E8FF", sage:"#90B890", sapphire:"#7898D8", ruby:"#D86878", text:"#F0E8FF", textSec:"#C0A8E0", textMuted:"#705888", overlay:"rgba(14,10,20,0.88)", fd:"'Playfair Display', serif", fb:"'Outfit', sans-serif" },
  auto:      { name:"Auto",      icon:"A" },
};
const getSystemTheme = () => window.matchMedia("(prefers-color-scheme: dark)").matches ? "noir" : "sakura";
const getSavedTheme = () => { const t = localStorage.getItem("beautytech_theme") ?? "noir"; return t === "auto" ? "auto" : (THEMES[t] ? t : "noir"); };
const resolveTheme = (id: string) => id === "auto" ? THEMES[getSystemTheme()] : (THEMES[id] ?? THEMES.noir);
let _themeId = getSavedTheme();
let C: any = resolveTheme(_themeId);
let FD: string = C.fd;
let FB: string = C.fb;
type ThemeListener = () => void;
const themeListeners: ThemeListener[] = [];
const setGlobalTheme = (id: string) => { _themeId = id; localStorage.setItem("beautytech_theme", id); C = resolveTheme(id); FD = C.fd; FB = C.fb; themeListeners.forEach(fn => fn()); };
const useTheme = () => { const [, upd] = useState(0); useEffect(() => { const fn = () => upd(n => n+1); themeListeners.push(fn); const mq = window.matchMedia("(prefers-color-scheme: dark)"); const mqFn = () => { if (_themeId === "auto") { C = resolveTheme("auto"); FD = C.fd; FB = C.fb; upd(n => n+1); } }; mq.addEventListener("change", mqFn); return () => { themeListeners.splice(themeListeners.indexOf(fn), 1); mq.removeEventListener("change", mqFn); }; }, []); return _themeId; };

// --- MOCK DATA (fallback) -------------------------------------
const NOW = new Date();
const MOCK_KPIS = { appointmentsToday: 0, appointmentsMonth: 0, activeClients: 0, revenueMonth: 0, revenuePrevMonth: 0, averageTicket: 0, revenueGrowth: 0 };

// --- HELPERS -------------------------------------------------
const brl = (v: any) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString("pt-BR") : "-";
const fmtTime = (d: any) => d ? new Date(d).toLocaleTimeString("pt-BR", { hour:"2-digit", minute:"2-digit" }) : "-";
const fmtPct = (v: any) => `${Number(v || 0).toFixed(1)}%`;

const STATUS_APPT: any = {
  pending:     { label:"Pendente",       color: C.gold },
  confirmed:   { label:"Confirmado",     color: C.sapphire },
  in_progress: { label:"Atendendo",      color: C.rose },
  completed:   { label:"Concluido",      color: C.sage },
  cancelled:   { label:"Cancelado",      color: C.ruby },
  no_show:     { label:"Nao compareceu", color: C.textMuted },
};

const SEGMENT: any = {
  new:        { label:"Novo",      color: C.sapphire },
  active:     { label:"Ativo",     color: C.sage },
  vip:        { label:"VIP",       color: C.gold },
  loyal:      { label:"Fiel",      color: C.rose },
  at_risk:    { label:"Em risco",  color: C.ruby },
  churned:    { label:"Inativo",   color: C.textMuted },
  reactivated:{ label:"Reativado", color: C.sage },
};

const LOYALTY: any = {
  bronze:   { label:"Bronze",   color:"#CD7F32" },
  silver:   { label:"Prata",    color:"#9CA3AF" },
  gold:     { label:"Ouro",     color: C.gold },
  platinum: { label:"Platina",  color: C.sapphire },
  diamond:  { label:"Diamante", color: C.rose },
};

const PKG_STATUS: any = {
  active:    { label:"Ativo",     color: C.sage },
  completed: { label:"Concluido", color: C.textMuted },
  paused:    { label:"Pausado",   color: C.gold },
  expired:   { label:"Expirado",  color: C.ruby },
  cancelled: { label:"Cancelado", color: C.ruby },
};

const SOURCE_LABEL: any = { instagram:"Instagram", whatsapp:"WhatsApp", facebook:"Facebook", google:"Google", indicacao:"Indicacao" };
const PAYMENT_LABEL: any = { cash:"Dinheiro", credit_card:"Cartao Credito", debit_card:"Cartao Debito", pix:"Pix", bank_transfer:"Transferencia", voucher:"Voucher", gift_card:"Vale-Presente" };

// --- COMPONENTS ----------------------------------------------

function Badge({ label, color, small }: any) {
  return (
    <span style={{ fontSize: small ? 10 : 11, padding: small ? "1px 7px" : "2px 10px", borderRadius: 20, fontWeight: 700, background:`${color}18`, color, border:`1px solid ${color}28`, fontFamily: FB, whiteSpace:"nowrap" }}>
      {label}
    </span>
  );
}

function KpiCard({ icon, label, value, sub, color = C.rose, trend }: any) {
  return (
    <div style={{ background: C.card, border:`1px solid ${C.border}`, borderRadius: 20, padding:"22px 24px", position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", top:-24, right:-16, fontSize:90, opacity:0.04 }}>{icon}</div>
      <div style={{ fontSize:26, marginBottom:6 }}>{icon}</div>
      <div style={{ fontSize:12, color: C.textMuted, marginBottom:4, fontFamily: FB, letterSpacing:"0.06em", textTransform:"uppercase" }}>{label}</div>
      <div style={{ fontSize:28, fontWeight:700, color, fontFamily: FD, letterSpacing:"-0.02em" }}>{value}</div>
      {(sub || trend !== undefined) && (
        <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:6 }}>
          {sub && <span style={{ fontSize:12, color: C.textMuted, fontFamily: FB }}>{sub}</span>}
          {trend !== undefined && (
            <span style={{ fontSize:11, fontWeight:700, color: trend >= 0 ? C.sage : C.ruby, background: trend >= 0 ? `${C.sage}15` : `${C.ruby}15`, padding:"1px 8px", borderRadius:20 }}>
              {trend >= 0 ? "?" : "?"} {Math.abs(trend).toFixed(1)}%
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function Modal({ open, onClose, title, children, width = 540 }: any) {
  if (!open) return null;
  return (
    <div style={{ position:"fixed", inset:0, background: C.overlay, display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:20 }} onClick={onClose}>
      <div style={{ background: C.card, border:`1px solid ${C.borderHi}`, borderRadius:24, width:"100%", maxWidth:width, maxHeight:"90vh", overflowY:"auto" }} onClick={e => e.stopPropagation()}>
        <div style={{ padding:"20px 28px", borderBottom:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ fontSize:18, fontWeight:700, color: C.text, fontFamily: FD }}>{title}</div>
          <button onClick={onClose} style={{ background:"none", border:"none", color: C.textMuted, cursor:"pointer", fontSize:24, lineHeight:1, padding:"0 4px" }}>?</button>
        </div>
        <div style={{ padding:28 }}>{children}</div>
      </div>
    </div>
  );
}

function Inp({ label, value, onChange, type="text", placeholder, required, grid }: any) {
  const s: any = { width:"100%", padding:"10px 14px", background: C.surface, border:`1px solid ${C.border}`, borderRadius:10, color: C.text, fontSize:13, outline:"none", boxSizing:"border-box", fontFamily: FB };
  return (
    <div style={{ marginBottom:14, gridColumn: grid }}>
      {label && <label style={{ fontSize:11, fontWeight:700, color: C.textSec, display:"block", marginBottom:6, letterSpacing:"0.05em", textTransform:"uppercase" }}>{label}{required&&" *"}</label>}
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} required={required} style={s} />
    </div>
  );
}

function Sel({ label, value, onChange, options, grid }: any) {
  const s: any = { width:"100%", padding:"10px 14px", background: C.surface, border:`1px solid ${C.border}`, borderRadius:10, color: C.text, fontSize:13, outline:"none", boxSizing:"border-box", fontFamily: FB };
  return (
    <div style={{ marginBottom:14, gridColumn: grid }}>
      {label && <label style={{ fontSize:11, fontWeight:700, color: C.textSec, display:"block", marginBottom:6, letterSpacing:"0.05em", textTransform:"uppercase" }}>{label}</label>}
      <select value={value} onChange={e => onChange(e.target.value)} style={s}>
        {options.map((o: any) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function Btn({ children, onClick, variant="primary", disabled, small, full }: any) {
  const base: any = { border:"none", cursor: disabled ? "not-allowed" : "pointer", fontWeight:700, fontFamily: FB, borderRadius:10, transition:"all .15s", opacity: disabled ? 0.5 : 1, whiteSpace:"nowrap", width: full ? "100%" : "auto" };
  const v: any = {
    primary:   { ...base, background:`linear-gradient(135deg, ${C.rose}, ${C.roseDeep})`, color:"#fff", padding: small ? "7px 14px" : "10px 22px", fontSize: small ? 12 : 13 },
    gold:      { ...base, background:`linear-gradient(135deg, ${C.gold}, ${C.goldDeep})`, color:"#111", padding: small ? "7px 14px" : "10px 22px", fontSize: small ? 12 : 13 },
    secondary: { ...base, background: C.surface, border:`1px solid ${C.border}`, color: C.textSec, padding: small ? "7px 14px" : "10px 22px", fontSize: small ? 12 : 13 },
    danger:    { ...base, background:`${C.ruby}18`, border:`1px solid ${C.ruby}30`, color: C.ruby, padding: small ? "7px 14px" : "10px 22px", fontSize: small ? 12 : 13 },
    ghost:     { ...base, background:"none", border:"none", color: C.rose, padding: small ? "7px 14px" : "10px 22px", fontSize: small ? 12 : 13 },
  };
  return <button onClick={onClick} disabled={disabled} style={v[variant]}>{children}</button>;
}

function Table({ cols, rows, onRow, emptyMsg = "Nenhum registro" }: any) {
  return (
    <div style={{ background: C.card, border:`1px solid ${C.border}`, borderRadius:16, overflow:"hidden" }}>
      <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
        <thead>
          <tr style={{ background: C.surface }}>
            {cols.map((c: any) => <th key={c.key} style={{ padding:"10px 16px", textAlign:"left", color: C.textMuted, fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.07em", fontFamily: FB }}>{c.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0
            ? <tr><td colSpan={cols.length} style={{ padding:40, textAlign:"center", color: C.textMuted, fontFamily: FB }}>{emptyMsg}</td></tr>
            : rows.map((r: any, i: number) => (
              <tr key={r.id ?? i} onClick={() => onRow?.(r)}
                style={{ borderBottom:`1px solid ${C.border}`, cursor: onRow ? "pointer" : "default" }}
                onMouseEnter={e => onRow && ((e.currentTarget as HTMLElement).style.background = C.surface)}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "transparent")}>
                {cols.map((c: any) => <td key={c.key} style={{ padding:"12px 16px", color: C.text, fontFamily: FB, verticalAlign:"middle" }}>{c.render ? c.render(r) : r[c.key]}</td>)}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

function Search({ value, onChange, placeholder }: any) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8, background: C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:"8px 14px", minWidth:260 }}>
      <span style={{ color: C.textMuted, fontSize:14 }}>?</span>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder ?? "Buscar..."}
        style={{ background:"none", border:"none", outline:"none", color: C.text, fontSize:13, width:"100%", fontFamily: FB }} />
    </div>
  );
}

function PageHeader({ title, sub, action }: any) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:28 }}>
      <div>
        <h1 style={{ fontSize:26, fontWeight:700, color: C.text, margin:0, fontFamily: FD, letterSpacing:"-0.02em" }}>{title}</h1>
        {sub && <p style={{ fontSize:13, color: C.textMuted, margin:"4px 0 0", fontFamily: FB }}>{sub}</p>}
      </div>
      {action}
    </div>
  );
}

function ProgressBar({ value, max, color = C.rose }: any) {
  const pct = Math.min((value / (max || 1)) * 100, 100);
  return (
    <div style={{ height:6, background: C.border, borderRadius:3, overflow:"hidden" }}>
      <div style={{ height:"100%", width:`${pct}%`, background:`linear-gradient(90deg, ${color}, ${color}CC)`, borderRadius:3, transition:"width .3s" }} />
    </div>
  );
}

// --- PAGES ---------------------------------------------------

function RegisterPage({ onBack }: any) {
  const [salonName, setSalonName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [businessType, setBusinessType] = useState("beauty_salon");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const submit = async () => {
    setLoading(true); setError(""); setSuccess("");
    try {
      const res = await fetch(`${import.meta.env["VITE_API_URL"]}/api/v1/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ salonName, ownerName, email, password, whatsapp, businessType, cpfCnpj: cpfCnpj.replace(/\D/g,"") || undefined }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setSuccess("Salao cadastrado com sucesso! Faca login para continuar.");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight:"100vh", background: C.bg, display:"flex", alignItems:"center", justifyContent:"center", fontFamily: FB, padding:20 }}>
      <div style={{ width:"100%", maxWidth:420 }}>
        <div style={{ textAlign:"center", marginBottom:48 }}>
          <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:16 }}>
            {[{v:"beauty_salon",l:"Salao de Beleza",i:"??"},{v:"aesthetics_clinic",l:"Clinica de Estetica",i:"??"},{v:"barbershop",l:"Barbearia",i:"??"}].map(opt => (
              <label key={opt.v} onClick={() => setBusinessType(opt.v)} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 16px", borderRadius:10, border:`1px solid ${businessType === opt.v ? "#c9a96e" : "#2a2a2a"}`, background: businessType === opt.v ? "#c9a96e15" : "transparent", cursor:"pointer", transition:"all 0.2s" }}>
                <span style={{ fontSize:20 }}>{opt.i}</span>
                <span style={{ flex:1, fontSize:14, color: businessType === opt.v ? "#c9a96e" : "#a0998f", fontWeight: businessType === opt.v ? 600 : 400 }}>{opt.l}</span>
                <span style={{ width:18, height:18, borderRadius:"50%", border:`2px solid ${businessType === opt.v ? "#c9a96e" : "#444"}`, background: businessType === opt.v ? "#c9a96e" : "transparent", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>{businessType === opt.v ? <span style={{ width:8, height:8, borderRadius:"50%", background:"#0a0a0a", display:"block" }}></span> : null}</span>
              </label>
            ))}
          </div>
          <div style={{ fontSize:14, letterSpacing:"0.3em", color: C.rose, textTransform:"uppercase", marginBottom:12 }}>{businessType === "aesthetics_clinic" ? "Nova Clinica" : businessType === "barbershop" ? "Nova Barbearia" : "Novo Salao"}</div>
          <div style={{ fontSize:44, fontWeight:700, color: C.text, fontFamily: FD, letterSpacing:"-0.03em", lineHeight:1 }}>BeautyTech</div>
          <div style={{ fontSize:13, color: C.textMuted, marginTop:8 }}>Salao de Beleza, Clinica de Estetica ou Barbearia</div>
        </div>
        <div style={{ background: C.card, border:`1px solid ${C.borderHi}`, borderRadius:24, padding:36 }}>
          {success ? (
            <div>
              <div style={{ background:`${C.sage}15`, border:`1px solid ${C.sage}30`, borderRadius:10, padding:"14px", color: C.sage, fontSize:13, marginBottom:20, textAlign:"center" }}>? {success}</div>
              <button onClick={onBack} style={{ width:"100%", padding:"13px 0", background:`linear-gradient(135deg, ${C.rose}, ${C.roseDeep})`, border:"none", borderRadius:12, color:"#fff", fontWeight:700, fontSize:14, cursor:"pointer", fontFamily: FB }}>Ir para o Login</button>
            </div>
          ) : (
            <>
              <Inp label="Nome do Salao" value={salonName} onChange={setSalonName} placeholder="Salao Bella Arte" required />
              <Inp label="Seu Nome" value={ownerName} onChange={setOwnerName} placeholder="Maria da Silva" required />
              <Inp label="E-mail" value={email} onChange={setEmail} type="email" placeholder="maria@salao.com.br" required />
              <Inp label="Senha" value={password} onChange={setPassword} type="password" autoComplete="new-password" placeholder="minimo 6 caracteres" required />
              <Inp label="WhatsApp" value={whatsapp} onChange={setWhatsapp} type="tel" placeholder="(34) 99999-9999" required />
              <Inp label="CPF ou CNPJ" value={cpfCnpj} onChange={setCpfCnpj} placeholder="000.000.000-00 ou 00.000.000/0001-00" />
              {error && <div style={{ background:`${C.ruby}15`, border:`1px solid ${C.ruby}30`, borderRadius:10, padding:"10px 14px", color: C.ruby, fontSize:12, marginBottom:16 }}>{error}</div>}
              <button onClick={submit} disabled={loading} style={{ width:"100%", padding:"13px 0", background:`linear-gradient(135deg, ${C.rose}, ${C.roseDeep})`, border:"none", borderRadius:12, color:"#fff", fontWeight:700, fontSize:14, cursor:"pointer", fontFamily: FB, marginBottom:16 }}>
                {loading ? "Cadastrando..." : "Criar Conta Gratis"}
              </button>
              <div style={{ textAlign:"center" }}>
                <button onClick={onBack} style={{ background:"none", border:"none", color: C.textMuted, fontSize:12, cursor:"pointer", fontFamily: FB }}>Ja tenho conta ? Fazer login</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function LoginPage({ onLogin }: any) {
  const [email, setEmail] = useState("admin@beautytech.com.br");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showRegister, setShowRegister] = useState(() => new URLSearchParams(window.location.search).get('tela') === 'cadastro');
  if (showRegister) return <RegisterPage onBack={() => setShowRegister(false)} />;

  const submit = async () => {
    setLoading(true); setError("");
    const { data, error: e } = await supabase.auth.signInWithPassword({ email, password });
    if (e) setError(e.message);
    else onLogin(data);
    setLoading(false);
  };

  return (
    <div style={{ minHeight:"100vh", background: C.bg, display:"flex", alignItems:"center", justifyContent:"center", fontFamily: FB, padding:20 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Outfit:wght@300;400;500;600;700&display=swap');`}</style>
      <div style={{ width:"100%", maxWidth:420 }}>
        <div style={{ textAlign:"center", marginBottom:48 }}>
          <div style={{ fontSize:14, letterSpacing:"0.3em", color: C.rose, textTransform:"uppercase", marginBottom:12, fontFamily: FB }}>Sistema de Gestao</div>
          <div style={{ fontSize:44, fontWeight:700, color: C.text, fontFamily: FD, letterSpacing:"-0.03em", lineHeight:1 }}>BeautyTech</div>
          <div style={{ fontSize:13, color: C.textMuted, marginTop:8 }}>Salao de Beleza, Clinica de Estetica ou Barbearia</div>
        </div>
        <div style={{ background: C.card, border:`1px solid ${C.borderHi}`, borderRadius:24, padding:36 }}>
          <Inp label="E-mail" value={email} onChange={setEmail} type="email" placeholder="seu@email.com" autoComplete="off" />
          <Inp label="Senha" value={password} onChange={setPassword} type="password" placeholder="????????" />
          {error && <div style={{ background:`${C.ruby}15`, border:`1px solid ${C.ruby}30`, borderRadius:10, padding:"10px 14px", color: C.ruby, fontSize:12, marginBottom:16 }}>{error}</div>}
          <button onClick={submit} disabled={loading} style={{ width:"100%", padding:"13px 0", background:`linear-gradient(135deg, ${C.rose}, ${C.roseDeep})`, border:"none", borderRadius:12, color:"#fff", fontWeight:700, fontSize:14, cursor:"pointer", fontFamily: FB, letterSpacing:"0.02em" }}>
            {loading ? "Entrando..." : "Entrar"}
          </button>
          <div style={{ textAlign:"center", marginTop:16 }}>
            <button onClick={() => setShowRegister(true)} style={{ background:"none", border:"1.5px solid #c9a96e", color: C.rose, fontSize:13, cursor:"pointer", fontFamily: FB, fontWeight:700, padding:"10px 20px", borderRadius:10, marginTop:4, width:"100%", background:"linear-gradient(135deg, #c9a96e22, #c9847a22)" }}>
              ✨ Nao tem conta? Cadastre seu salao gratis
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- DASHBOARD -----------------------------------------------
function DashboardPage() {
  const [kpis, setKpis] = useState<any>(null);
  const [agenda, setAgenda] = useState<any[]>([]);
  const [birthdays, setBirthdays] = useState<any[]>([]);
  const [atRisk, setAtRisk] = useState<any[]>([]);
  const [performance, setPerformance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [k, a, b, r, p] = await Promise.all([
          dashboardApi.kpis(),
          dashboardApi.agenda(),
          dashboardApi.birthdays(),
          dashboardApi.churnRisk(),
          dashboardApi.performance(),
        ]);
        setKpis(k.data);
        setAgenda(a.data ?? []);
        setBirthdays(b.data ?? []);
        setAtRisk(r.data ?? []);
        setPerformance(p.data ?? []);
      } catch(e) {
        console.error("Dashboard error:", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:400 }}>
      <div style={{ color: C.textMuted, fontFamily: FB }}>Carregando...</div>
    </div>
  );

  const k = kpis ?? MOCK_KPIS;

  return (
    <div>
      <PageHeader title="Dashboard" sub={`${NOW.toLocaleDateString("pt-BR", { weekday:"long", day:"numeric", month:"long", year:"numeric" })}`} action={
        <div style={{ display:"flex", gap:8 }}>
          <Btn small variant="gold" onClick={async () => {
            if (!confirm("Inserir dados de demonstracao?")) return;
            try { await api.post<any>("/demo/seed", {}); alert("Dados inseridos! Recarregue a pagina."); }
            catch(e: any) { alert("Erro: " + e.message); }
          }}>+ Demo</Btn>
          <Btn small variant="danger" onClick={async () => {
            if (!confirm("Remover dados de demonstracao?")) return;
            try { await api.delete("/demo/clear"); alert("Dados removidos! Recarregue a pagina."); }
            catch(e: any) { alert("Erro: " + e.message); }
          }}>Limpar Demo</Btn>
        </div>
      } />
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(210px, 1fr))", gap:16, marginBottom:28 }}>
        <KpiCard icon="Cal" label="Agendamentos Hoje"  value={k.appointmentsToday} sub={`${k.appointmentsMonth} no mes`} color={C.rose} />
        <KpiCard icon="Cli" label="Clientes Ativos"    value={k.activeClients}     sub="clientes"           color={C.gold} />
        <KpiCard icon="R$" label="Receita do Mes"     value={brl(k.revenueMonth)} sub={brl(k.revenuePrevMonth)+" mes ant."} color={C.sage} trend={k.revenueGrowth} />
        <KpiCard icon="Tkt" label="Ticket Medio"       value={brl(k.averageTicket)} sub="por atendimento"   color={C.sapphire} />
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1.4fr 1fr", gap:20, marginBottom:20 }}>
        <div style={{ background: C.card, border:`1px solid ${C.border}`, borderRadius:20, padding:24 }}>
          <div style={{ fontSize:15, fontWeight:700, color: C.text, marginBottom:18, fontFamily: FD }}>Agenda de Hoje</div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {agenda.length === 0 && <div style={{ color: C.textMuted, fontFamily: FB, fontSize:13 }}>Nenhum agendamento hoje.</div>}
            {agenda.map((item: any, i: number) => {
              const st = STATUS_APPT[item.appointment?.status] ?? STATUS_APPT.pending;
              return (
                <div key={i} style={{ background: C.surface, borderRadius:12, padding:"12px 16px", display:"flex", justifyContent:"space-between", alignItems:"center", border:`1px solid ${C.border}` }}>
                  <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                    <div style={{ width:3, height:36, borderRadius:2, background: item.professional?.color ?? C.rose, flexShrink:0 }} />
                    <div>
                      <div style={{ fontWeight:600, color: C.text, fontSize:13, fontFamily: FB, display:"flex", alignItems:"center", gap:6 }}>
                        {item.client?.fullName}
                        {item.client?.isVip && <Badge label="VIP" color={C.gold} small />}
                      </div>
                      <div style={{ fontSize:11, color: C.textMuted }}>{fmtTime(item.appointment?.scheduledAt)} ? {item.professional?.fullName}</div>
                    </div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <Badge label={st.label} color={st.color} />
                    <div style={{ fontSize:11, color: C.textMuted, marginTop:4 }}>{brl(item.appointment?.totalPrice)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div style={{ background: C.card, border:`1px solid ${C.border}`, borderRadius:20, padding:24 }}>
          <div style={{ fontSize:15, fontWeight:700, color: C.text, marginBottom:18, fontFamily: FD }}>Performance do Mes</div>
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            {performance.length === 0 && <div style={{ color: C.textMuted, fontFamily: FB, fontSize:13 }}>Nenhum dado disponivel.</div>}
            {performance.map((p: any, i: number) => {
              const goal = Number(p.professional?.monthlyGoal ?? 1);
              const rev = Number(p.revenueMonth ?? 0);
              const pct = Math.min((rev / goal) * 100, 100);
              return (
                <div key={i}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <div style={{ width:8, height:8, borderRadius:"50%", background: p.professional?.color ?? C.rose }} />
                      <span style={{ fontSize:13, color: C.text, fontFamily: FB }}>{p.professional?.fullName}</span>
                    </div>
                    <div style={{ fontSize:12, color: C.textMuted, fontFamily: FB }}>{brl(rev)} <span style={{ color: pct >= 100 ? C.sage : C.gold }}>({fmtPct(pct)})</span></div>
                  </div>
                  <ProgressBar value={rev} max={goal} color={p.professional?.color ?? C.rose} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
        <div style={{ background: C.card, border:`1px solid ${C.border}`, borderRadius:20, padding:24 }}>
          <div style={{ fontSize:15, fontWeight:700, color: C.text, marginBottom:16, fontFamily: FD }}>? Aniversariantes do Mes</div>
          {birthdays.length === 0 && <div style={{ color: C.textMuted, fontFamily: FB, fontSize:13 }}>Nenhum aniversariante este mes.</div>}
          {birthdays.slice(0,4).map((c: any, i: number) => (
            <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:`1px solid ${C.border}` }}>
              <div style={{ fontSize:13, color: C.text, fontFamily: FB }}>{c.fullName}</div>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ fontSize:11, color: C.textMuted }}>{c.birthDate ? new Date(c.birthDate).toLocaleDateString("pt-BR", { day:"2-digit", month:"short" }) : ""}</span>
                <a href={`https://wa.me/55${c.whatsapp?.replace(/\D/g,"")}`} target="_blank" style={{ fontSize:11, color: C.rose, textDecoration:"none", fontWeight:600 }}>WhatsApp</a>
              </div>
            </div>
          ))}
        </div>
        <div style={{ background: C.card, border:`1px solid ${C.border}`, borderRadius:20, padding:24 }}>
          <div style={{ fontSize:15, fontWeight:700, color: C.text, marginBottom:16, fontFamily: FD }}>?? Clientes em Risco</div>
          {atRisk.length === 0 && <div style={{ color: C.textMuted, fontFamily: FB, fontSize:13 }}>Nenhum cliente em risco.</div>}
          {atRisk.map((c: any, i: number) => (
            <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:`1px solid ${C.border}` }}>
              <div>
                <div style={{ fontSize:13, color: C.text, fontFamily: FB }}>{c.fullName}</div>
                <div style={{ fontSize:11, color: C.textMuted }}>Ultima visita: {fmtDate(c.lastVisitAt)}</div>
              </div>
              <a href={`https://wa.me/55${c.whatsapp?.replace(/\D/g,"")}`} target="_blank" style={{ fontSize:11, color: C.rose, textDecoration:"none", fontWeight:700, padding:"4px 10px", border:`1px solid ${C.rose}40`, borderRadius:8 }}>Reativar</a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// --- CLIENTES ------------------------------------------------
function ClientsPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [anamneseClient, setAnamneseClient] = useState<any>(null);
  const [lgpdClient, setLgpdClient] = useState<any>(null);
  const [lgpdData, setLgpdData] = useState<any>(null);
  const [lgpdSigning, setLgpdSigning] = useState(false);
  const loadLgpd = async (clientId: string) => {
    try {
      const r: any = await api.get("/consent-forms/" + clientId);
      const arr = Array.isArray(r?.data) ? r.data : (Array.isArray(r) ? r : []);
      const rec = arr[0] ?? null;
      setLgpdData(rec);
    } catch(e) { setLgpdData(null); }
  };
  useEffect(() => { if (lgpdClient) loadLgpd(lgpdClient.id); }, [lgpdClient]);
  const signLgpd = async () => {
    setLgpdSigning(true);
    try {
      if (!lgpdData) {
        const rPost: any = await api.post("/consent-forms", { clientId: lgpdClient.id, type: "lgpd", content: "Autorizo o uso dos meus dados pessoais conforme a LGPD (Lei 13.709/2018)." });
        const newId = rPost?.data?.id ?? rPost?.id;
        if (newId) await api.post("/consent-forms/" + newId + "/sign", { signedByName: lgpdClient.fullName });
      } else if (!lgpdData.is_signed) {
        await api.post("/consent-forms/" + lgpdData.id + "/sign", { signedByName: lgpdClient.fullName });
      }
      await loadLgpd(lgpdClient.id);
      setLgpdSigning(false);
    } catch(e: any) { alert("Erro: " + e.message + " | " + JSON.stringify(e.response?.data)); setLgpdSigning(false); }
  };
  const [anamneseData, setAnamneseData] = useState<any>(null);
  const [anamneseForm, setAnamneseForm] = useState({ medications:"", medicalHistory:"", previousProcedures:"", skinType:"normal", contraindications:"", notes:"" });
  const [savingAnamnese, setSavingAnamnese] = useState(false);
  const loadAnamnese = async (clientId: string) => {
    try {
      const r: any = await api.get("/client-records/" + clientId);
      const rec = (r.data ?? [])[0];
      setAnamneseData(rec ?? null);
      if (rec) setAnamneseForm({ medications: rec.medications??"", medicalHistory: rec.medical_history??"", previousProcedures: rec.previous_procedures??"", skinType: rec.skin_type??"normal", contraindications: rec.contraindications??"", notes: rec.notes??"" });
    } catch(e) { setAnamneseData(null); }
  };
  useEffect(() => { if (anamneseClient) loadAnamnese(anamneseClient.id); }, [anamneseClient]);
  const saveAnamnese = async () => {
    setSavingAnamnese(true);
    try {
      if (anamneseData) { await api.patch("/client-records/" + anamneseData.id, anamneseForm); }
      else { await api.post("/client-records", { clientId: anamneseClient.id, ...anamneseForm }); }
      setAnamneseClient(null);
    } catch(e: any) { alert("Erro: " + e.message); }
    finally { setSavingAnamnese(false); }
  };
  const [data, setData] = useState<any[]>([]);
  //const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ fullName:"", whatsapp:"", email:"", gender:"female", birthDate:"" });
  const f = (k: string) => (v: string) => setForm(p => ({ ...p, [k]:v }));
  const exportXLSX = () => {
    const XLSX = (window as any).XLSX;
    if (!XLSX) { alert("Aguarde carregar..."); return; }
    const rows = filtered.map((c: any) => ({
      "Nome": c.fullName,
      "Genero": c.gender === "female" ? "Feminino" : c.gender === "male" ? "Masculino" : "Outro",
      "Nascimento": c.birthDate ? new Date(c.birthDate).toLocaleDateString("pt-BR") : "-",
      "Segmento": c.segment ?? "-",
      "Visitas": c.totalVisits ?? 0,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Clientes");
    XLSX.writeFile(wb, `clientes_${new Date().toISOString().split("T")[0]}.xlsx`);
  };
  const exportPDF = () => {
    const { jsPDF } = (window as any).jspdf;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Relatorio de Clientes - BeautyTech", 14, 20);
    doc.setFontSize(11);
    doc.text(`Gerado em: ${new Date().toLocaleDateString("pt-BR")}`, 14, 28);
    doc.text(`Total de clientes: ${filtered.length}`, 14, 36);
    const rows = filtered.map((c: any) => [
      c.fullName,
      c.whatsapp ?? "-",
      c.email ?? "-",
      c.gender === "female" ? "Feminino" : c.gender === "male" ? "Masculino" : "Outro",
      c.birthDate ? new Date(c.birthDate).toLocaleDateString("pt-BR") : "-",
      c.segment ?? "-",
      c.totalVisits ?? 0,
    ]);
    (doc as any).autoTable({
      head: [["Nome", "WhatsApp", "Email", "Genero", "Nascimento", "Segmento", "Visitas"]],
      body: rows,
      startY: 44,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [180, 90, 80] },
    });
    doc.save(`clientes_${new Date().toISOString().split("T")[0]}.pdf`);
  };
  useEffect(() => {
    clientsApi.list({ limit: 200 })
      .then((r: any) => setData(r.data ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const openNew = () => {
    setSelected(null);
    setForm({ fullName:"", whatsapp:"", email:"", gender:"female", birthDate:"" });
    setShowForm(true);
  };

  const openEdit = (c: any) => {
    setSelected(c);
    setForm({ fullName:c.fullName ?? "", whatsapp:c.whatsapp ?? "", email:c.email ?? "", gender:c.gender ?? "female", birthDate:c.birthDate ?? "" });
    setShowForm(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload: any = { ...form };
      if (payload.birthDate) {
        const d = new Date(payload.birthDate);
        if (isNaN(d.getTime()) || d.getFullYear() > new Date().getFullYear() || d.getFullYear() < 1900) {
          alert("Data de nascimento invalida. Use o formato DD/MM/AAAA.");
          setSaving(false);
          return;
        }
        payload.birthDate = d.toISOString().split("T")[0];
      } else {
        delete payload.birthDate;
      }
      if (selected) {
        const r: any = await clientsApi.update(selected.id, payload);
        setData(d => d.map(c => c.id === selected.id ? r.data : c));
      } else {
        const r: any = await clientsApi.create(payload);
        setData(d => [...d, r.data]);
      }
      setShowForm(false);
      setSelected(null);
    } catch(e: any) {
      alert("Erro ao salvar: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const filtered = data.filter((c: any) => {
    const matchSearch = !search || c.fullName?.toLowerCase().includes(search.toLowerCase()) || c.whatsapp?.includes(search);
    const matchSeg = filter === "all" || c.segment === filter;
    return matchSearch && matchSeg;
  });

  const segs = [
    { v:"all", l:"Todos" },{ v:"vip", l:"VIP" },{ v:"active", l:"Ativos" },
    { v:"loyal", l:"Fieis" },{ v:"at_risk", l:"Em Risco" },{ v:"new", l:"Novos" },
  ];

  const cols = [
    { key:"fullName", label:"Cliente", render: (c: any) => (
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <div style={{ width:32, height:32, borderRadius:"50%", background:`linear-gradient(135deg, ${C.rose}40, ${C.gold}40)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, flexShrink:0 }}>
          {(c.fullName ?? "?")[0].toUpperCase()}
        </div>
        <div>
          <div style={{ fontWeight:600, color: C.text, display:"flex", alignItems:"center", gap:6 }}>
            {c.fullName} {c.isVip && <Badge label="VIP" color={C.gold} small />}
          </div>
          <div style={{ fontSize:11, color: C.textMuted }}>{c.whatsapp}</div>
        </div>
      </div>
    )},
    { key:"segment", label:"Segmento", render: (c: any) => { const s = SEGMENT[c.segment]; return <Badge label={s?.label ?? c.segment} color={s?.color ?? C.textMuted} />; } },
    { key:"loyaltyTier", label:"Fidelidade", render: (c: any) => { const l = LOYALTY[c.loyaltyTier]; return <Badge label={l?.label ?? c.loyaltyTier ?? "-"} color={l?.color ?? C.textMuted} />; } },
    { key:"totalVisits", label:"Visitas", render: (c: any) => <span style={{ color: C.textSec }}>{c.totalVisits ?? 0}</span> },
    { key:"totalSpent", label:"LTV", render: (c: any) => <span style={{ fontWeight:700, color: C.gold }}>{brl(c.totalSpent)}</span> },
    { key:"averageTicket", label:"Ticket", render: (c: any) => <span style={{ color: C.textMuted }}>{brl(c.averageTicket)}</span> },
    { key:"lastVisitAt", label:"Ultima Visita", render: (c: any) => <span style={{ color: C.textMuted, fontSize:12 }}>{fmtDate(c.lastVisitAt)}</span> },
    { key:"action", label:"", render: (c: any) => (
      <div style={{ display:"flex", gap:6 }}>
        <Btn small variant="secondary" onClick={(e: any) => { e.stopPropagation(); openEdit(c); }}>Editar</Btn>
        <Btn small variant="secondary" onClick={(e: any) => { e.stopPropagation(); setAnamneseClient(c); }}>Anamnese</Btn>
        <Btn small variant="secondary" onClick={(e: any) => { e.stopPropagation(); setLgpdClient(c); }}>LGPD</Btn>
      </div>
    )},
  ];

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:400 }}>
      <div style={{ color: C.textMuted, fontFamily: FB }}>Carregando clientes...</div>
    </div>
  );

  return (
    <div>
     <PageHeader title="Clientes" sub={`${filtered.length} clientes`} action={
        <div style={{ display:"flex", gap:8 }}>
          <Btn small variant="secondary" onClick={exportXLSX}>XLSX</Btn>
          <Btn small variant="secondary" onClick={exportPDF}>PDF</Btn>
          <Btn onClick={openNew}>+ Nova Cliente</Btn>
        </div>
      } />
      <div style={{ display:"flex", gap:12, marginBottom:20, flexWrap:"wrap", alignItems:"center" }}>
        <Search value={search} onChange={setSearch} placeholder="Buscar por nome ou WhatsApp..." />
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          {segs.map(s => (
            <button key={s.v} onClick={() => setFilter(s.v)} style={{ padding:"7px 14px", borderRadius:8, border:`1px solid ${filter===s.v ? C.rose : C.border}`, background: filter===s.v ? `${C.rose}15` : C.card, color: filter===s.v ? C.rose : C.textMuted, fontSize:12, cursor:"pointer", fontFamily: FB, fontWeight:600 }}>{s.l}</button>
          ))}
        </div>
      </div>
      <Table cols={cols} rows={filtered} onRow={openEdit} />
      <Modal open={!!lgpdClient} onClose={() => setLgpdClient(null)} title={"Consentimento LGPD - " + (lgpdClient?.fullName ?? "")}>
        {lgpdData?.is_signed ? (
          <div style={{ background:"#e8f5e9", border:"1px solid #a5d6a7", borderRadius:10, padding:16, marginBottom:16, color:"#2e7d32", fontSize:13 }}>
            Termo assinado em {lgpdData.signed_at ? new Date(lgpdData.signed_at).toLocaleDateString("pt-BR") : "-"}
          </div>
        ) : (
          <div style={{ background:"#fff3e0", border:"1px solid #ffcc80", borderRadius:10, padding:16, marginBottom:16, color:"#e65100", fontSize:13 }}>
            Termo ainda nao assinado
          </div>
        )}
        <div style={{ background:"#f5f5f5", borderRadius:10, padding:16, marginBottom:16, fontSize:13, color:"#333", lineHeight:1.6 }}>
          Autorizo o uso dos meus dados pessoais conforme a LGPD (Lei 13.709/2018) para fins de prestacao de servicos neste estabelecimento. Os dados nao serao compartilhados com terceiros.
        </div>
        <div style={{ display:"flex", gap:10, marginTop:8 }}>
          <Btn variant="secondary" onClick={() => setLgpdClient(null)}>Fechar</Btn>
          {!lgpdData?.is_signed && <Btn onClick={signLgpd} disabled={lgpdSigning}>{lgpdSigning ? "Registrando..." : "Registrar Assinatura"}</Btn>}
        </div>
      </Modal>
      <Modal open={!!anamneseClient} onClose={() => setAnamneseClient(null)} title={"Anamnese - " + (anamneseClient?.fullName ?? "")}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr", gap:8 }}>
          <Inp label="Medicamentos em uso" value={anamneseForm.medications} onChange={(v:string) => setAnamneseForm(p=>({...p,medications:v}))} placeholder="Ex: Anticoagulante" />
          <Inp label="Tipo de pele" value={anamneseForm.skinType} onChange={(v:string) => setAnamneseForm(p=>({...p,skinType:v}))} placeholder="normal, oleosa, seca..." />
          <Inp label="Historico medico" value={anamneseForm.medicalHistory} onChange={(v:string) => setAnamneseForm(p=>({...p,medicalHistory:v}))} placeholder="Doencas, cirurgias..." />
          <Inp label="Procedimentos anteriores" value={anamneseForm.previousProcedures} onChange={(v:string) => setAnamneseForm(p=>({...p,previousProcedures:v}))} placeholder="Ex: Peeling quimico" />
          <Inp label="Contraindicacoes" value={anamneseForm.contraindications} onChange={(v:string) => setAnamneseForm(p=>({...p,contraindications:v}))} placeholder="Ex: Gestante" />
          <Inp label="Observacoes" value={anamneseForm.notes} onChange={(v:string) => setAnamneseForm(p=>({...p,notes:v}))} placeholder="Notas adicionais..." />
        </div>
        <div style={{ display:"flex", gap:10, marginTop:8 }}>
          <Btn variant="secondary" onClick={() => setAnamneseClient(null)}>Cancelar</Btn>
          <Btn onClick={saveAnamnese} disabled={savingAnamnese}>{savingAnamnese ? "Salvando..." : "Salvar Anamnese"}</Btn>
        </div>
      </Modal>
      <Modal open={showForm} onClose={() => setShowForm(false)} title={selected ? "Editar Cliente" : "Nova Cliente"}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:4 }}>
          <Inp label="Nome completo" value={form.fullName} onChange={f("fullName")} required placeholder="Ana Beatriz" grid="1/-1" />
          <Inp label="WhatsApp" value={form.whatsapp} onChange={f("whatsapp")} placeholder="(34) 99999-0000" />
          <Inp label="E-mail" value={form.email} onChange={f("email")} type="email" placeholder="ana@email.com" />
          <Inp label="Data de nascimento" value={form.birthDate} onChange={f("birthDate")} type="date" />
          <Sel label="Genero" value={form.gender} onChange={f("gender")} options={[{ value:"female", label:"Feminino" },{ value:"male", label:"Masculino" },{ value:"other", label:"Outro" }]} />
        </div>
        <div style={{ display:"flex", gap:10, marginTop:8 }}>
          <Btn variant="secondary" onClick={() => setShowForm(false)}>Cancelar</Btn>
          <Btn onClick={save} disabled={saving}>{saving ? "Salvando..." : selected ? "Salvar" : "Cadastrar"}</Btn>
        </div>
      </Modal>
    </div>
  );
}

function PlanSettingsPanel({ saFetch }: any) {
  const [settings, setSettings] = useState<any[]>([]);
  const [saving, setSaving] = useState<string | null>(null);
  const [vals, setVals] = useState<any>({});
  useEffect(() => {
    saFetch("GET", "/super-admin/plan-settings").then((r: any) => {
      const rows = r?.data ?? [];
      setSettings(rows);
      const v: any = {};
      rows.forEach((s: any) => { v[s.key] = String(s.value); });
      setVals(v);
    }).catch(() => {});
  }, []);
  const save = async (key: string) => {
    setSaving(key);
    try { await saFetch("PATCH", `/super-admin/plan-settings/${key}`, { value: Number(vals[key]) || vals[key] }); }
    finally { setSaving(null); }
  };
  const labels: any = {
    free_max_clients: "Limite de clientes (Free)",
    free_max_appointments_month: "Limite agendamentos/mes (Free)",
    trial_days: "Dias de trial",
    whatsapp_min_interval_seconds: "Intervalo minimo entre msgs (seg)",
    whatsapp_max_interval_seconds: "Intervalo maximo entre msgs (seg)",
    whatsapp_daily_limit_new: "Limite diario - numero novo (<7 dias)",
    whatsapp_daily_limit_warm: "Limite diario - numero aquecido (7-30 dias)",
    whatsapp_daily_limit_mature: "Limite diario - numero maduro (>30 dias)",
    whatsapp_send_start_hour: "Hora inicio envio WhatsApp",
    whatsapp_send_end_hour: "Hora fim envio WhatsApp",
  };
  const groups = [
    { title: "Plano Gratuito", keys: ["free_max_clients","free_max_appointments_month","trial_days"] },
    { title: "Anti-ban WhatsApp", keys: ["whatsapp_min_interval_seconds","whatsapp_max_interval_seconds","whatsapp_daily_limit_new","whatsapp_daily_limit_warm","whatsapp_daily_limit_mature","whatsapp_send_start_hour","whatsapp_send_end_hour"] },
  ];
  if (settings.length === 0) return null;
  return (
    <div style={{ marginTop:32 }}>
      <div style={{ fontSize:16, fontWeight:700, color:C.text, marginBottom:20, fontFamily:FB }}>Configuracoes Globais</div>
      {groups.map(g => (
        <div key={g.title} style={{ background:C.card, borderRadius:16, padding:24, marginBottom:20, border:`1px solid ${C.border}` }}>
          <div style={{ fontSize:13, fontWeight:700, color:C.rose, marginBottom:16, fontFamily:FB }}>{g.title}</div>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            {g.keys.map(key => (
              <div key={key} style={{ display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ flex:1, fontSize:12, color:C.textMuted, fontFamily:FB }}>{labels[key] ?? key}</div>
                <input type="number" value={vals[key] ?? ""} onChange={e => setVals((v: any) => ({ ...v, [key]: e.target.value }))}
                  style={{ width:80, padding:"6px 10px", borderRadius:8, border:`1px solid ${C.border}`, background:C.bg, color:C.text, fontFamily:FB, fontSize:13, textAlign:"center" }} />
                <Btn small onClick={() => save(key)} disabled={saving === key}>{saving === key ? "..." : "Salvar"}</Btn>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}


// --- WA BUTTON COM MENSAGENS POR STATUS ----------------------
const WA_MESSAGES: Record<string, string[]> = {
  pending: [
    "Ola {nome}! ? Passando para confirmar seu agendamento em {data} as {hora}. Confirma sua presenca?",
    "Oi {nome}! Tudo bem? Seu horario esta reservado para {data} as {hora}. Confirma? ?",
    "Ola {nome}! Lembrando do seu agendamento conosco em {data} as {hora}. Confirma presenca? ?",
  ],
  confirmed: [
    "Ola {nome}! ? Seu agendamento esta confirmado para {data} as {hora}. Ate la!",
    "Oi {nome}! So lembrando: voce tem horario marcado conosco em {data} as {hora}. Te esperamos! ?",
    "Ola {nome}! Seu horario de {hora} esta confirmado. Qualquer duvida e so chamar! ?",
  ],
  in_progress: [
    "Ola {nome}! Voce esta sendo atendida agora. Qualquer necessidade e so falar! ?",
  ],
  completed: [
    "Ola {nome}! ? Foi um prazer te atender hoje! Como voce avalia nosso servico?",
    "Oi {nome}! Esperamos que tenha gostado! Que tal agendar sua proxima visita? ????",
    "Ola {nome}! Obrigada pela visita! Deixa sua avaliacao no Google e ganhe desconto na proxima. ?",
  ],
  cancelled: [
    "Ola {nome}! Sentimos sua falta hoje. Que tal remarcarmos? Temos horarios disponiveis! ??",
    "Oi {nome}! Vimos que nao pode vir. Sem problemas! Quando quiser remarcar e so chamar. ?",
  ],
  no_show: [
    "Ola {nome}! Ficamos te esperando hoje. Tudo bem? Podemos remarcar seu horario! ?",
    "Oi {nome}! Sentimos sua falta! Que tal agendarmos de novo? Temos horarios esta semana. ?",
  ],
};

function WaButton({ client, status, scheduledAt }: any) {
  const [open, setOpen] = useState(false);
  const msgs = WA_MESSAGES[status] ?? WA_MESSAGES.pending;
  const data = scheduledAt ? new Date(scheduledAt).toLocaleDateString("pt-BR") : "";
  const hora = scheduledAt ? new Date(scheduledAt).toLocaleTimeString("pt-BR", { hour:"2-digit", minute:"2-digit" }) : "";
  const nome = client?.fullName?.split(" ")[0] ?? "cliente";
  const phone = client?.whatsapp?.replace(/\D/g, "") ?? "";

  const format = (msg: string) =>
    msg.replace("{nome}", nome).replace("{data}", data).replace("{hora}", hora);

  return (
    <>
      <button
        onClick={e => { e.stopPropagation(); setOpen(true); }}
        style={{ fontSize:11, color:C.sage, fontWeight:700, padding:"5px 10px", border:`1px solid ${C.sage}40`, borderRadius:8, background:"none", cursor:"pointer", fontFamily:FB }}
      >WA</button>

      {open && (
        <div style={{ position:"fixed", inset:0, background:C.overlay, display:"flex", alignItems:"center", justifyContent:"center", zIndex:2000, padding:20 }}
          onClick={() => setOpen(false)}>
          <div style={{ background:C.card, border:`1px solid ${C.borderHi}`, borderRadius:24, width:"100%", maxWidth:480 }}
            onClick={e => e.stopPropagation()}>
            <div style={{ padding:"18px 24px", borderBottom:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div style={{ fontSize:16, fontWeight:700, color:C.text, fontFamily:FD }}>! Mensagem para {nome}</div>
              <button onClick={() => setOpen(false)} style={{ background:"none", border:"none", color:C.textMuted, fontSize:22, cursor:"pointer" }}>?</button>
            </div>
            <div style={{ padding:24 }}>
              <div style={{ fontSize:11, color:C.textMuted, marginBottom:14, fontFamily:FB, textTransform:"uppercase", letterSpacing:"0.06em" }}>
                Sugestoes para: <span style={{ color:STATUS_APPT[status]?.color ?? C.rose, fontWeight:700 }}>{STATUS_APPT[status]?.label ?? status}</span>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {msgs.map((msg: string, i: number) => {
                  const texto = format(msg);
                  return (
                    <a
                      key={i}
                      href={`https://wa.me/55${phone}?text=${encodeURIComponent(texto)}`}
                      target="_blank"
                      onClick={() => setOpen(false)}
                      style={{ display:"block", background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:"12px 16px", color:C.text, textDecoration:"none", fontSize:13, fontFamily:FB, lineHeight:1.5, cursor:"pointer" }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = C.sage)}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = C.border)}
                    >
                      <div style={{ fontSize:10, color:C.sage, fontWeight:700, marginBottom:6, textTransform:"uppercase", letterSpacing:"0.05em" }}>Opcao {i+1} - clique para abrir WhatsApp</div>
                      {texto}
                    </a>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// --- AGENDA --------------------------------------------------
function AgendaPage() {
  const [filter, setFilter]     = useState("all");
  const [viewMode, setViewMode]   = useState("today");
  const [showForm, setShowForm] = useState(false);
  const [data, setData]         = useState<any[]>([]);
  const [clientsList, setClientsList]   = useState<any[]>([]);
  const [profsList, setProfsList]       = useState<any[]>([]);
  const [svcsList, setSvcsList]         = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");

  const emptyForm = {
    clientId:       "",
    professionalId: "",
    serviceId:      "",
    scheduledAt:    "",
    durationMinutes:"60",
    totalPrice:     "",
  };
  const [form, setForm] = useState(emptyForm);
  const f = (k: string) => (v: string) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => {
    const load = async () => {
      try {
        const [agenda, c, p, s] = await Promise.all([
          viewMode === "today" ? appointmentsApi.today() : appointmentsApi.list({ dateFrom: new Date().toISOString().split("T")[0], limit: 100 }),
          clientsApi.list({ limit: 200 }),
          professionalsApi.list({ isActive: "true" }),
          servicesApi.list({ isActive: "true" }),
        ]);
        setData(agenda.data ?? []);
        setClientsList(c.data ?? []);
        setProfsList(p.data ?? []);
        setSvcsList(s.data ?? []);
      } catch (e) {
        console.error("Agenda load error:", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [viewMode]);

  const handleServiceChange = (serviceId: string) => {
    const svc = svcsList.find((s: any) => s.id === serviceId);
    setForm(p => ({
      ...p,
      serviceId,
      durationMinutes: svc?.durationMinutes?.toString() ?? p.durationMinutes,
      totalPrice:      svc?.price?.toString() ?? p.totalPrice,
    }));
  };

  const save = async () => {
    setError("");
    if (!form.clientId)    return setError("Selecione a cliente.");
    if (!form.scheduledAt) return setError("Informe data e hora.");
    if (!form.totalPrice)  return setError("Informe o valor.");

    setSaving(true);
    try {
      const rawDate = form.scheduledAt.length > 19 ? form.scheduledAt.slice(-16) : form.scheduledAt;
      const start  = new Date(rawDate);
      if (isNaN(start.getTime())) throw new Error("Data invalida: " + rawDate);
      const dur    = Number(form.durationMinutes || 60);
      const endsAt = new Date(start.getTime() + dur * 60_000).toISOString();

      const payload: any = {
        clientId:        form.clientId,
        professionalId:  form.professionalId || null,
        scheduledAt:     start.toISOString(),
        endsAt,
        durationMinutes: dur,
        totalPrice:      form.totalPrice,
        subtotal:        form.totalPrice,
        status:          "pending",
        source:          "manual",
      };

      if (form.serviceId) {
        payload.services = [{
          serviceId:       form.serviceId,
          price:           form.totalPrice,
          durationMinutes: dur,
          total:           form.totalPrice,
        }];
      }

      await appointmentsApi.create(payload);
      const updated = await appointmentsApi.today();
      setData(updated.data ?? []);
      setShowForm(false);
      setForm(emptyForm);
    } catch (e: any) {
      setError(e.message ?? "Erro ao agendar.");
    } finally {
      setSaving(false);
    }
  };

  const deleteAppointment = async (id: string) => {
    if (!window.confirm("Excluir este agendamento?")) return;
    try {
      await appointmentsApi.remove(id);
      setData(d => d.filter((a: any) => (a.appointment?.id ?? a.id) !== id));
    } catch(e: any) { alert("Erro: " + e.message); }
  };

  
  const changeStatus = async (id: string, status: string) => {
    try {
      if (status === "confirmed")        await appointmentsApi.confirm(id);
      else if (status === "in_progress") await appointmentsApi.checkin(id);
      else if (status === "completed")   await appointmentsApi.complete(id, {});
      else if (status === "cancelled")   await appointmentsApi.cancel(id);
      else if (status === "no_show")     await appointmentsApi.noShow(id);
      setData(d => d.map((a: any) =>
        a.appointment?.id === id
          ? { ...a, appointment: { ...a.appointment, status } }
          : a
      ));
    } catch (e) { console.error(e); }
  };

  const filtered = filter === "all"
    ? data
    : data.filter((a: any) => a.appointment?.status === filter);

  const statuses = [
    { v:"all",         l:"Todos" },
    { v:"pending",     l:"Pendentes" },
    { v:"confirmed",   l:"Confirmados" },
    { v:"in_progress", l:"Atendendo" },
    { v:"completed",   l:"Concluidos" },
  ];

  const selStyle: any = { width:"100%", padding:"10px 14px", background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, color:C.text, fontSize:13, outline:"none", boxSizing:"border-box", fontFamily:FB };
  const lblStyle: any = { fontSize:11, fontWeight:700, color:C.textSec, display:"block", marginBottom:6, letterSpacing:"0.05em", textTransform:"uppercase" };

  const cols = [
    { key:"horario", label:"Horario", render: (a: any) => (
      <div>
        <div style={{ fontWeight:600, color:C.text, fontFamily:FB }}>{fmtTime(a.appointment?.scheduledAt)}</div>
        <div style={{ fontSize:11, color:C.textMuted }}>ate {fmtTime(a.appointment?.endsAt)}</div>
      </div>
    )},
    { key:"client", label:"Cliente", render: (a: any) => (
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        <div style={{ width:28, height:28, borderRadius:"50%", background:`linear-gradient(135deg,${C.rose}40,${C.gold}40)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12 }}>
          {(a.client?.fullName ?? "?")[0]}
        </div>
        <div>
          <div style={{ fontWeight:600, color:C.text, display:"flex", gap:6 }}>
            {a.client?.fullName} {a.client?.isVip && <Badge label="VIP" color={C.gold} small />}
          </div>
          <div style={{ fontSize:11, color:C.textMuted }}>{a.client?.whatsapp}</div>
        </div>
      </div>
    )},
    { key:"professional", label:"Profissional", render: (a: any) => (
      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
        <div style={{ width:8, height:8, borderRadius:"50%", background:a.professional?.color ?? C.rose }} />
        <span style={{ color:C.textSec, fontSize:13 }}>{a.professional?.fullName ?? "-"}</span>
      </div>
    )},
    { key:"status", label:"Status", render: (a: any) => {
      const s = STATUS_APPT[a.appointment?.status];
      return <Badge label={s?.label ?? a.appointment?.status} color={s?.color ?? C.textMuted} />;
    }},
    { key:"total", label:"Valor", render: (a: any) => <span style={{ fontWeight:700, color:C.gold }}>{brl(a.appointment?.totalPrice)}</span> },
    { key:"action", label:"Acoes", render: (a: any) => (
      <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
        {a.appointment?.status === "pending"     && <Btn small onClick={(e: any) => { e.stopPropagation(); changeStatus(a.appointment.id,"confirmed"); }}>Confirmar</Btn>}
        {a.appointment?.status === "confirmed"   && <Btn small onClick={(e: any) => { e.stopPropagation(); changeStatus(a.appointment.id,"in_progress"); }}>Check-in</Btn>}
        {a.appointment?.status === "in_progress" && <Btn small variant="gold" onClick={(e: any) => { e.stopPropagation(); changeStatus(a.appointment.id,"completed"); }}>Concluir</Btn>}
        {["pending","confirmed"].includes(a.appointment?.status) && (
          <Btn small variant="danger" onClick={(e: any) => { e.stopPropagation(); changeStatus(a.appointment.id,"cancelled"); }}>?</Btn>
        )}
        <WaButton client={a.client} status={a.appointment?.status} scheduledAt={a.appointment?.scheduledAt} />
      </div>
    )},
  ];

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:400 }}>
      <div style={{ color:C.textMuted, fontFamily:FB }}>Carregando agenda...</div>
    </div>
  );

  return (
    <div>
      <PageHeader
        title="Agenda"
        sub={`${filtered.length} agendamento${filtered.length !== 1 ? "s" : ""} ${viewMode === "today" ? "hoje" : "futuros"}`}
        action={<Btn onClick={() => { setForm(emptyForm); setError(""); setShowForm(true); }}>+ Novo Agendamento</Btn>}
      />
      <div style={{ display:"flex", gap:8, marginBottom:12 }}>
        <button onClick={() => setViewMode("today")} style={{ padding:"8px 18px", borderRadius:8, border:"1px solid " + (viewMode === "today" ? C.rose : C.border), background: viewMode === "today" ? C.rose + "20" : "transparent", color: viewMode === "today" ? C.rose : C.textMuted, fontFamily:FB, fontSize:13, cursor:"pointer" }}>Hoje</button>
        <button onClick={() => setViewMode("upcoming")} style={{ padding:"8px 18px", borderRadius:8, border:"1px solid " + (viewMode === "upcoming" ? C.rose : C.border), background: viewMode === "upcoming" ? C.rose + "20" : "transparent", color: viewMode === "upcoming" ? C.rose : C.textMuted, fontFamily:FB, fontSize:13, cursor:"pointer" }}>Futuros</button>
      </div>
      <div style={{ display:"flex", gap:8, marginBottom:20, flexWrap:"wrap" }}>
        {statuses.map(s => (
          <button key={s.v} onClick={() => setFilter(s.v)}
            style={{ padding:"7px 16px", borderRadius:8, border:`1px solid ${filter===s.v?C.rose:C.border}`, background:filter===s.v?`${C.rose}15`:C.card, color:filter===s.v?C.rose:C.textMuted, fontSize:12, cursor:"pointer", fontFamily:FB, fontWeight:600 }}>{s.l}</button>
        ))}
      </div>
      <Table cols={cols} rows={filtered} emptyMsg="Nenhum agendamento hoje." />

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Novo Agendamento">
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:4 }}>

          <div style={{ marginBottom:14, gridColumn:"1/-1" }}>
            <label style={lblStyle}>Cliente *</label>
            <select value={form.clientId} onChange={e => f("clientId")(e.target.value)} style={selStyle}>
              <option value="">Selecione a cliente...</option>
              {clientsList.map((c: any) => (
                <option key={c.id} value={c.id}>{c.fullName}{c.whatsapp ? ` ? ${c.whatsapp}` : ""}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom:14, gridColumn:"1/-1" }}>
            <label style={lblStyle}>Profissional</label>
            <select value={form.professionalId} onChange={e => f("professionalId")(e.target.value)} style={selStyle}>
              <option value="">Selecione (opcional)...</option>
              {profsList.map((p: any) => (
                <option key={p.id} value={p.id}>{p.fullName}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom:14, gridColumn:"1/-1" }}>
            <label style={lblStyle}>Servico</label>
            <select value={form.serviceId} onChange={e => handleServiceChange(e.target.value)} style={selStyle}>
              <option value="">Selecione (opcional)...</option>
              {svcsList.map((s: any) => (
                <option key={s.id} value={s.id}>{s.name} - {brl(s.price)} ? {s.durationMinutes}min</option>
              ))}
            </select>
          </div>

          <Inp label="Data e Hora *" value={form.scheduledAt} onChange={f("scheduledAt")} type="datetime-local" autoComplete="off" />
          <Inp label="Duracao (min)" value={form.durationMinutes} onChange={f("durationMinutes")} type="number" placeholder="60" />
          <Inp label="Valor (R$) *" value={form.totalPrice} onChange={f("totalPrice")} type="number" placeholder="180.00" grid="1/-1" />
        </div>

        {error && (
          <div style={{ background:`${C.ruby}15`, border:`1px solid ${C.ruby}30`, borderRadius:10, padding:"10px 14px", color:C.ruby, fontSize:12, marginBottom:16 }}>
            {error}
          </div>
        )}

        <div style={{ display:"flex", gap:10, marginTop:8 }}>
          <Btn variant="secondary" onClick={() => setShowForm(false)}>Cancelar</Btn>
          <Btn onClick={save} disabled={saving}>{saving ? "Agendando..." : "Agendar"}</Btn>
        </div>
      </Modal>
    </div>
  );
}

// --- PROFISSIONAIS --------------------------------------------
function ProfessionalsPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ fullName:"", whatsapp:"", email:"", commissionPct:"50", monthlyGoal:"", color:"#E8A598" });
 const f = (k: string) => (v: string) => setForm(p => ({ ...p, [k]:v }));

  const exportXLSX = () => {
    const XLSX = (window as any).XLSX;
    if (!XLSX) { alert("Aguarde carregar..."); return; }
    const rows = filtered.map((t: any) => ({
      "Descricao": t.description,
      "Tipo": t.type === "revenue" ? "Receita" : "Despesa",
      "Status": t.status === "confirmed" ? "Pago" : "Pendente",
      "Forma": t.paymentMethod ? (PAYMENT_LABEL[t.paymentMethod] ?? t.paymentMethod) : "-",
      "Vencimento": t.dueDate ? new Date(t.dueDate).toLocaleDateString("pt-BR") : "-",
      "Valor": Number(t.amount),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Financeiro");
    XLSX.writeFile(wb, `financeiro_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  const exportPDF = () => {
    const { jsPDF } = (window as any).jspdf;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Relatorio Financeiro - BeautyTech", 14, 20);
    doc.setFontSize(11);
    doc.text(`Gerado em: ${new Date().toLocaleDateString("pt-BR")}`, 14, 28);
    doc.text(`Receitas: R$ ${Number(summary.revenue).toFixed(2)}  |  Despesas: R$ ${Number(summary.expenses).toFixed(2)}  |  Lucro: R$ ${Number(summary.profit).toFixed(2)}`, 14, 36);
    const rows = filtered.map((t: any) => [
      t.description,
      t.type === "revenue" ? "Receita" : "Despesa",
      t.status === "confirmed" ? "Pago" : "Pendente",
      t.paymentMethod ? (PAYMENT_LABEL[t.paymentMethod] ?? t.paymentMethod) : "-",
      t.dueDate ? new Date(t.dueDate).toLocaleDateString("pt-BR") : "-",
      `R$ ${Number(t.amount).toFixed(2)}`,
    ]);
    (doc as any).autoTable({
      head: [["Descricao", "Tipo", "Status", "Forma", "Vencimento", "Valor"]],
      body: rows,
      startY: 44,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [180, 90, 80] },
    });
    doc.save(`financeiro_${new Date().toISOString().split("T")[0]}.pdf`);
  };

  useEffect(() => {
    professionalsApi.list({ isActive: "true" })
      .then((r: any) => setData(r.data ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    if (!form.fullName) return alert("Informe o nome.");
    setSaving(true);
    try {
      const payload: any = { ...form };
      if (!payload.monthlyGoal) delete payload.monthlyGoal;
      if (!payload.whatsapp) delete payload.whatsapp;
      if (!payload.email) delete payload.email;
      const r: any = await professionalsApi.create(payload);
      setData(d => [...d, r.data]);
      setShowForm(false);
      setForm({ fullName:"", whatsapp:"", email:"", commissionPct:"50", monthlyGoal:"", color:"#E8A598" });
    } catch(e: any) {
      alert("Erro: " + e.message);
    } finally { setSaving(false); }
  };
  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:400 }}>
      <div style={{ color: C.textMuted, fontFamily: FB }}>Carregando profissionais...</div>
    </div>
  );

  return (
    <div>
      <PageHeader title="Profissionais" sub={`${data.length} profissionais ativos`} action={<Btn onClick={() => setShowForm(true)}>+ Nova Profissional</Btn>} />
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(280px, 1fr))", gap:16 }}>
        {data.length === 0 && <div style={{ color: C.textMuted, fontFamily: FB }}>Nenhum profissional cadastrado.</div>}
        {data.map((p: any, i: number) => (
          <div key={i} style={{ background: C.card, border:`1px solid ${C.border}`, borderRadius:20, padding:24, position:"relative", overflow:"hidden" }}>
            <div style={{ position:"absolute", top:0, left:0, right:0, height:4, background:`linear-gradient(90deg, ${p.color ?? C.rose}, ${p.color ?? C.rose}80)` }} />
            <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:18 }}>
              <div style={{ width:48, height:48, borderRadius:"50%", background:`${p.color ?? C.rose}25`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, border:`2px solid ${p.color ?? C.rose}40` }}>
                {(p.fullName ?? "?")[0]}
              </div>
              <div>
                <div style={{ fontWeight:700, color: C.text, fontSize:15, fontFamily: FD }}>{p.fullName}</div>
                <div style={{ fontSize:11, color: C.textMuted, marginTop:2 }}>{(p.specialties ?? []).slice(0,2).join(" ? ")}</div>
              </div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
              <div style={{ background: C.surface, borderRadius:10, padding:"10px 12px" }}>
                <div style={{ fontSize:10, color: C.textMuted, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:4 }}>Meta Mensal</div>
                <div style={{ fontSize:16, fontWeight:700, color: C.gold, fontFamily: FD }}>{brl(p.monthlyGoal)}</div>
              </div>
              <div style={{ background: C.surface, borderRadius:10, padding:"10px 12px" }}>
                <div style={{ fontSize:10, color: C.textMuted, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:4 }}>Comissao</div>
                <div style={{ fontSize:16, fontWeight:700, color: C.rose, fontFamily: FD }}>{p.commissionPct}%</div>
              </div>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <Badge label={p.isActive ? "Ativo" : "Inativo"} color={p.isActive ? C.sage : C.textMuted} />
              <Badge label={p.acceptsOnlineBooking ? "Agendamento Online" : "Presencial"} color={p.acceptsOnlineBooking ? C.sapphire : C.textMuted} />
            </div>
          </div>
        ))}
</div>
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nova Profissional">
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:4 }}>
          <Inp label="Nome completo *" value={form.fullName} onChange={f("fullName")} placeholder="Marina Santos" required grid="1/-1" />
          <Inp label="WhatsApp" value={form.whatsapp} onChange={f("whatsapp")} placeholder="(34) 99999-0000" />
          <Inp label="E-mail" value={form.email} onChange={f("email")} type="email" placeholder="marina@salao.com" />
          <Inp label="Comissao %" value={form.commissionPct} onChange={f("commissionPct")} type="number" placeholder="50" />
          <Inp label="Meta Mensal (R$)" value={form.monthlyGoal} onChange={f("monthlyGoal")} type="number" placeholder="5000" />
          <Inp label="Cor" value={form.color} onChange={f("color")} type="color" />
        </div>
        <div style={{ display:"flex", gap:10, marginTop:8 }}>
          <Btn variant="secondary" onClick={() => setShowForm(false)}>Cancelar</Btn>
          <Btn onClick={save} disabled={saving}>{saving ? "Salvando..." : "Cadastrar"}</Btn>
        </div>
      </Modal>
    </div>
  );
}
// --- SERVI

// --- SERVI?OS -------------------------------------------------
function ServicesPage() {
  const [data, setData] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name:"", categoryId:"", durationMinutes:"60", price:"", isActive:true });
  const f = (k: string) => (v: any) => setForm(p => ({ ...p, [k]:v }));

  useEffect(() => {
    Promise.all([servicesApi.list(), servicesApi.categories()])
      .then(([s, c]: any) => { setData(s.data ?? []); setCategories(c.data ?? []); })
      .catch(console.error).finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const payload: any = { ...form };
      if (!payload.categoryId) delete payload.categoryId;
      const r: any = await servicesApi.create(payload);
      setData(d => [...d, r.data]);
      setShowForm(false);
    } catch(e: any) {
      alert("Erro: " + e.message);
    } finally { setSaving(false); }
  };

  const toggleActive = async (s: any) => {
    try {
      const r: any = await servicesApi.update(s.id, { isActive: !s.isActive });
      setData(d => d.map((x: any) => x.id === s.id ? r.data : x));
    } catch(e) { console.error(e); }
  };

  const cols = [
    { key:"name", label:"Servico", render: (s: any) => <span style={{ fontWeight:600, color: C.text }}>{s.name}</span> },
    { key:"categoryName", label:"Categoria", render: (s: any) => <Badge label={s.categoryName ?? s.category?.name ?? "-"} color={C.rose} /> },
    { key:"durationMinutes", label:"Duracao", render: (s: any) => <span style={{ color: C.textSec }}>{s.durationMinutes}min</span> },
    { key:"price", label:"Preco", render: (s: any) => <span style={{ fontWeight:700, color: C.gold }}>{brl(s.price)}</span> },
    { key:"isOnlineBookable", label:"Online", render: (s: any) => <Badge label={s.isOnlineBookable ? "Sim" : "Nao"} color={s.isOnlineBookable ? C.sage : C.textMuted} /> },
    { key:"isActive", label:"Status", render: (s: any) => <Badge label={s.isActive ? "Ativo" : "Inativo"} color={s.isActive ? C.sage : C.textMuted} /> },
    { key:"action", label:"", render: (s: any) => (
      <Btn small variant="danger" onClick={(e: any) => { e.stopPropagation(); toggleActive(s); }}>
        {s.isActive ? "Desativar" : "Ativar"}
      </Btn>
    )},
  ];

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:400 }}>
      <div style={{ color: C.textMuted, fontFamily: FB }}>Carregando servicos...</div>
    </div>
  );

  return (
    <div>
      <PageHeader title="Servicos" sub={`${data.filter((s: any) => s.isActive).length} servicos ativos`} action={<Btn onClick={() => setShowForm(true)}>+ Novo Servico</Btn>} />
      <Table cols={cols} rows={data} />
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Novo Servico">
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:4 }}>
          <Inp label="Nome" value={form.name} onChange={f("name")} required placeholder="Coloracao Completa" grid="1/-1" />
          <Sel label="Categoria" value={form.categoryId} onChange={f("categoryId")} options={categories.map((c: any) => ({ value:c.id, label:c.name }))} />
          <Inp label="Duracao (min)" value={form.durationMinutes} onChange={f("durationMinutes")} type="number" placeholder="60" />
          <Inp label="Preco (R$)" value={form.price} onChange={f("price")} type="number" placeholder="180.00" grid="1/-1" />
        </div>
        <div style={{ display:"flex", gap:10, marginTop:8 }}>
          <Btn variant="secondary" onClick={() => setShowForm(false)}>Cancelar</Btn>
          <Btn onClick={save} disabled={saving}>{saving ? "Salvando..." : "Criar Servico"}</Btn>
        </div>
      </Modal>
    </div>
  );
}

function PackagesPage() {
  const [data, setData] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ clientId:"", name:"", totalSessions:"", totalValue:"", expiresAt:"" });
  const f = (k: string) => (v: string) => setForm(p => ({ ...p, [k]:v }));
  useEffect(() => {
    Promise.all([packagesApi.list({ limit: 100 }), clientsApi.list({ limit: 200 })])
      .then(([p, c]: any) => { setClients(c.data ?? []); setData(p.data ?? []); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);
  const getClient = (clientId: string) => clients.find((c: any) => c.id === clientId);

  const useSession = async (id: string) => {
    try {
      const r: any = await packagesApi.useSession(id);
      setData(d => d.map((p: any) => p.id === id ? r.data : p));
    } catch(e: any) { alert("Erro: " + e.message); }
  };

  const save = async () => {
    if (!form.clientId) return alert("Selecione o cliente.");
    if (!form.name) return alert("Informe o nome do pacote.");
    if (!form.totalSessions) return alert("Informe o numero de sessoes.");
    if (!form.totalValue) return alert("Informe o valor.");
    setSaving(true);
    try {
     const r: any = await packagesApi.create({ ...form, totalSessions: Number(form.totalSessions), totalValue: Number(form.totalValue) });
      setData(d => [...d, r.data]);
      setShowForm(false);
      setForm({ clientId:"", name:"", totalSessions:"", totalValue:"", expiresAt:"" });
    } catch(e: any) { alert("Erro: " + e.message); }
    finally { setSaving(false); }
  };
  const cols = [
    { key:"clientId", label:"Cliente", render: (p: any) => <span style={{ fontWeight:600, color: C.text }}>{getClient(p.clientId)?.fullName ?? p.clientId}</span> },
    { key:"name", label:"Pacote", render: (p: any) => <span style={{ color: C.textSec }}>{p.name}</span> },
    { key:"sessions", label:"Sessoes", render: (p: any) => (
      <div>
        <div style={{ fontWeight:700, color: C.text }}>{p.usedSessions} / {p.totalSessions}</div>
        <ProgressBar value={p.usedSessions} max={p.totalSessions} color={C.rose} />
      </div>
    )},
    { key:"remaining", label:"Restantes", render: (p: any) => <Badge label={`${p.remainingSessions} sessoes`} color={p.remainingSessions > 0 ? C.sage : C.textMuted} /> },
    { key:"totalValue", label:"Valor Total", render: (p: any) => <span style={{ fontWeight:700, color: C.gold }}>{brl(p.totalValue)}</span> },
    { key:"status", label:"Status", render: (p: any) => { const s = PKG_STATUS[p.status]; return <Badge label={s?.label ?? p.status} color={s?.color ?? C.textMuted} />; } },
    { key:"expiresAt", label:"Vencimento", render: (p: any) => <span style={{ fontSize:12, color: C.textMuted }}>{fmtDate(p.expiresAt)}</span> },
    { key:"action", label:"", render: (p: any) => p.remainingSessions > 0 && p.status === "active" && (
      <Btn small onClick={(e: any) => { e.stopPropagation(); useSession(p.id); }}>Usar Sessao</Btn>
    )},
  ];

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:400 }}>
      <div style={{ color: C.textMuted, fontFamily: FB }}>Carregando pacotes...</div>
    </div>
  );

  return (
<div>
      <PageHeader title="Pacotes" sub={`${data.filter((p: any) => p.status === "active").length} pacotes ativos`} action={<Btn onClick={() => setShowForm(true)}>+ Novo Pacote</Btn>} />
      <Table cols={cols} rows={data} emptyMsg="Nenhum pacote encontrado." />
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Novo Pacote">
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:4 }}>
          <Sel label="Cliente *" value={form.clientId} onChange={f("clientId")} options={clients.map((c: any) => ({ value: c.id, label: c.fullName }))} grid="1/-1" />
          <Inp label="Nome do Pacote *" value={form.name} onChange={f("name")} placeholder="Ex: Pacote 10 Cortes" grid="1/-1" />
          <Inp label="Total de Sessoes *" value={form.totalSessions} onChange={f("totalSessions")} type="number" placeholder="10" />
          <Inp label="Valor Total (R$) *" value={form.totalValue} onChange={f("totalValue")} type="number" placeholder="500.00" />
          <Inp label="Vencimento" value={form.expiresAt} onChange={f("expiresAt")} type="date" grid="1/-1" />
        </div>
        <div style={{ display:"flex", gap:10, marginTop:8 }}>
          <Btn variant="secondary" onClick={() => setShowForm(false)}>Cancelar</Btn>
          <Btn onClick={save} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Btn>
        </div>
      </Modal>
    </div>
  );
}

// --- FINANCEIRO -----------------------------------------------
function FinancialPage() {
  const [data, setData] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({ revenue:0, expenses:0, profit:0 });
  const [accounts, setAccounts] = useState<any[]>([]);
  const [filter, setFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ description:"", type:"revenue", amount:"", paymentMethod:"pix", dueDate:"", status:"pending", accountId:"" });
 const f = (k: string) => (v: string) => setForm(p => ({ ...p, [k]:v }));

  const exportXLSX = () => {
    const XLSX = (window as any).XLSX;
    if (!XLSX) { alert("Aguarde carregar..."); return; }
    const rows = filtered.map((t: any) => ({
      "Descricao": t.description,
      "Tipo": t.type === "revenue" ? "Receita" : "Despesa",
      "Status": t.status === "confirmed" ? "Pago" : "Pendente",
      "Forma": t.paymentMethod ? (PAYMENT_LABEL[t.paymentMethod] ?? t.paymentMethod) : "-",
      "Vencimento": t.dueDate ? new Date(t.dueDate).toLocaleDateString("pt-BR") : "-",
      "Valor": Number(t.amount),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Financeiro");
    XLSX.writeFile(wb, `financeiro_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  const exportPDF = () => {
    const { jsPDF } = (window as any).jspdf;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Relatorio Financeiro - BeautyTech", 14, 20);
    doc.setFontSize(11);
    doc.text(`Gerado em: ${new Date().toLocaleDateString("pt-BR")}`, 14, 28);
    doc.text(`Receitas: R$ ${Number(summary.revenue).toFixed(2)}  |  Despesas: R$ ${Number(summary.expenses).toFixed(2)}  |  Lucro: R$ ${Number(summary.profit).toFixed(2)}`, 14, 36);
    const rows = filtered.map((t: any) => [
      t.description,
      t.type === "revenue" ? "Receita" : "Despesa",
      t.status === "confirmed" ? "Pago" : "Pendente",
      t.paymentMethod ? (PAYMENT_LABEL[t.paymentMethod] ?? t.paymentMethod) : "-",
      t.dueDate ? new Date(t.dueDate).toLocaleDateString("pt-BR") : "-",
      `R$ ${Number(t.amount).toFixed(2)}`,
    ]);
    (doc as any).autoTable({
      head: [["Descricao", "Tipo", "Status", "Forma", "Vencimento", "Valor"]],
      body: rows,
      startY: 44,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [180, 90, 80] },
    });
    doc.save(`financeiro_${new Date().toISOString().split("T")[0]}.pdf`);
  };

  const save = async () => {
    if (!form.description) return alert("Informe a descricao.");
    if (!form.amount) return alert("Informe o valor.");
    setSaving(true);
    try {
      const r: any = await financialApi.create(form);
      setData(d => [...d, r.data]);
      const s: any = await financialApi.summary();
      setSummary(s.data ?? summary);
      setShowForm(false);
      setForm(p => ({ description:"", type:"revenue", amount:"", paymentMethod:"pix", dueDate:"", status:"pending", accountId: p.accountId }));
    } catch(e: any) {
      alert("Erro ao salvar: " + e.message);
    } finally {
      setSaving(false);
    }
  };

useEffect(() => {
    Promise.all([financialApi.list({ limit: 100 }), financialApi.summary(), financialApi.accounts()])
      .then(([t, s, a]: any) => {
        setData(t.data ?? []);
        setSummary(s.data ?? { revenue:0, expenses:0, profit:0 });
        const accs = a.data ?? [];
        setAccounts(accs);
        const def = accs.find((x: any) => x.isDefault) ?? accs[0];
        if (def) setForm(p => ({ ...p, accountId: def.id }));
      })
      .catch(console.error).finally(() => setLoading(false));
  }, []);
  const filtered = data.filter((t: any) => {
    if (filter !== "all" && t.type !== filter) return false;
    if (dateFrom && t.dueDate && t.dueDate < dateFrom) return false;
    if (dateTo   && t.dueDate && t.dueDate > dateTo)   return false;
    return true;
  });
  const cols = [
    { key:"description", label:"Descricao", render: (t: any) => <span style={{ fontWeight:600, color: C.text }}>{t.description}</span> },
    { key:"type", label:"Tipo", render: (t: any) => <Badge label={t.type==="revenue"?"Receita":"Despesa"} color={t.type==="revenue"?C.sage:C.ruby} /> },
    { key:"status", label:"Status", render: (t: any) => <Badge label={t.status==="confirmed"?"Pago":"Pendente"} color={t.status==="confirmed"?C.sage:C.gold} /> },
    { key:"paymentMethod", label:"Forma", render: (t: any) => <span style={{ color: C.textMuted, fontSize:12 }}>{t.paymentMethod ? PAYMENT_LABEL[t.paymentMethod] ?? t.paymentMethod : "-"}</span> },
    { key:"dueDate", label:"Vencimento", render: (t: any) => <span style={{ color: C.text, fontSize:12 }}>{fmtDate(t.dueDate)}</span> },
    { key:"amount", label:"Valor", render: (t: any) => <span style={{ fontWeight:700, color: t.type==="revenue" ? C.sage : C.ruby }}>{t.type==="expense"?"-":""}{brl(t.amount)}</span> },
  ];

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:400 }}>
      <div style={{ color: C.textMuted, fontFamily: FB }}>Carregando financeiro...</div>
    </div>
  );

  return (
    <div>
      <PageHeader title="Financeiro" sub="Controle de receitas e despesas" action={
        <div style={{ display:"flex", gap:8 }}>
          <Btn small variant="secondary" onClick={exportXLSX}>XLSX</Btn>
          <Btn small variant="secondary" onClick={exportPDF}>PDF</Btn>
          <Btn onClick={() => setShowForm(true)}>+ Nova Transacao</Btn>
        </div>
      } />
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16, marginBottom:24 }}>
        <KpiCard icon="R$" label="Receitas"      value={brl(summary.revenue)}  color={C.sage} />
        <KpiCard icon="D$" label="Despesas"      value={brl(summary.expenses)} color={C.ruby} />
        <KpiCard icon="L$" label="Lucro Liquido" value={brl(summary.profit)}   color={summary.profit >= 0 ? C.gold : C.ruby} />
      </div>
       <div style={{ display:"flex", gap:8, marginBottom:16, flexWrap:"wrap", alignItems:"center" }}>
        {[{ v:"all", l:"Todos" },{ v:"revenue", l:"Receitas" },{ v:"expense", l:"Despesas" }].map(f2 => (
          <button key={f2.v} onClick={() => setFilter(f2.v)} style={{ padding:"7px 16px", borderRadius:8, border:`1px solid ${filter===f2.v?C.rose:C.border}`, background: filter===f2.v?`${C.rose}15`:C.card, color: filter===f2.v?C.rose:C.textMuted, fontSize:12, cursor:"pointer", fontFamily: FB, fontWeight:600 }}>{f2.l}</button>
        ))}
        <div style={{ display:"flex", alignItems:"center", gap:6, marginLeft:8 }}>
          <span style={{ fontSize:12, color:C.textMuted, fontFamily:FB }}>De:</span>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ padding:"6px 10px", borderRadius:8, border:`1px solid ${C.border}`, background:C.card, color:C.text, fontSize:12, fontFamily:FB, cursor:"pointer" }} />
          <span style={{ fontSize:12, color:C.textMuted, fontFamily:FB }}>Ate</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ padding:"6px 10px", borderRadius:8, border:`1px solid ${C.border}`, background:C.card, color:C.text, fontSize:12, fontFamily:FB, cursor:"pointer" }} />
          {(dateFrom || dateTo) && <button onClick={() => { setDateFrom(""); setDateTo(""); }} style={{ padding:"6px 10px", borderRadius:8, border:`1px solid ${C.border}`, background:C.card, color:C.ruby, fontSize:11, cursor:"pointer", fontFamily:FB }}>Limpar</button>}
        </div>
      </div>
      <Table cols={cols} rows={filtered} emptyMsg="Nenhuma transacao encontrada." />
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nova Transacao">
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:4 }}>
          <Inp label="Descricao *" value={form.description} onChange={f("description")} placeholder="Ex: Coloracao - Ana Silva" grid="1/-1" />
          <Sel label="Tipo" value={form.type} onChange={f("type")} options={[{ value:"revenue", label:"Receita" },{ value:"expense", label:"Despesa" }]} />
          <Inp label="Valor (R$) *" value={form.amount} onChange={f("amount")} type="number" placeholder="150.00" />
          <Sel label="Forma de Pagamento" value={form.paymentMethod} onChange={f("paymentMethod")} options={Object.entries(PAYMENT_LABEL).map(([v,l]) => ({ value:v, label:String(l) }))} />
          <Inp label="Vencimento" value={form.dueDate} onChange={f("dueDate")} type="date" />
          <Sel label="Status" value={form.status} onChange={f("status")} options={[{ value:"pending", label:"Pendente" },{ value:"confirmed", label:"Pago" }]} />
        </div>
        <div style={{ display:"flex", gap:10, marginTop:8 }}>
          <Btn variant="secondary" onClick={() => setShowForm(false)}>Cancelar</Btn>
          <Btn onClick={save} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Btn>
        </div>
      </Modal>
    </div>
  );
}
// --- COMISS?ES ------------------------------------------------
function CommissionsPage() {
  const [data, setData] = useState<any[]>([]);
  const [filter, setFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    commissionsApi.list({ limit: 100 })
      .then((r: any) => setData(r.data ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const pay = async (id: string) => {
    try {
      const r: any = await commissionsApi.pay(id);
      setData(d => d.map((c: any) => c.id === id ? r.data : c));
    } catch(e) { console.error(e); }
  };

  const exportXLSX = () => {
    const XLSX = (window as any).XLSX;
    if (!XLSX) { alert("Aguarde carregar..."); return; }
    const rows = data.map((c: any) => ({
      "Profissional": c.professional?.fullName ?? c.professionalId,
      "Base": Number(c.baseAmount),
      "Comissao %": c.commissionPct,
      "Valor Comissao": Number(c.commissionAmt),
      "Mes Referencia": c.referenceMonth ?? "-",
      "Status": c.isPaid ? "Pago" : "A Pagar",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Comissoes");
    XLSX.writeFile(wb, `comissoes_${new Date().toISOString().split("T")[0]}.xlsx`);
  };
  const exportPDF = () => {
    const { jsPDF } = (window as any).jspdf;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Relatorio de Comissoes - BeautyTech", 14, 20);
    doc.setFontSize(11);
    doc.text(`Gerado em: ${new Date().toLocaleDateString("pt-BR")}`, 14, 28);
    const rows = data.map((c: any) => [
      c.professional?.fullName ?? c.professionalId,
      brl(c.baseAmount),
      `${c.commissionPct}%`,
      brl(c.commissionAmt),
      c.referenceMonth ?? "-",
      c.isPaid ? "Pago" : "A Pagar",
    ]);
    (doc as any).autoTable({ head: [["Profissional","Base","Comissao %","Valor","Mes Ref.","Status"]], body: rows, startY: 44, styles: { fontSize: 9 }, headStyles: { fillColor: [180, 90, 80] } });
    doc.save(`comissoes_${new Date().toISOString().split("T")[0]}.pdf`);
  };
  const filtered = data.filter((c: any) => {
    if (filter !== "all" && c.isPaid !== (filter === "paid")) return false;
    if (dateFrom && c.referenceMonth && c.referenceMonth < dateFrom.substring(0,7)) return false;
    if (dateTo   && c.referenceMonth && c.referenceMonth > dateTo.substring(0,7))   return false;
    return true;
  });
  const totalPending = data.filter((c: any) => !c.isPaid).reduce((s, c: any) => s + Number(c.commissionAmt), 0);
  const totalPaid    = data.filter((c: any) =>  c.isPaid).reduce((s, c: any) => s + Number(c.commissionAmt), 0);

  const cols = [
    { key:"professionalId", label:"Profissional", render: (c: any) => <span style={{ fontWeight:600, color: C.text }}>{c.professional?.fullName ?? c.professionalId}</span> },
    { key:"baseAmount", label:"Base", render: (c: any) => <span style={{ color: C.textMuted }}>{brl(c.baseAmount)}</span> },
    { key:"commissionPct", label:"Comissao %", render: (c: any) => <Badge label={`${c.commissionPct}%`} color={C.rose} /> },
    { key:"commissionAmt", label:"Valor", render: (c: any) => <span style={{ fontWeight:700, color: C.gold }}>{brl(c.commissionAmt)}</span> },
    { key:"referenceMonth", label:"Mes Ref.", render: (c: any) => <span style={{ color: C.textMuted, fontSize:12 }}>{c.referenceMonth}</span> },
    { key:"isPaid", label:"Status", render: (c: any) => <Badge label={c.isPaid?"Pago":"A Pagar"} color={c.isPaid?C.sage:C.gold} /> },
    { key:"action", label:"", render: (c: any) => !c.isPaid && (
      <Btn small variant="gold" onClick={(e: any) => { e.stopPropagation(); pay(c.id); }}>Pagar</Btn>
    )},
  ];

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:400 }}>
      <div style={{ color: C.textMuted, fontFamily: FB }}>Carregando comissoes...</div>
    </div>
  );

  return (
    <div>
      <PageHeader title="Comissoes" sub="Controle de comissoes por profissional" action={
        <div style={{ display:"flex", gap:8 }}>
          <Btn small variant="secondary" onClick={exportXLSX}>XLSX</Btn>
          <Btn small variant="secondary" onClick={exportPDF}>PDF</Btn>
        </div>
      } />
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:16, marginBottom:24 }}>
        <KpiCard icon="AP" label="A Pagar" value={brl(totalPending)} color={C.gold} />
        <KpiCard icon="OK" label="Pagas"   value={brl(totalPaid)}    color={C.sage} />
        <KpiCard icon="Tot" label="Total"   value={brl(totalPending+totalPaid)} color={C.rose} />
      </div>
<div style={{ display:"flex", gap:8, marginBottom:16, flexWrap:"wrap", alignItems:"center" }}>
        {[{ v:"all",l:"Todas" },{ v:"pending",l:"A Pagar" },{ v:"paid",l:"Pagas" }].map(f2 => (
          <button key={f2.v} onClick={() => setFilter(f2.v)} style={{ padding:"7px 16px", borderRadius:8, border:`1px solid ${filter===f2.v?C.rose:C.border}`, background:filter===f2.v?`${C.rose}15`:C.card, color:filter===f2.v?C.rose:C.textMuted, fontSize:12, cursor:"pointer", fontFamily:FB, fontWeight:600 }}>{f2.l}</button>
        ))}
        <div style={{ display:"flex", alignItems:"center", gap:6, marginLeft:8 }}>
          <span style={{ fontSize:12, color:C.textMuted, fontFamily:FB }}>De:</span>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ padding:"6px 10px", borderRadius:8, border:`1px solid ${C.border}`, background:C.card, color:C.text, fontSize:12, fontFamily:FB, cursor:"pointer" }} />
          <span style={{ fontSize:12, color:C.textMuted, fontFamily:FB }}>Ate</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ padding:"6px 10px", borderRadius:8, border:`1px solid ${C.border}`, background:C.card, color:C.text, fontSize:12, fontFamily:FB, cursor:"pointer" }} />
          {(dateFrom || dateTo) && <button onClick={() => { setDateFrom(""); setDateTo(""); }} style={{ padding:"6px 10px", borderRadius:8, border:`1px solid ${C.border}`, background:C.card, color:C.ruby, fontSize:11, cursor:"pointer", fontFamily:FB }}>Limpar</button>}
        </div>
      </div>      <Table cols={cols} rows={filtered} emptyMsg="Nenhuma comissao encontrada." />
    </div>
  );
}

// --- CRM ------------------------------------------------------
function CRMPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name:"", whatsapp:"", source:"instagram", serviceInterest:"", estimatedValue:"" });
const f = (k: string) => (v: string) => setForm(p => ({ ...p, [k]:v }));

  const exportXLSX = () => {
    const XLSX = (window as any).XLSX;
    if (!XLSX) { alert("Aguarde carregar..."); return; }
    const rows = filtered.map((t: any) => ({
      "Descricao": t.description,
      "Tipo": t.type === "revenue" ? "Receita" : "Despesa",
      "Status": t.status === "confirmed" ? "Pago" : "Pendente",
      "Forma": t.paymentMethod ? (PAYMENT_LABEL[t.paymentMethod] ?? t.paymentMethod) : "-",
      "Vencimento": t.dueDate ? new Date(t.dueDate).toLocaleDateString("pt-BR") : "-",
      "Valor": Number(t.amount),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Financeiro");
    XLSX.writeFile(wb, `financeiro_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  const exportPDF = () => {
    const { jsPDF } = (window as any).jspdf;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Relatorio Financeiro - BeautyTech", 14, 20);
    doc.setFontSize(11);
    doc.text(`Gerado em: ${new Date().toLocaleDateString("pt-BR")}`, 14, 28);
    doc.text(`Receitas: R$ ${Number(summary.revenue).toFixed(2)}  |  Despesas: R$ ${Number(summary.expenses).toFixed(2)}  |  Lucro: R$ ${Number(summary.profit).toFixed(2)}`, 14, 36);
    const rows = filtered.map((t: any) => [
      t.description,
      t.type === "revenue" ? "Receita" : "Despesa",
      t.status === "confirmed" ? "Pago" : "Pendente",
      t.paymentMethod ? (PAYMENT_LABEL[t.paymentMethod] ?? t.paymentMethod) : "-",
      t.dueDate ? new Date(t.dueDate).toLocaleDateString("pt-BR") : "-",
      `R$ ${Number(t.amount).toFixed(2)}`,
    ]);
    (doc as any).autoTable({
      head: [["Descricao", "Tipo", "Status", "Forma", "Vencimento", "Valor"]],
      body: rows,
      startY: 44,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [180, 90, 80] },
    });
    doc.save(`financeiro_${new Date().toISOString().split("T")[0]}.pdf`);
  };

  useEffect(() => {
    crmApi.leads()
      .then((r: any) => setData(r.data ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const saveLead = async () => {
    setSaving(true);
    try {
      const r: any = await crmApi.create(form);
      setData(d => [...d, r.data]);
      setShowForm(false);
      setForm({ name:"", whatsapp:"", source:"instagram", serviceInterest:"", estimatedValue:"" });
    } catch(e: any) { alert("Erro: " + e.message); } finally { setSaving(false); }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const r: any = await crmApi.update(id, { status });
      setData(d => d.map((l: any) => l.id === id ? r.data : l));
    } catch(e) { console.error(e); }
  };

  const byStatus = (s: string) => data.filter((l: any) => l.status === s);
  const PIPELINE = [
    { key:"new",        label:"Novos",        color: C.sapphire },
    { key:"contacted",  label:"Contatados",   color: C.gold },
    { key:"interested", label:"Interessados", color: C.rose },
    { key:"scheduled",  label:"Agendados",    color: C.sage },
    { key:"converted",  label:"Convertidos",  color: C.sage },
  ];

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:400 }}>
      <div style={{ color: C.textMuted, fontFamily: FB }}>Carregando CRM...</div>
    </div>
  );

  return (
    <div>
      <PageHeader title="CRM - Pipeline" sub={`${data.length} leads ? ${data.filter((l: any) => l.status==="converted").length} convertidos`} action={<Btn onClick={() => setShowForm(true)}>+ Novo Lead</Btn>} />
      <div style={{ display:"grid", gridTemplateColumns:"repeat(5, 1fr)", gap:12, overflowX:"auto", minWidth:800 }}>
        {PIPELINE.map(col => (
          <div key={col.key} style={{ background: C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:16, minHeight:300 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
              <div style={{ fontSize:12, fontWeight:700, color: col.color, textTransform:"uppercase", letterSpacing:"0.06em", fontFamily: FB }}>{col.label}</div>
              <div style={{ fontSize:11, background:`${col.color}20`, color: col.color, padding:"1px 8px", borderRadius:20, fontWeight:700 }}>{byStatus(col.key).length}</div>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {byStatus(col.key).map((lead: any, i: number) => (
                <div key={i} style={{ background: C.surface, borderRadius:10, padding:12, border:`1px solid ${C.border}` }}>
                  <div style={{ fontWeight:600, color: C.text, fontSize:12, marginBottom:4 }}>{lead.name}</div>
                  <div style={{ fontSize:11, color: C.textMuted, marginBottom:6 }}>{lead.serviceInterest} ? {brl(lead.estimatedValue)}</div>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                    <Badge label={SOURCE_LABEL[lead.source] ?? lead.source} color={C.rose} small />
                    <a href={`https://wa.me/55${lead.whatsapp?.replace(/\D/g,"")}`} target="_blank" style={{ fontSize:10, color: C.sage, fontWeight:700, textDecoration:"none" }}>WA</a>
                  </div>
                  {col.key !== "converted" && (
                    <select onChange={e => updateStatus(lead.id, e.target.value)} value={lead.status}
                      style={{ width:"100%", fontSize:10, padding:"3px 6px", background: C.border, border:"none", borderRadius:6, color: C.text, cursor:"pointer" }}>
                      <option value="new">Novo</option>
                      <option value="contacted">Contatado</option>
                      <option value="interested">Interessado</option>
                      <option value="scheduled">Agendado</option>
                      <option value="converted">Convertido</option>
                      <option value="lost">Perdido</option>
                    </select>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Novo Lead">
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:4 }}>
          <Inp label="Nome" value={form.name} onChange={f("name")} required placeholder="Maria da Silva" grid="1/-1" />
          <Inp label="WhatsApp" value={form.whatsapp} onChange={f("whatsapp")} placeholder="(34) 99999-0000" />
          <Sel label="Origem" value={form.source} onChange={f("source")} options={Object.entries(SOURCE_LABEL).map(([v,l]) => ({ value:v, label:String(l) }))} />
          <Inp label="Interesse" value={form.serviceInterest} onChange={f("serviceInterest")} placeholder="Coloracao" />
          <Inp label="Valor estimado" value={form.estimatedValue} onChange={f("estimatedValue")} type="number" placeholder="280.00" />
        </div>
        <div style={{ display:"flex", gap:10, marginTop:8 }}>
          <Btn variant="secondary" onClick={() => setShowForm(false)}>Cancelar</Btn>
          <Btn onClick={saveLead} disabled={saving}>{saving ? "Salvando..." : "Adicionar Lead"}</Btn>
        </div>
      </Modal>
    </div>
  );
}

// --- FIDELIDADE -----------------------------------------------
function FidelityPage() {
  const [clientsData, setClientsData] = useState<any[]>([]);
  const tiers = ["bronze","silver","gold","platinum","diamond"];

  useEffect(() => {
    clientsApi.list({ limit: 200 })
      .then((r: any) => setClientsData(r.data ?? []))
      .catch(console.error);
  }, []);

  return (
    <div>
      <PageHeader title="Fidelidade" sub="Programa de pontos e beneficios" />
      <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:12, marginBottom:28 }}>
        {tiers.map(t => {
          const l = LOYALTY[t];
          const count = clientsData.filter((c: any) => c.loyaltyTier === t).length;
          return (
            <div key={t} style={{ background: C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:20, textAlign:"center" }}>
              <div style={{ fontSize:28, marginBottom:8 }}>{t==="diamond"?"?":t==="platinum"?"?":t==="gold"?"?":t==="silver"?"?":"?"}</div>
              <div style={{ fontSize:13, fontWeight:700, color: l.color, fontFamily: FD }}>{l.label}</div>
              <div style={{ fontSize:24, fontWeight:700, color: C.text, margin:"6px 0", fontFamily: FD }}>{count}</div>
              <div style={{ fontSize:11, color: C.textMuted }}>clientes</div>
            </div>
          );
        })}
      </div>
      <div style={{ background: C.card, border:`1px solid ${C.border}`, borderRadius:20, overflow:"hidden" }}>
        <div style={{ padding:"16px 20px", borderBottom:`1px solid ${C.border}`, fontSize:15, fontWeight:700, color: C.text, fontFamily: FD }}>Ranking de Clientes</div>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
          <thead>
            <tr style={{ background: C.surface }}>
              {["#","Cliente","Tier","Pontos","LTV","Visitas","Acao"].map(h => (
                <th key={h} style={{ padding:"10px 16px", textAlign:"left", color: C.textMuted, fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.07em", fontFamily: FB }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...clientsData].sort((a,b) => (b.loyaltyPoints ?? 0) - (a.loyaltyPoints ?? 0)).map((c: any, i: number) => {
              const l = LOYALTY[c.loyaltyTier];
              return (
                <tr key={c.id} style={{ borderBottom:`1px solid ${C.border}` }}>
                  <td style={{ padding:"12px 16px", color: C.textMuted, fontFamily: FB, fontWeight:700 }}>#{i+1}</td>
                  <td style={{ padding:"12px 16px", fontFamily: FB }}>
                    <div style={{ fontWeight:600, color: C.text, display:"flex", alignItems:"center", gap:6 }}>
                      {c.fullName} {c.isVip && <Badge label="VIP" color={C.gold} small />}
                    </div>
                  </td>
                  <td style={{ padding:"12px 16px" }}><Badge label={l?.label ?? "-"} color={l?.color ?? C.textMuted} /></td>
                  <td style={{ padding:"12px 16px", fontWeight:700, color: C.rose, fontFamily: FB }}>{(c.loyaltyPoints ?? 0).toLocaleString("pt-BR")} pts</td>
                  <td style={{ padding:"12px 16px", fontWeight:700, color: C.gold, fontFamily: FB }}>{brl(c.totalSpent)}</td>
                  <td style={{ padding:"12px 16px", color: C.textSec, fontFamily: FB }}>{c.totalVisits ?? 0}</td>
                  <td style={{ padding:"12px 16px" }}>
                    <a href={`https://wa.me/55${c.whatsapp?.replace(/\D/g,"")}`} target="_blank" style={{ fontSize:11, color: C.sage, fontWeight:700, padding:"4px 10px", border:`1px solid ${C.sage}40`, borderRadius:8, textDecoration:"none" }}>Contatar</a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SuperAdminApp() {
  const [token, setToken]     = useState<string | null>(() => sessionStorage.getItem("sa_token"));
  const [email, setEmail]     = useState("superadmin@beautytech.com.br");
  const [password, setPassword] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const login = async () => {
    setLoading(true); setError("");
    try {
      const base = import.meta.env["VITE_API_URL"];
      const res = await fetch(`${base}/api/v1/super-admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      sessionStorage.setItem("sa_token", json.data.token);
      setToken(json.data.token);
    } catch(e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => { sessionStorage.removeItem("sa_token"); setToken(null); };

  if (!token) return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:FB, padding:20 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Outfit:wght@300;400;500;600;700&display=swap');`}</style>
      <div style={{ width:"100%", maxWidth:400 }}>
        <div style={{ textAlign:"center", marginBottom:40 }}>
          <div style={{ fontSize:12, letterSpacing:"0.3em", color:C.gold, textTransform:"uppercase", marginBottom:8 }}>Acesso Restrito</div>
          <div style={{ fontSize:36, fontWeight:700, color:C.text, fontFamily:FD }}>Super Admin</div>
          <div style={{ fontSize:13, color:C.textMuted, marginTop:6 }}>BeautyTech Enterprise v2</div>
        </div>
        <div style={{ background:C.card, border:`1px solid ${C.borderHi}`, borderRadius:24, padding:32 }}>
          <Inp label="E-mail" value={email} onChange={setEmail} type="email" />
          <Inp label="Senha" value={password} onChange={setPassword} type="password" placeholder="????????" />
          {error && <div style={{ background:`${C.ruby}15`, border:`1px solid ${C.ruby}30`, borderRadius:10, padding:"10px 14px", color:C.ruby, fontSize:12, marginBottom:16 }}>{error}</div>}
          <Btn full onClick={login} disabled={loading} variant="gold">{loading ? "Entrando..." : "Entrar como Super Admin"}</Btn>
          <div style={{ textAlign:"center", marginTop:16 }}>
            <a href="/" style={{ fontSize:12, color:C.textMuted, textDecoration:"none" }}>? Voltar ao sistema</a>
          </div>
        </div>
      </div>
    </div>
  );

  return <SuperAdminDashboard token={token} onLogout={logout} />;
}

function SuperAdminDashboard({ token, onLogout }: any) {
  const [stats, setStats]     = useState<any>(null);
  const [tenants, setTenants] = useState<any[]>([]);
  const [search, setSearch]   = useState("");
  const [filter, setFilter]   = useState("all");
  const [selected, setSelected] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [trialDays, setTrialDays] = useState("15");
  const [whatsappMode, setWhatsappMode] = useState("manual");
  const [whatsappUrl, setWhatsappUrl]   = useState("");
  const [whatsappKey, setWhatsappKey]   = useState("");

  const base = import.meta.env["VITE_API_URL"];

  const saFetch = async (method: string, endpoint: string, body?: any) => {
    const res = await fetch(`${base}/api/v1${endpoint}`, {
      method,
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: body ? JSON.stringify(body) : undefined,
    });
    return res.json();
  };

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (filter !== "all") params.set("status", filter);
      const qs = params.toString();
      const [s, t] = await Promise.all([
        saFetch("GET", "/super-admin/stats"),
        saFetch("GET", `/super-admin/tenants${qs ? "?" + qs : ""}`),
      ]);
      setStats(s.data);
      setTenants(t.data ?? []);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [search, filter]);

  const block = async (id: string) => {
    await saFetch("POST", `/super-admin/tenants/${id}/block`);
    load();
  };

  const unblock = async (id: string) => {
    await saFetch("POST", `/super-admin/tenants/${id}/unblock`);
    load();
  };

  const extendTrial = async (id: string) => {
    setSaving(true);
    await saFetch("POST", `/super-admin/tenants/${id}/extend-trial`, { days: Number(trialDays) });
    setSaving(false);
    setSelected(null);
    load();
  };


  const saveWhatsappMode = async (id: string) => {
    console.log("SAVE id:", id, "mode:", whatsappMode, "token:", token?.substring(0,20));
    try {
      await saFetch("PATCH", "/super-admin/tenants/" + id + "/whatsapp-mode", {
        whatsapp_mode: whatsappMode,
        whatsapp_api_url: whatsappUrl || null,
        whatsapp_api_key: whatsappKey || null,
      });
      load();
    } catch(e) { console.error(e); }
    finally { setSaving(false); }
  };

  const deleteTenant = async (id: string, name: string) => {
    if (!window.confirm(`Tem certeza que deseja DELETAR o salao "${name}"? Esta acao nao pode ser desfeita.`)) return;
    await saFetch("DELETE", `/super-admin/tenants/${id}`);
    load();
  };
  const TRIAL_STATUS: any = {
    trial:   { label:"Trial",    color: C.gold },
    active:  { label:"Ativo",    color: C.sage },
    expired: { label:"Expirado", color: C.ruby },
    blocked: { label:"Bloqueado",color: C.textMuted },
  };

  const filters = [
    { v:"all",     l:"Todos" },
    { v:"trial",   l:"Trial" },
    { v:"active",  l:"Ativos" },
    { v:"expired", l:"Expirados" },
    { v:"blocked", l:"Bloqueados" },
  ];

  const cols = [
    { key:"name", label:"Salao", render: (t: any) => (
      <div>
        <div style={{ fontWeight:700, color:C.text, fontFamily:FB }}>{t.name}</div>
        <div style={{ fontSize:11, color:C.textMuted }}>{t.email}</div>
        {t.phone && <div style={{ fontSize:11, color:C.textMuted }}>{t.phone}</div>}
      </div>
    )},
    { key:"trialStatus", label:"Status", render: (t: any) => {
      const s = TRIAL_STATUS[t.trialStatus];
      return <Badge label={s?.label ?? t.trialStatus} color={s?.color ?? C.textMuted} />;
    }},
    { key:"planTier", label:"Plano", render: (t: any) => <Badge label={t.planTier} color={C.sapphire} /> },
    { key:"daysLeft", label:"Dias Restantes", render: (t: any) => (
      <span style={{ fontWeight:700, color: t.daysLeft > 5 ? C.sage : t.daysLeft > 0 ? C.gold : C.ruby }}>
        {t.daysLeft !== null ? `${t.daysLeft} dias` : "-"}
      </span>
    )},
    { key:"trialEndsAt", label:"Vencimento", render: (t: any) => <span style={{ fontSize:12, color:C.textMuted }}>{fmtDate(t.trialEndsAt)}</span> },
    { key:"createdAt", label:"Cadastro", render: (t: any) => <span style={{ fontSize:12, color:C.textMuted }}>{fmtDate(t.createdAt)}</span> },
    { key:"action", label:"Acoes", render: (t: any) => (
      <div style={{ display:"flex", gap:6 }}>
        <Btn small onClick={(e: any) => { e.stopPropagation(); setSelected(t); setTrialDays("15"); setWhatsappMode(t.whatsapp_mode ?? "manual"); setWhatsappUrl(t.whatsapp_api_url ?? ""); setWhatsappKey(t.whatsapp_api_key ?? ""); }}>Gerenciar</Btn>
        {t.isActive
          ? <Btn small variant="danger" onClick={(e: any) => { e.stopPropagation(); block(t.id); }}>Bloquear</Btn>
          : <Btn small variant="gold"   onClick={(e: any) => { e.stopPropagation(); unblock(t.id); }}>Liberar</Btn>
        }
        <Btn small variant="danger" onClick={(e: any) => { e.stopPropagation(); deleteTenant(t.id, t.name); }}>Deletar</Btn>
      </div>
    )},
  ];

  return (
    <div style={{ minHeight:"100vh", background:C.bg, fontFamily:FB }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Outfit:wght@300;400;500;600;700&display=swap'); * { box-sizing:border-box; margin:0; padding:0; } body { background:${C.bg}; }`}</style>

      {/* Header */}
      <div style={{ background:C.card, borderBottom:`1px solid ${C.border}`, padding:"16px 32px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ display:"flex", alignItems:"center", gap:16 }}>
          <div style={{ fontSize:20, fontWeight:700, color:C.text, fontFamily:FD }}>BeautyTech</div>
          <Badge label="SUPER ADMIN" color={C.gold} />
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:16 }}>
          <a href="/" style={{ fontSize:12, color:C.textMuted, textDecoration:"none" }}>? Sistema</a>
          <button onClick={onLogout} style={{ background:"none", border:"none", color:C.ruby, fontSize:12, cursor:"pointer", fontFamily:FB }}>Sair</button>
        </div>
      </div>

      <div style={{ padding:32 }}>
        <PageHeader title="Painel Super Admin" sub="Gestao de saloes, trials e acessos" />

        {/* KPIs */}
        {stats && (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(160px,1fr))", gap:16, marginBottom:28 }}>
            <KpiCard icon="Sal" label="Total Saloes"  value={stats.totalTenants}   color={C.text} />
            <KpiCard icon="Atv" label="Ativos"         value={stats.activeTenants}  color={C.sage} />
            <KpiCard icon="Tri" label="Em Trial"       value={stats.trialTenants}   color={C.gold} />
            <KpiCard icon="Blq" label="Bloqueados"     value={stats.blockedTenants} color={C.ruby} />
            <KpiCard icon="Cli" label="Total Clientes" value={stats.totalClients}   color={C.sapphire} />
            <KpiCard icon="Agt" label="Agendamentos"   value={stats.totalAppts}     color={C.rose} />
          </div>
        )}

        {/* Filtros e busca */}
        <div style={{ display:"flex", gap:12, marginBottom:20, flexWrap:"wrap", alignItems:"center" }}>
          <Search value={search} onChange={setSearch} placeholder="Buscar salao..." />
          <div style={{ display:"flex", gap:6 }}>
            {filters.map(f => (
              <button key={f.v} onClick={() => setFilter(f.v)}
                style={{ padding:"7px 14px", borderRadius:8, border:`1px solid ${filter===f.v?C.gold:C.border}`, background:filter===f.v?`${C.gold}15`:C.card, color:filter===f.v?C.gold:C.textMuted, fontSize:12, cursor:"pointer", fontFamily:FB, fontWeight:600 }}>{f.l}</button>
            ))}
          </div>
          <Btn small variant="secondary" onClick={load}>? Atualizar</Btn>
        </div>

        {loading
          ? <div style={{ textAlign:"center", padding:60, color:C.textMuted }}>Carregando...</div>
          : <Table cols={cols} rows={tenants} onRow={t => { setSelected(t); setTrialDays("15"); setWhatsappMode(t.whatsapp_mode ?? "manual"); setWhatsappUrl(t.whatsapp_api_url ?? ""); setWhatsappKey(t.whatsapp_api_key ?? ""); }} emptyMsg="Nenhum salao encontrado." />
        }
      </div>

      {/* Modal Gerenciar Tenant */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title={`Gerenciar: ${selected?.name}`} width={480}>
        {selected && (
          <div>
            {/* Info */}
            <div style={{ background:C.surface, borderRadius:12, padding:16, marginBottom:20 }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <div>
                  <div style={{ fontSize:10, color:C.textMuted, textTransform:"uppercase", marginBottom:4 }}>Status</div>
                  <Badge label={TRIAL_STATUS[selected.trialStatus]?.label ?? selected.trialStatus} color={TRIAL_STATUS[selected.trialStatus]?.color ?? C.rose} />
                </div>
                <div>
                  <div style={{ fontSize:10, color:C.textMuted, textTransform:"uppercase", marginBottom:4 }}>Plano</div>
                  <Badge label={selected.planTier} color={C.sapphire} />
                </div>
                <div>
                  <div style={{ fontSize:10, color:C.textMuted, textTransform:"uppercase", marginBottom:4 }}>Dias Restantes</div>
                  <div style={{ fontWeight:700, color: selected.daysLeft > 0 ? C.gold : C.ruby }}>{selected.daysLeft ?? "-"} dias</div>
                </div>
                <div>
                  <div style={{ fontSize:10, color:C.textMuted, textTransform:"uppercase", marginBottom:4 }}>Vencimento</div>
                  <div style={{ fontSize:13, color:C.text }}>{fmtDate(selected.trialEndsAt)}</div>
                </div>
              </div>
            </div>

            {/* Estender Trial */}
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:12 }}>? Estender / Definir Trial</div>
              <div style={{ display:"flex", gap:10, alignItems:"flex-end" }}>
                <Inp label="Dias de trial" value={trialDays} onChange={setTrialDays} type="number" placeholder="15" />
                <Btn variant="gold" onClick={() => extendTrial(selected.id)} disabled={saving}>
                  {saving ? "Salvando..." : "Aplicar"}
                </Btn>
              </div>
              <div style={{ fontSize:11, color:C.textMuted, marginTop:4 }}>
                Define um novo periodo de trial a partir de hoje.
              </div>
            {/* WhatsApp Mode */}
            <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:16, marginBottom:16 }}>
              <div style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:12 }}>WhatsApp - Modo de Conexao</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:12 }}>
                {["manual","local","zapi","cloud"].map((m: string) => (
                  <button key={m} onClick={() => setWhatsappMode(m)}
                    style={{ padding:"10px 8px", borderRadius:10, border:`2px solid ${whatsappMode===m?C.gold:C.border}`, background:whatsappMode===m?`${C.gold}15`:C.card, color:whatsappMode===m?C.gold:C.textMuted, fontSize:12, cursor:"pointer", fontFamily:FB, fontWeight:700, textTransform:"uppercase" }}>
                    {m === "manual" ? "Manual" : m === "local" ? "Local" : m === "zapi" ? "Z-API" : "Cloud"}
                  </button>
                ))}
              </div>
              {(whatsappMode === "local" || whatsappMode === "zapi") && (
                <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:12 }}>
                  <Inp label="URL da API" value={whatsappUrl} onChange={setWhatsappUrl} placeholder="https://..." />
                  <Inp label="API Key" value={whatsappKey} onChange={setWhatsappKey} placeholder="sua-chave" />
                </div>
              )}
              <div style={{ fontSize:11, color:C.textMuted, marginBottom:12 }}>
                {whatsappMode==="manual" && "Sem automacao WhatsApp."}
                {whatsappMode==="local" && "Evolution API no VPS do salao."}
                {whatsappMode==="zapi" && "Z-API SaaS. Informe URL e token."}
                {whatsappMode==="cloud" && "Evolution API no seu VPS Hostinger."}
              </div>
              <Btn variant="gold" full onClick={() => saveWhatsappMode(selected.id)} disabled={saving}>
                {saving ? "Salvando..." : "Salvar WhatsApp"}
              </Btn>
            </div>
            </div>

            {/* Bloquear / Liberar */}
            <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:16 }}>
              <div style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:12 }}>? Acesso</div>
              <div style={{ display:"flex", gap:10 }}>
                {selected.isActive
                  ? <Btn variant="danger" full onClick={() => { block(selected.id); setSelected(null); }}>Bloquear Acesso</Btn>
                  : <Btn variant="gold"   full onClick={() => { unblock(selected.id); setSelected(null); }}>Liberar Acesso</Btn>
                }
              </div>
            </div>
          </div>
        )}
      </Modal>
      <PlanSettingsPanel saFetch={saFetch} />
    </div>
  );
}


// --- NOTIFICA??ES ---------------------------------------------
function NotificationsPage() {
  const [data, setData]       = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState("all");
  const [page, setPage]       = useState(1);
  const [total, setTotal]     = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [modalClient, setModalClient] = useState('');
  const [modalMsg, setModalMsg]   = useState('');
  const [modalSending, setModalSending] = useState(false);
  const [clients2, setClients2]   = useState<any[]>([]);
  const [templates2, setTemplates2] = useState<any[]>([]);
  const load = async (p = 1, f = filter) => {
    setLoading(true);
    try {
      const params: any = { page: p, limit: 20 };
      if (f !== "all") params.status = f;
      const r: any = await api.get<any>("/automations/notifications", params);
      setData(r.data ?? []);
      setTotal(r.total ?? 0);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openModal = async () => {
    setShowModal(true);
    setModalClient(''); setModalMsg('');
    try {
      const [c, t]: any = await Promise.all([
        api.get<any>('/clients'),
        api.get<any>('/automations/templates'),
      ]);
      setClients2(c.data ?? []);
      setTemplates2(t.data ?? []);
    } catch(e) { console.error(e); }
  };
  const sendManual = async () => {
    if (!modalClient || !modalMsg) return;
    setModalSending(true);
    try {
      await api.post<any>('/automations/notifications/send-manual', { clientId: modalClient, message: modalMsg });
      setShowModal(false);
      load();
    } catch(e) { console.error(e); }
    finally { setModalSending(false); }
  };
  const markSent = async (id: string) => {
    try {
      await api.post<any>(`/automations/notifications/${id}/sent`);
      setData(d => d.map((item: any) =>
        item.notification?.id === id
          ? { ...item, notification: { ...item.notification, status: "sent" } }
          : item
      ));
    } catch(e) { console.error(e); }
  };

  const STATUS_COLOR: any = {
    pending: C.gold,
    sent:    C.sage,
    failed:  C.ruby,
  };

  const STATUS_LABEL: any = {
    pending: "Pendente",
    sent:    "Enviado",
    failed:  "Falhou",
  };

  const TRIGGER_LABEL: any = {
    appointment_reminder_24h: "Lembrete 24h",
    appointment_reminder_2h:  "Lembrete 2h",
    appointment_confirmed:    "Confirmacao",
    appointment_completed:    "Pos-atendimento",
    birthday:                 "Aniversario",
    client_reactivation:      "Reativacao",
    satisfaction_survey:      "Pesquisa",
    promotion:                "Promocao",
    financial_reminder:       "Financeiro",
    welcome:                  "Boas-vindas",
  };

  const filters = [
    { v:"all",     l:"Todas" },
    { v:"pending", l:"Pendentes" },
    { v:"sent",    l:"Enviadas" },
    { v:"failed",  l:"Falhas" },
  ];

  const cols = [
    { key:"client", label:"Cliente", render: (item: any) => (
      <div>
        <div style={{ fontWeight:600, color:C.text }}>{item.client?.fullName ?? "-"}</div>
        <div style={{ fontSize:11, color:C.textMuted }}>{item.client?.whatsapp}</div>
      </div>
    )},
    { key:"message", label:"Mensagem", render: (item: any) => (
      <div style={{ maxWidth:300, fontSize:12, color:C.textSec, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
        {item.notification?.message}
      </div>
    )},
    { key:"status", label:"Status", render: (item: any) => {
      const s = item.notification?.status;
      return <Badge label={STATUS_LABEL[s] ?? s} color={STATUS_COLOR[s] ?? C.textMuted} />;
    }},
    { key:"channel", label:"Canal", render: () => <Badge label="WhatsApp" color={C.sage} /> },
    { key:"createdAt", label:"Gerado em", render: (item: any) => (
      <span style={{ fontSize:11, color:C.textMuted }}>{fmtDate(item.notification?.createdAt)}</span>
    )},
    { key:"action", label:"Acoes", render: (item: any) => (
      <div style={{ display:"flex", gap:6 }}>
        {item.notification?.status === "pending" && (
          <>
            <a
              href={`https://wa.me/55${item.client?.whatsapp?.replace(/\D/g,"")}?text=${encodeURIComponent(item.notification?.message ?? "")}`}
              target="_blank"
              onClick={() => markSent(item.notification.id)}
              style={{ fontSize:11, color:C.sage, fontWeight:700, padding:"5px 10px", border:`1px solid ${C.sage}40`, borderRadius:8, textDecoration:"none" }}
            >? Enviar</a>
            <Btn small variant="secondary" onClick={(e: any) => { e.stopPropagation(); markSent(item.notification.id); }}>? Marcar</Btn>
          </>
        )}
        {item.notification?.status === "sent" && (
          <span style={{ fontSize:11, color:C.sage }}>? Enviado</span>
        )}
        {item.notification?.status === 'failed' && (
          <Btn small variant='danger' onClick={(e: any) => { e.stopPropagation(); api.post('/automations/notifications/' + item.notification.id + '/retry').then(() => load()); }}>Reenviar</Btn>
        )}
      </div>
    )},
  ];

  return (
    <div>
      <PageHeader
        title="Notificacoes"
        sub={`${total} notificacoes geradas pelo sistema`}
        action={<div style={{display:'flex',gap:8}}><Btn small onClick={openModal}>+ Nova Mensagem</Btn><Btn small variant='secondary' onClick={() => load(1, filter)}>Atualizar</Btn></div>}
      />

      {showModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background:C.card, border:'1px solid ' + C.borderHi, borderRadius:20, padding:32, width:'100%', maxWidth:480, fontFamily:FB }}>
            <div style={{ fontSize:18, fontWeight:700, color:C.text, marginBottom:20 }}>Nova Mensagem WhatsApp</div>
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:12, color:C.textMuted, marginBottom:6 }}>Cliente</div>
              <select value={modalClient} onChange={(e:any) => setModalClient(e.target.value)} style={{ width:'100%', padding:'10px 14px', background:C.surface, border:'1px solid ' + C.border, borderRadius:10, color:C.text, fontSize:13, fontFamily:FB }}>
                <option value=''>Selecione um cliente...</option>
                {clients2.map((c:any) => <option key={c.id} value={c.id}>{c.fullName} - {c.whatsapp}</option>)}
              </select>
            </div>
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:12, color:C.textMuted, marginBottom:6 }}>Template rapido</div>
              <select onChange={(e:any) => { if(e.target.value) setModalMsg(e.target.value); }} style={{ width:'100%', padding:'10px 14px', background:C.surface, border:'1px solid ' + C.border, borderRadius:10, color:C.text, fontSize:13, fontFamily:FB }}>
                <option value=''>Escolher template...</option>
                {templates2.map((t:any) => <option key={t.id} value={t.message}>{t.name}</option>)}
              </select>
            </div>
            <div style={{ marginBottom:24 }}>
              <div style={{ fontSize:12, color:C.textMuted, marginBottom:6 }}>Mensagem</div>
              <textarea value={modalMsg} onChange={(e:any) => setModalMsg(e.target.value)} rows={4} placeholder='Digite a mensagem...' style={{ width:'100%', padding:'10px 14px', background:C.surface, border:'1px solid ' + C.border, borderRadius:10, color:C.text, fontSize:13, fontFamily:FB, resize:'vertical' }} />
            </div>
            <div style={{ display:'flex', gap:12, justifyContent:'flex-end' }}>
              <Btn variant='secondary' onClick={() => setShowModal(false)}>Cancelar</Btn>
              <Btn onClick={sendManual} disabled={!modalClient || !modalMsg || modalSending}>{modalSending ? 'Enviando...' : 'Enviar Mensagem'}</Btn>
            </div>
          </div>
        </div>
      )}
      {/* Aviso */}
      <div style={{ background:`${C.sapphire}12`, border:`1px solid ${C.sapphire}30`, borderRadius:12, padding:"12px 20px", marginBottom:24, display:"flex", alignItems:"center", gap:12, fontFamily:FB }}>
        <span style={{ fontSize:20 }}>?</span>
        <div>
          <div style={{ fontWeight:700, color:C.sapphire, fontSize:13 }}>Geradas automaticamente pelo scheduler</div>
          <div style={{ fontSize:11, color:C.textMuted }}>Clique em "Enviar" para abrir o WhatsApp com a mensagem pronta. O status sera marcado como enviado automaticamente.</div>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display:"flex", gap:8, marginBottom:20 }}>
        {filters.map(f => (
          <button key={f.v} onClick={() => { setFilter(f.v); load(1, f.v); }}
            style={{ padding:"7px 16px", borderRadius:8, border:`1px solid ${filter===f.v?C.rose:C.border}`, background:filter===f.v?`${C.rose}15`:C.card, color:filter===f.v?C.rose:C.textMuted, fontSize:12, cursor:"pointer", fontFamily:FB, fontWeight:600 }}>{f.l}</button>
        ))}
      </div>

      {loading
        ? <div style={{ textAlign:"center", padding:60, color:C.textMuted, fontFamily:FB }}>Carregando...</div>
        : <Table cols={cols} rows={data} emptyMsg="Nenhuma notificacao encontrada." />
      }

      {/* Paginacao */}
      {total > 20 && (
        <div style={{ display:"flex", justifyContent:"center", gap:8, marginTop:20 }}>
          <Btn small variant="secondary" disabled={page === 1} onClick={() => { setPage(p => p-1); load(page-1); }}>? Anterior</Btn>
          <span style={{ color:C.textMuted, fontSize:12, padding:"7px 14px", fontFamily:FB }}>Pagina {page}</span>
          <Btn small variant="secondary" disabled={data.length < 20} onClick={() => { setPage(p => p+1); load(page+1); }}>Proxima ?</Btn>
        </div>
      )}
    </div>
  );
}

// --- AUTOMA??ES -----------------------------------------------

// --- AUTOMATION SETTINGS ------------------------------------
function AutomationSettings() {
  const defaultSettings = {
    reminder_24h_enabled: true, reminder_24h_hours: 24,
    reminder_2h_enabled: true,  reminder_2h_hours: 2,
    birthday_enabled: true,     birthday_hour: 9,
    reactivation_enabled: true, reactivation_days: 30,
    post_service_enabled: true, post_service_hours: 2,
  };
  const [settings, setSettings] = useState<any>(defaultSettings);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const s = (k: string) => (v: any) => setSettings((p: any) => ({ ...p, [k]: v }));

  useEffect(() => {
    api.get<any>("/automations/settings")
      .then((r: any) => { if (r.data) setSettings(r.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await api.post<any>("/automations/settings", settings);
      alert("Configuracoes salvas com sucesso!");
    } catch(e: any) { alert("Erro: " + e.message); }
    finally { setSaving(false); }
  };

  const Toggle = ({ value, onChange, label }: any) => (
    <button onClick={() => onChange(!value)} style={{ display:"flex", alignItems:"center", gap:8, background:"none", border:"none", cursor:"pointer", padding:0 }}>
      <div style={{ width:36, height:20, borderRadius:10, background: value ? C.sage : C.border, position:"relative", transition:"background .2s", flexShrink:0 }}>
        <div style={{ width:14, height:14, borderRadius:"50%", background:"#fff", position:"absolute", top:3, left: value ? 19 : 3, transition:"left .2s" }} />
      </div>
      <span style={{ fontSize:13, color: value ? C.text : C.textMuted, fontFamily:FB }}>{label}</span>
    </button>
  );

  const NumInp = ({ label, value, onChange, min, max, unit }: any) => (
    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
      <span style={{ fontSize:12, color:C.textMuted, fontFamily:FB, minWidth:120 }}>{label}</span>
      <input type="number" value={value} min={min} max={max}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width:70, padding:"6px 10px", background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, color:C.text, fontSize:13, outline:"none", fontFamily:FB, textAlign:"center" }}
      />
      <span style={{ fontSize:12, color:C.textMuted, fontFamily:FB }}>{unit}</span>
    </div>
  );

  if (loading) return <div style={{ color:C.textMuted, fontFamily:FB }}>Carregando...</div>;

  const configs = [
    {
      title:"Lembrete de Agendamento",
      icon:"[L]",
      items: [
        { type:"toggle", label:"Lembrete 24h antes", key:"reminder_24h_enabled" },
        { type:"num", label:"Horas antes:", key:"reminder_24h_hours", unit:"horas", min:1, max:48 },
        { type:"toggle", label:"Lembrete 2h antes", key:"reminder_2h_enabled" },
        { type:"num", label:"Horas antes:", key:"reminder_2h_hours", unit:"horas", min:1, max:12 },
      ]
    },
    {
      title:"Aniversario",
      icon:"[A]",
      items: [
        { type:"toggle", label:"Mensagem de aniversario", key:"birthday_enabled" },
        { type:"num", label:"Horario de envio:", key:"birthday_hour", unit:"horas (0-23)", min:0, max:23 },
      ]
    },
    {
      title:"Reativacao de Clientes",
      icon:"[R]",
      items: [
        { type:"toggle", label:"Reativar clientes inativos", key:"reactivation_enabled" },
        { type:"num", label:"Dias sem visita:", key:"reactivation_days", unit:"dias", min:7, max:180 },
      ]
    },
    {
      title:"Pos-atendimento",
      icon:"[S]",
      items: [
        { type:"toggle", label:"Mensagem apos atendimento", key:"post_service_enabled" },
        { type:"num", label:"Horas apos:", key:"post_service_hours", unit:"horas", min:1, max:24 },
      ]
    },
  ];

  return (
    <div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(300px,1fr))", gap:16, marginBottom:24 }}>
        {configs.map((group: any) => (
          <div key={group.title} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:20 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:16 }}>
              <span style={{ fontSize:20 }}>{group.icon}</span>
              <div style={{ fontWeight:700, color:C.text, fontSize:14, fontFamily:FD }}>{group.title}</div>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              {group.items.map((item: any) => (
                <div key={item.key}>
                  {item.type === "toggle"
                    ? <Toggle value={settings[item.key]} onChange={s(item.key)} label={item.label} />
                    : <NumInp label={item.label} value={settings[item.key]} onChange={s(item.key)} min={item.min} max={item.max} unit={item.unit} />
                  }
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <Btn onClick={save} disabled={saving} variant="gold">
        {saving ? "Salvando..." : "Salvar Configuracoes"}
      </Btn>
    </div>
  );
}

function AutomationsPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState<any>(null);
  const [showEdit, setShowEdit]   = useState(false);
  const [showNew, setShowNew]     = useState(false);
  const [newTpl, setNewTpl]       = useState({ name:"", trigger:"custom", message:"" });
  const [saving, setSaving]       = useState(false);
  const [showSend, setShowSend]   = useState(false);
  const [editMsg, setEditMsg]     = useState("");

  // Envio avancado
  const [allClients, setAllClients] = useState<any[]>([]);
  const [search, setSearch]         = useState("");
  const [segFilter, setSegFilter]   = useState("all");
  const [birthdayFilter, setBirthdayFilter] = useState(false);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [sending, setSending]       = useState(false);

  useEffect(() => {
    Promise.all([
      api.get<any>("/automations/templates"),
      clientsApi.list({ limit: 500 }),
    ]).then(([t, c]: any) => {
      setTemplates(t.data ?? []);
      setAllClients(c.data ?? []);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const save = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const r: any = await api.patch<any>(`/automations/templates/${selected.id}`, { message: editMsg, isActive: selected.isActive });
      setTemplates(ts => ts.map(t => t.id === selected.id ? r.data : t));
      setShowEdit(false);
    } catch(e: any) { alert("Erro: " + e.message); }
    finally { setSaving(false); }
  };

  const toggleActive = async (t: any) => {
    const r: any = await api.patch<any>(`/automations/templates/${t.id}`, { isActive: !t.isActive });
    setTemplates(ts => ts.map(x => x.id === t.id ? r.data : x));
  };

  // Filtro de clientes
  const now = new Date();
  const month = now.getMonth() + 1;
  const filteredClients = allClients.filter((c: any) => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      c.fullName?.toLowerCase().includes(q) ||
      c.whatsapp?.includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.phone?.includes(q);
    const matchSeg = segFilter === "all" || c.segment === segFilter;
    const matchBirthday = !birthdayFilter ||
      (c.birthDate && new Date(c.birthDate).getMonth() + 1 === month);
    return matchSearch && matchSeg && matchBirthday;
  });

  const toggleClient = (id: string) => {
    setSelectedClients(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  };

  const selectAll = () => {
    if (selectedClients.length === filteredClients.length) {
      setSelectedClients([]);
    } else {
      setSelectedClients(filteredClients.map((c: any) => c.id));
    }
  };

  const formatMsg = (msg: string, client?: any) => {
    const nome = client?.fullName?.split(" ")[0] ?? "{nome}";
    const data = new Date().toLocaleDateString("pt-BR");
    const hora = new Date().toLocaleTimeString("pt-BR", { hour:"2-digit", minute:"2-digit" });
    return msg.replace("{nome}", nome).replace("{data}", data).replace("{hora}", hora).replace("{valor}", "R$ 0,00");
  };

  const TRIGGER_LABEL: any = {
    appointment_reminder_24h: "Lembrete 24h antes",
    appointment_reminder_2h:  "Lembrete 2h antes",
    appointment_confirmed:    "Confirmacao de Agendamento",
    appointment_completed:    "Pos-atendimento",
    birthday:                 "Aniversario",
    client_reactivation:      "Reativacao de Cliente",
    satisfaction_survey:      "Pesquisa de Satisfacao",
    promotion:                "Campanha Promocional",
    financial_reminder:       "Lembrete Financeiro",
    welcome:                  "Boas-vindas",
  };

  const TRIGGER_ICON: any = {
    appointment_reminder_24h: "Lembrete 24h antes do agendamento",
    appointment_reminder_2h:  "Lembrete 2h antes do agendamento",
    appointment_confirmed:    "Confirmacao de agendamento",
    appointment_completed:    "Agendamento concluido",
    birthday:                 "Mensagem de aniversario",
    client_reactivation:      "Reativacao de cliente inativo",
    satisfaction_survey:      "Pesquisa de satisfacao",
    promotion:                "Promocao especial",
    financial_reminder:       "Lembrete financeiro",
    welcome:                  "Boas-vindas ao salao",
  };

  const SEGS = [
    { v:"all", l:"Todos" },{ v:"new", l:"Novos" },{ v:"active", l:"Ativos" },
    { v:"vip", l:"VIP" },{ v:"loyal", l:"Fieis" },{ v:"at_risk", l:"Em Risco" },
    { v:"churned", l:"Inativos" },
  ];

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:400 }}>
      <div style={{ color:C.textMuted, fontFamily:FB }}>Carregando automacoes...</div>
    </div>
  );

  return (
    <div>
      <PageHeader title="Automacoes" sub={`${templates.length} templates de mensagens`} action={<div style={{display:"flex",gap:8}}>{templates.length === 0 && <Btn onClick={async () => { await api.post("/automations/templates/seed"); window.location.reload(); }}>Inicializar Templates</Btn>}<Btn onClick={() => setShowNew(true)}>+ Novo Template</Btn></div>} />
      <div style={{ background:`${C.gold}12`, border:`1px solid ${C.gold}30`, borderRadius:12, padding:"12px 20px", marginBottom:24, display:"flex", alignItems:"center", gap:12, fontFamily:FB }}>
        <span style={{ fontSize:20 }}>!</span>
        <div>
          <div style={{ fontWeight:700, color:C.gold, fontSize:13 }}>Configure suas automacoes</div>
          <div style={{ fontSize:11, color:C.textMuted }}>Ative o toggle para disparo automatico. Desativado = apenas envio manual.</div>
      </div>
      </div>

      {/* Grid de templates */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(340px,1fr))", gap:16 }}>
        {templates.map((t: any) => (
          <div key={t.id} style={{ background:C.card, border:`1px solid ${t.isActive ? C.borderHi : C.border}`, borderRadius:16, padding:20, position:"relative" }}>

            {/* Header com toggle */}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <span style={{ fontSize:24 }}>{TRIGGER_ICON[t.trigger] ?? "?"}</span>
                <div>
                  <div style={{ fontWeight:700, color:C.text, fontSize:14, fontFamily:FD }}>{t.name}</div>
                  <div style={{ fontSize:10, color:C.textMuted, marginTop:2 }}>{TRIGGER_LABEL[t.trigger] ?? t.trigger}</div>
                </div>
              </div>

              {/* Toggle automatico/manual */}
              <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4 }}>
                <button
                  onClick={() => toggleActive(t)}
                  style={{
                    width:44, height:24, borderRadius:12, border:"none", cursor:"pointer",
                    background: t.isActive ? C.sage : C.border,
                    position:"relative", transition:"background .2s",
                  }}
                >
                  <div style={{
                    width:18, height:18, borderRadius:"50%", background:"#fff",
                    position:"absolute", top:3,
                    left: t.isActive ? 23 : 3,
                    transition:"left .2s",
                  }} />
                </button>
                <span style={{ fontSize:9, color: t.isActive ? C.sage : C.textMuted, fontWeight:700, fontFamily:FB }}>
                  {t.isActive ? "AUTOMATICO" : "MANUAL"}
                </span>
              </div>
            </div>

            {/* Mensagem */}
            <div style={{ background:C.surface, borderRadius:10, padding:"10px 14px", fontSize:12, color:C.textSec, fontFamily:FB, lineHeight:1.6, marginBottom:14, minHeight:60 }}>
              {t.message}
            </div>

            {/* Variaveis */}
            <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:14 }}>
              {["{nome}","{data}","{hora}"].map(v => (
                <span key={v} style={{ fontSize:10, padding:"2px 8px", borderRadius:20, background:`${C.rose}15`, color:C.rose, fontFamily:FB, fontWeight:600 }}>{v}</span>
              ))}
            </div>

            {/* Acoes */}
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <Btn small variant="secondary" onClick={() => { setSelected(t); setEditMsg(t.message); setShowEdit(true); }}>Editar</Btn>
              <Btn small onClick={() => { setSelected(t); setSearch(""); setSegFilter("all"); setBirthdayFilter(false); setSelectedClients([]); setShowSend(true); }}>Enviar</Btn>
              <span style={{ fontSize:10, color: t.isActive ? C.sage : C.textMuted, marginLeft:"auto", fontFamily:FB }}>
                {t.isActive ? "Auto" : "Manual"}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Editar */}
      <Modal open={showNew} onClose={() => setShowNew(false)} title="Novo Template">
        <div style={{ display:"grid", gap:12 }}>
          <Inp label="Nome do template" value={newTpl.name} onChange={(v:string) => setNewTpl(p=>({...p,name:v}))} placeholder="Ex: Promocao de verao" />
          <div>
            <label style={{ fontSize:11, letterSpacing:"0.1em", textTransform:"uppercase", color:C.textMuted, display:"block", marginBottom:8 }}>Tipo</label>
            <select value={newTpl.trigger} onChange={e => setNewTpl(p=>({...p,trigger:e.target.value}))} style={{ width:"100%", background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:"10px 14px", color:C.text, fontFamily:FB, fontSize:14, outline:"none" }}>
              <option value="custom">Personalizado</option>
              <option value="promotion">Promocao</option>
              <option value="welcome">Boas-vindas</option>
              <option value="appointment_reminder_24h">Lembrete 24h</option>
              <option value="appointment_reminder_2h">Lembrete 2h</option>
              <option value="birthday">Aniversario</option>
              <option value="client_reactivation">Reativacao</option>
              <option value="financial_reminder">Lembrete Financeiro</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize:11, letterSpacing:"0.1em", textTransform:"uppercase", color:C.textMuted, display:"block", marginBottom:8 }}>Mensagem</label>
            <textarea value={newTpl.message} onChange={e => setNewTpl(p=>({...p,message:e.target.value}))} placeholder="Use: {nome}, {data}, {hora}, {valor}" rows={4} style={{ width:"100%", background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:"10px 14px", color:C.text, fontFamily:FB, fontSize:14, outline:"none", resize:"vertical" }} />
          </div>
          <div style={{ fontSize:12, color:C.textMuted }}>Variaveis: nome, data, hora, valor</div>
        </div>
        <div style={{ display:"flex", gap:10, marginTop:8 }}>
          <Btn variant="secondary" onClick={() => setShowNew(false)}>Cancelar</Btn>
          <Btn onClick={async () => { if (!newTpl.name || !newTpl.message) { alert("Preencha nome e mensagem."); return; } setSaving(true); try { const r: any = await api.post("/automations/templates", { name: newTpl.name, trigger: newTpl.trigger, channel: "whatsapp", message: newTpl.message }); setTemplates((p:any) => [...p, r.data]); setShowNew(false); } catch(e:any) { alert("Erro: "+e.message); } finally { setSaving(false); } }} disabled={saving}>{saving ? "Salvando..." : "Criar Template"}</Btn>
        </div>
      </Modal>
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title={`Editar: ${selected?.name}`}>
        <div style={{ marginBottom:8 }}>
          <label style={{ fontSize:11, fontWeight:700, color:C.textSec, display:"block", marginBottom:6, textTransform:"uppercase", letterSpacing:"0.05em" }}>Mensagem</label>
          <textarea
            value={editMsg}
            onChange={e => setEditMsg(e.target.value)}
            rows={5}
            style={{ width:"100%", padding:"10px 14px", background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, color:C.text, fontSize:13, outline:"none", boxSizing:"border-box", fontFamily:FB, resize:"vertical" }}
          />
        </div>
        <div style={{ fontSize:11, color:C.textMuted, marginBottom:16 }}>
          Variaveis: <span style={{ color:C.rose }}>{"{nome}"}</span>, <span style={{ color:C.rose }}>{"{data}"}</span>, <span style={{ color:C.rose }}>{"{hora}"}</span>, <span style={{ color:C.rose }}>{"{valor}"}</span>
        </div>
        <div style={{ background:C.surface, borderRadius:10, padding:"10px 14px", fontSize:12, color:C.textSec, marginBottom:16 }}>
          <div style={{ fontSize:10, color:C.textMuted, marginBottom:6, textTransform:"uppercase" }}>Preview</div>
          {formatMsg(editMsg)}
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <Btn variant="secondary" onClick={() => setShowEdit(false)}>Cancelar</Btn>
          <Btn onClick={save} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Btn>
        </div>
      </Modal>


      {/* Secao de Configuracoes */}
      <div style={{ marginTop:40 }}>
        <div style={{ fontSize:18, fontWeight:700, color:C.text, fontFamily:FD, marginBottom:20 }}>
          Variaveis: {"{nome}"}, {"{data}"}, {"{hora}"}, {"{valor}"}
        </div>
        <AutomationSettings />
      </div>
      {/* Modal Envio Manual Avancado */}
      <Modal open={showSend} onClose={() => setShowSend(false)} title={`Enviar: ${selected?.name}`} width={620}>
        {selected && (
          <div>
            {/* Busca inteligente */}
            <div style={{ marginBottom:14 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:"8px 14px", marginBottom:10 }}>
                <span style={{ color:C.textMuted }}>Buscar por nome, telefone ou email...</span>
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar por nome, telefone ou email..."
                  style={{ background:"none", border:"none", outline:"none", color:C.text, fontSize:13, width:"100%", fontFamily:FB }}
                />
                {search && <button onClick={() => setSearch("")} style={{ background:"none", border:"none", color:C.textMuted, cursor:"pointer", fontSize:16 }}>x</button>}
              </div>

              {/* Filtros */}
              <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:8 }}>
                {SEGS.map(s => (
                  <button key={s.v} onClick={() => setSegFilter(s.v)}
                    style={{ padding:"4px 10px", borderRadius:8, border:`1px solid ${segFilter===s.v?C.rose:C.border}`, background:segFilter===s.v?`${C.rose}15`:C.card, color:segFilter===s.v?C.rose:C.textMuted, fontSize:11, cursor:"pointer", fontFamily:FB, fontWeight:600 }}>{s.l}</button>
                ))}
                <button onClick={() => setBirthdayFilter(!birthdayFilter)}
                  style={{ padding:"4px 10px", borderRadius:8, border:`1px solid ${birthdayFilter?C.gold:C.border}`, background:birthdayFilter?`${C.gold}15`:C.card, color:birthdayFilter?C.gold:C.textMuted, fontSize:11, cursor:"pointer", fontFamily:FB, fontWeight:600 }}>Aniversariantes</button>
              </div>

              {/* Selecionar todos */}
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                <span style={{ fontSize:12, color:C.textMuted, fontFamily:FB }}>{filteredClients.length} clientes encontrados</span>
                <button onClick={selectAll} style={{ background:"none", border:"none", color:C.rose, fontSize:12, cursor:"pointer", fontFamily:FB, fontWeight:700 }}>
                  {selectedClients.length === filteredClients.length && filteredClients.length > 0 ? "Desmarcar todos" : "Selecionar todos"}
                </button>
              </div>

              {/* Lista de clientes */}
              <div style={{ maxHeight:200, overflowY:"auto", border:`1px solid ${C.border}`, borderRadius:10, background:C.surface }}>
                {filteredClients.length === 0 && (
                  <div style={{ padding:20, textAlign:"center", color:C.textMuted, fontSize:13, fontFamily:FB }}>Nenhum cliente encontrado</div>
                )}
                {filteredClients.map((c: any) => (
                  <div key={c.id}
                    onClick={() => toggleClient(c.id)}
                    style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", cursor:"pointer", borderBottom:`1px solid ${C.border}`, background: selectedClients.includes(c.id) ? `${C.rose}10` : "transparent" }}
                  >
                    <div style={{ width:16, height:16, borderRadius:4, border:`2px solid ${selectedClients.includes(c.id) ? C.rose : C.border}`, background: selectedClients.includes(c.id) ? C.rose : "transparent", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      {selectedClients.includes(c.id) && <span style={{ color:"#fff", fontSize:10, fontWeight:700 }}>OK</span>}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:600, color:C.text, fontFamily:FB }}>{c.fullName}</div>
                      <div style={{ fontSize:11, color:C.textMuted }}>{c.whatsapp} {c.segment ? `(${c.segment})` : ""}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Preview da mensagem */}
            {selectedClients.length > 0 && (
              <div style={{ background:C.surface, borderRadius:10, padding:"12px 14px", marginBottom:16 }}>
                <div style={{ fontSize:10, color:C.textMuted, marginBottom:6, textTransform:"uppercase" }}>Preview (primeiro selecionado)</div>
                <div style={{ fontSize:13, color:C.text, fontFamily:FB, lineHeight:1.6 }}>
                  {formatMsg(selected.message, allClients.find((c: any) => c.id === selectedClients[0]))}
                </div>
              </div>
            )}

            {/* Botoes */}
            <div style={{ display:"flex", gap:10, alignItems:"center" }}>
              <Btn variant="secondary" onClick={() => setShowSend(false)}>Cancelar</Btn>
              {selectedClients.length === 1 && (
                <a
                  href={`https://wa.me/55${allClients.find((c: any) => c.id === selectedClients[0])?.whatsapp?.replace(/\D/g,"")}?text=${encodeURIComponent(formatMsg(selected.message, allClients.find((c: any) => c.id === selectedClients[0])))}`}
                  target="_blank"
                  onClick={() => setShowSend(false)}
                  style={{ display:"inline-block", padding:"10px 22px", background:`linear-gradient(135deg, ${C.sage}, #5a8f55)`, color:"#fff", borderRadius:10, textDecoration:"none", fontWeight:700, fontSize:13, fontFamily:FB }}
                >Enviar para {selectedClients.length} cliente(s)</a>
              )}
              {selectedClients.length > 1 && (
                <div style={{ fontSize:12, color:C.textMuted, fontFamily:FB }}>
                  {selectedClients.length} clientes selecionados. Clique em cada um para enviar individualmente.
                  <div style={{ display:"flex", gap:6, marginTop:8, flexWrap:"wrap" }}>
                    {selectedClients.slice(0,5).map(id => {
                      const c = allClients.find((x: any) => x.id === id);
                      if (!c) return null;
                      return (
                        <a key={id}
                          href={`https://wa.me/55${c.whatsapp?.replace(/\D/g,"")}?text=${encodeURIComponent(formatMsg(selected.message, c))}`}
                          target="_blank"
                          style={{ fontSize:11, color:C.sage, padding:"4px 10px", border:`1px solid ${C.sage}40`, borderRadius:8, textDecoration:"none", fontFamily:FB, fontWeight:600 }}
                        >{c.fullName}</a>
                      );
                    })}
                    {selectedClients.length > 5 && <span style={{ fontSize:11, color:C.textMuted, padding:"4px 0" }}>+{selectedClients.length - 5} mais...</span>}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}


// --- UPGRADE BUTTON -----------------------------------------
function UpgradeButton({ color, onPaymentSuccess }: any) {
  const [loading, setLoading] = useState(false);
  const [showCpf, setShowCpf] = useState(false);
  const [cpf, setCpf] = useState("");
  const [savingCpf, setSavingCpf] = useState(false);

  const saveCpfAndUpgrade = async () => {
    setSavingCpf(true);
    try {
      await api.patch("/auth/me/settings", { cpfCnpj: cpf.replace(/\D/g, "") });
      setShowCpf(false);
      await doUpgrade();
    } catch(e: any) {
      alert("Erro ao salvar CPF/CNPJ: " + e.message);
    } finally {
      setSavingCpf(false);
    }
  };

  const doUpgrade = async () => {
    setLoading(true);
    try {
      const r: any = await api.post("/billing/subscribe");
      if (r?.data?.paymentUrl) {
        window.open(r.data.paymentUrl, "_blank");
        // Monitora retorno do pagamento
        const checkReturn = setInterval(() => {
          if (document.visibilityState === "visible") {
            clearInterval(checkReturn);
            onPaymentSuccess?.();
          }
        }, 2000);
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible") {
            clearInterval(checkReturn);
            setCurrentPage("payment_success");
          }
        }, { once: true });
      } else {
        alert("Erro: " + (r?.error ?? "Tente novamente."));
      }
    } catch(e: any) {
      const msg = e.message ?? "";
      if (msg.includes("CPF/CNPJ")) {
        setShowCpf(true);
      } else {
        alert("Erro: " + msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button onClick={doUpgrade} disabled={loading}
        style={{ fontSize:11, color, fontWeight:700, padding:"5px 12px", border:`1px solid ${color}40`, borderRadius:8, background:"transparent", cursor:"pointer", fontFamily:FB }}>
        {loading ? "Aguarde..." : "Upgrade"}
      </button>
      <Modal open={showCpf} onClose={() => setShowCpf(false)} title="CPF/CNPJ necessario" width={380}>
        <div style={{ padding:"8px 0" }}>
          <div style={{ fontSize:13, color:C.textMuted, marginBottom:16, fontFamily:FB }}>
            Para gerar o link de pagamento, informe o CPF ou CNPJ do responsavel pelo salao.
          </div>
          <Inp label="CPF ou CNPJ" value={cpf} onChange={setCpf} placeholder="000.000.000-00 ou 00.000.000/0001-00" />
          <div style={{ display:"flex", gap:10, marginTop:16 }}>
            <Btn variant="secondary" onClick={() => setShowCpf(false)}>Cancelar</Btn>
            <Btn onClick={saveCpfAndUpgrade} disabled={savingCpf || cpf.replace(/\D/g,"").length < 11}>
              {savingCpf ? "Salvando..." : "Salvar e Continuar"}
            </Btn>
          </div>
        </div>
      </Modal>
    </>
  );
}

// --- TRIAL BANNER --------------------------------------------
function TrialBanner() {
  const [info, setInfo] = useState<any>(null);
  useEffect(() => {
    const loadPlan = () => api.get<any>("/plan-info").then((r: any) => setInfo(r.data)).catch(() => setTimeout(loadPlan, 3000));
    loadPlan();
  }, []);
  if (!info) return null;
  if (info.effectivePlan !== "trial" && info.effectivePlan !== "basic") return null;
  const days = info.trialDaysLeft ?? 0;
  const isFree = info.effectivePlan === "basic" && info.planTier === "trial";
  const expired = days <= 0;
  const urgent  = days <= 3 && days > 0;
  const color = isFree ? C.textMuted : expired ? C.ruby : urgent ? C.gold : C.sapphire;
  if (isFree && !expired) return null;
  return (
    <div style={{ background:`${color}12`, border:`1px solid ${color}30`, borderRadius:12, padding:"12px 20px", marginBottom:20, display:"flex", justifyContent:"space-between", alignItems:"center", fontFamily:FB }}>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <span style={{ fontSize:18 }}>{expired ? "?" : urgent ? "??" : "?"}</span>
        <div>
          <div style={{ fontWeight:700, color, fontSize:13 }}>
            {expired ? "Periodo de teste encerrado" : `Periodo de teste: ${days} dias restantes`}
          </div>
          <div style={{ fontSize:11, color:C.textMuted }}>
            {expired ? "Entre em contato para continuar usando o sistema." : `Trial vence em ${info.trialEndsAt ? new Date(info.trialEndsAt).toLocaleDateString("pt-BR") : "breve"}.`}
          </div>
        </div>
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <div style={{ width:100, height:5, background:C.border, borderRadius:3, overflow:"hidden" }}>
          <div style={{ height:"100%", width:`${Math.max(0,Math.min(100,(days/15)*100))}%`, background:color, borderRadius:3 }} />
        </div>
        <UpgradeButton color={color} onPaymentSuccess={() => setCurrentPage('payment_success')} />
      </div>
    </div>
  );
}

// --- SIDEBAR -------------------------------------------------
const MENU = [
  { id:"dashboard",     label:"Dashboard",    icon:"*", premium:false },
  { id:"agenda",        label:"Agenda",        icon:"o", premium:false },
  { id:"clients",       label:"Clientes",      icon:"o", premium:false },
  { id:"professionals", label:"Profissionais", icon:"*", premium:false },
  { id:"services",      label:"Servicos",      icon:"*", premium:false },
  { id:"packages",      label:"Pacotes",       icon:"o", premium:false },
  { id:"financial",     label:"Financeiro",    icon:"o", premium:false },
  { id:"commissions",   label:"Comissoes",     icon:"o", premium:true },
  { id:"crm",           label:"CRM",           icon:"o", premium:true },
  { id:"fidelity",      label:"Fidelidade",    icon:"o", premium:true },
  { id:"automations",   label:"Automacoes",    icon:"!", premium:true },
  { id:"notifications", label:"Notificacoes",  icon:"!", premium:true },
  { id:"whatsapp",      label:"WhatsApp",      icon:"W", premium:true },
];

function Sidebar({ page, setPage, user, tenantInfo, onLogout }: any) {
  const themeId = useTheme();
  const [showThemes, setShowThemes] = useState(false);
  const [planInfo, setPlanInfo] = useState<any>(null);
  useEffect(() => {
    api.get<any>("/plan-info").then((r: any) => setPlanInfo(r.data)).catch(() => {});
  }, []);
  const isFree = planInfo?.effectivePlan === "basic";
  return (
    <div style={{ width:220, minHeight:"100vh", background: C.card, borderRight:`1px solid ${C.border}`, display:"flex", flexDirection:"column", position:"fixed", left:0, top:0, bottom:0, zIndex:100, fontFamily: FB }}>
      <div style={{ padding:"28px 20px 24px", borderBottom:`1px solid ${C.border}` }}>
        <div style={{ fontSize:11, letterSpacing:"0.3em", color: C.rose, textTransform:"uppercase", marginBottom:6 }}>{tenantInfo?.businessType === "aesthetics_clinic" ? "Clinica de Estetica" : tenantInfo?.businessType === "barbershop" ? "Barbearia" : "Salao de Beleza"}</div>
        <div style={{ fontSize:22, fontWeight:700, color: C.text, fontFamily: FD, letterSpacing:"-0.02em" }}>BeautyTech</div>
        <div style={{ fontSize:10, color: C.textMuted, marginTop:2, letterSpacing:"0.1em" }}>{tenantInfo?.businessType === "aesthetics_clinic" ? "Clinica de Estetica" : tenantInfo?.businessType === "barbershop" ? "Barbearia" : "Salao de Beleza"}</div>
      </div>
      <nav style={{ padding:"14px 10px", flex:1, overflowY:"auto" }}>
        {MENU.map(m => {
          const active = page === m.id;
          const locked = isFree && m.premium;
          return (
            <button key={m.id} onClick={() => { if (locked) { alert("Este recurso esta disponivel apenas no Plano Profissional. Faca upgrade para continuar."); return; } setPage(m.id); }}
              style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"9px 14px", borderRadius:10, border:"none", background: active ? `${C.rose}12` : "transparent", color: active ? C.rose : locked ? C.textMuted : C.textMuted, fontSize:13, fontWeight: active ? 600 : 400, cursor: locked ? "not-allowed" : "pointer", marginBottom:2, transition:"all .15s", fontFamily: FB, textAlign:"left", opacity: locked ? 0.5 : 1 }}>
              <span style={{ fontSize:16, color: active ? C.rose : C.textMuted, opacity: active ? 1 : 0.5 }}>{m.icon}</span>
              {m.label}
              {locked && <span style={{ marginLeft:"auto", fontSize:10 }}>?</span>}
              {active && !locked && <div style={{ marginLeft:"auto", width:4, height:4, borderRadius:"50%", background: C.rose }} />}
            </button>
          );
        })}
      </nav>
      <div style={{ padding:"16px 20px", borderTop:`1px solid ${C.border}` }}>
        <div style={{ marginBottom:10 }}>
          <button onClick={() => setShowThemes(s => !s)}
            style={{ width:"100%", display:"flex", justifyContent:"space-between", alignItems:"center", background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, padding:"7px 12px", cursor:"pointer", color:C.textSec, fontSize:11, fontFamily:FB }}>
            <span>{THEMES[themeId === "auto" ? getSystemTheme() : themeId]?.icon ?? "N"} {THEMES[themeId]?.name ?? "Noir"}</span>
            <span style={{ fontSize:9, opacity:0.6 }}>TEMA</span>
          </button>
          {showThemes && (
            <div style={{ background:C.card, border:`1px solid ${C.borderHi}`, borderRadius:10, marginTop:4, overflow:"hidden" }}>
              {["noir","sakura","dourado","esmeralda","violeta","auto"].map(id => (
                <button key={id} onClick={() => { setGlobalTheme(id); setShowThemes(false); }}
                  style={{ width:"100%", display:"flex", alignItems:"center", gap:8, padding:"8px 12px", background:themeId===id?`${C.rose}15`:"none", border:"none", borderBottom:`1px solid ${C.border}`, color:themeId===id?C.rose:C.textSec, fontSize:12, cursor:"pointer", fontFamily:FB, textAlign:"left" as const }}>
                  <span>{THEMES[id]?.icon}</span>
                  <span>{THEMES[id]?.name}</span>
                  {themeId===id && <span style={{ marginLeft:"auto", color:C.rose, fontSize:10 }}>Ativo</span>}
                </button>
              ))}
            </div>
          )}
        </div>
        <div style={{ fontSize:11, color:C.textMuted, marginBottom:4, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{user?.email}</div>
        <button onClick={onLogout} style={{ background:"none", border:"none", color:C.ruby, fontSize:12, cursor:"pointer", padding:0, fontFamily:FB }}>Sair</button>
      </div>
    </div>
  );
}

// --- APP -----------------------------------------------------
export default function App() {
  useTheme();
  const isSuperAdmin = window.location.pathname === '/super-admin';
  const isSubdomain = !['localhost','beautytech-v2.vercel.app'].includes(window.location.hostname) && window.location.hostname !== 'localhost';
  const bookingMatch = window.location.pathname.match(/^\/agendar\/(.+)$/);
  const discoveryMatch = window.location.pathname === '/buscar';

  const [user, setUser] = useState<any>(null);
  const [tenantInfo, setTenantInfo] = useState<any>(null);
  const [page, setPage] = useState('dashboard');
  const [currentPage, setCurrentPage] = useState<string>('app');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) { api.get('/auth/me').then((r: any) => setTenantInfo(r.data)).catch(() => {}); }
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_ev, session) => {
      setUser(session?.user ?? null);
      if (session?.user) { api.get('/auth/me').then((r: any) => setTenantInfo(r.data)).catch(() => {}); }
      else { setTenantInfo(null); }
    });
    return () => subscription.unsubscribe();
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const PAGES: any = {
    dashboard:     DashboardPage,
    agenda:        AgendaPage,
    clients:       ClientsPage,
    professionals: ProfessionalsPage,
    services:      ServicesPage,
    packages:      PackagesPage,
    financial:     FinancialPage,
    commissions:   CommissionsPage,
    crm:           CRMPage,
    fidelity:      FidelityPage,
    automations:   AutomationsPage,
    notifications: NotificationsPage,
    whatsapp: () => <WhatsAppPageComponent C={C} FD={FD} FB={FB} />,
  };

  if (isSubdomain) return <LandingPage />;
  const PageComponent = PAGES[page] ?? PAGES["dashboard"];
  if (discoveryMatch) return <DiscoveryPage />;
  // Returns condicionais DEPOIS de todos os hooks
  if (bookingMatch) return <BookingPage slug={bookingMatch[1]} />;
  if (isSuperAdmin) return <SuperAdminApp />;
  if (loading) return (
    <div style={{ minHeight:"100vh", background: C.bg, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ fontSize:32, color: C.rose, fontFamily: FD }}>BeautyTech</div>
    </div>
  );
  if (!user) return <LoginPage onLogin={(d: any) => setUser(d.user)} />;
  if (currentPage === 'payment_success') return <PaymentSuccessPage onGoHome={() => setCurrentPage('app')} />;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Outfit:wght@300;400;500;600;700&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        body { background:${C.bg}; color:${C.text}; font-family:${FB}; }
        ::-webkit-scrollbar { width:5px; height:5px; }
        ::-webkit-scrollbar-track { background:${C.bg}; }
        ::-webkit-scrollbar-thumb { background:${C.border}; border-radius:3px; }
        input[type=date]::-webkit-calendar-picker-indicator { filter:invert(0.4); }
        input[type=datetime-local]::-webkit-calendar-picker-indicator { filter:invert(0.4); }
        select option { background:${C.surface}; color:${C.text}; }
        a { transition: opacity .15s; } a:hover { opacity:.8; }
      `}</style>
      <Sidebar page={page} setPage={setPage} user={user} tenantInfo={tenantInfo} onLogout={logout} />
      <main style={{ marginLeft:220, padding:36, minHeight:"100vh", background: C.bg }}>
        <TrialBanner />
        <PageComponent />
      </main>
    </>
  );
}





