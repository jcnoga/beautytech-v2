// ============================================================
// BEAUTYTECH v2 — Frontend Completo
// Design: luxury refinado — rose gold + noir + cream
// Tipografia: Playfair Display + Outfit
// 10 módulos: Dashboard, Clientes, Agenda, Profissionais,
//             Serviços, Pacotes, Financeiro, Comissões, CRM, Fidelidade
// ============================================================

import { useState, useEffect } from "react";
import { supabase, dashboardApi, clientsApi, professionalsApi, servicesApi, financialApi, commissionsApi, crmApi } from "./api/client";
// ─── DESIGN TOKENS ───────────────────────────────────────────
const C = {
  bg:        "#0C0A09",
  card:      "#141210",
  surface:   "#1A1714",
  border:    "#2A2420",
  borderHi:  "#3D3028",
  rose:      "#E8A598",
  roseDeep:  "#C4766A",
  roseDim:   "#E8A59820",
  gold:      "#D4AF7A",
  goldDeep:  "#B8924A",
  goldDim:   "#D4AF7A18",
  cream:     "#F5EDD8",
  sage:      "#8FAF8A",
  sapphire:  "#6B8CAE",
  ruby:      "#C4606A",
  text:      "#F0E8DC",
  textSec:   "#C4A882",
  textMuted: "#6B5A48",
  overlay:   "rgba(12,10,9,0.85)",
};

const FD = "'Playfair Display', serif";
const FB = "'Outfit', sans-serif";

// ─── MOCK DATA (fallback) ─────────────────────────────────────
const NOW = new Date();
const D = (h: number, m = 0) => { const d = new Date(NOW); d.setHours(h, m, 0, 0); return d.toISOString(); };

const MOCK_KPIS = { appointmentsToday: 0, appointmentsMonth: 0, activeClients: 0, revenueMonth: 0, revenuePrevMonth: 0, averageTicket: 0, revenueGrowth: 0 };

const MOCK = {
  professionals: [
    { id:"p1", fullName:"Marina Santos",  displayName:"Marina",  specialties:["Coloração","Mechas","Progressiva"], commissionPct:"40", color:"#E8A598", isActive:true, acceptsOnlineBooking:true, monthlyGoal:"8000", revenueMonth: 7240, appointmentsMonth: 48, rating: 4.9 },
    { id:"p2", fullName:"Camila Costa",   displayName:"Camila",  specialties:["Corte","Escova","Hidratação"],       commissionPct:"38", color:"#D4AF7A", isActive:true, acceptsOnlineBooking:true, monthlyGoal:"6000", revenueMonth: 5800, appointmentsMonth: 52, rating: 4.8 },
    { id:"p3", fullName:"Ana Lucia",      displayName:"Ana",     specialties:["Manicure","Pedicure","Nail Art"],    commissionPct:"45", color:"#8FAF8A", isActive:true, acceptsOnlineBooking:true, monthlyGoal:"4000", revenueMonth: 4120, appointmentsMonth: 67, rating: 4.7 },
    { id:"p4", fullName:"Sofia Barbosa",  displayName:"Sofia",   specialties:["Estética","Limpeza de Pele"],        commissionPct:"42", color:"#6B8CAE", isActive:true, acceptsOnlineBooking:false,monthlyGoal:"5000", revenueMonth: 3980, appointmentsMonth: 29, rating: 4.9 },
  ],
  services: [
    { id:"s1", name:"Coloração Completa",  categoryName:"Cabelo",  durationMinutes:180, price:"280.00", isActive:true, isOnlineBookable:true },
    { id:"s2", name:"Mechas Balayage",      categoryName:"Cabelo",  durationMinutes:240, price:"380.00", isActive:true, isOnlineBookable:true },
    { id:"s3", name:"Escova Progressiva",   categoryName:"Cabelo",  durationMinutes:180, price:"220.00", isActive:true, isOnlineBookable:true },
    { id:"s4", name:"Corte Feminino",       categoryName:"Cabelo",  durationMinutes:60,  price:"95.00",  isActive:true, isOnlineBookable:true },
    { id:"s5", name:"Manicure + Pedicure",  categoryName:"Unhas",   durationMinutes:90,  price:"75.00",  isActive:true, isOnlineBookable:true },
    { id:"s6", name:"Limpeza de Pele",      categoryName:"Estética",durationMinutes:90,  price:"180.00", isActive:true, isOnlineBookable:false },
  ],
  packages: [
    { id:"pk1", clientName:"Isabela Carvalho", name:"Pacote Beleza Total",  totalSessions:10, usedSessions:6, remainingSessions:4,  totalValue:"1200.00", status:"active",    expiresAt:"2026-12-31T23:59:00Z" },
    { id:"pk2", clientName:"Patricia Mendes",  name:"Pacote Coloração VIP", totalSessions:6,  usedSessions:6, remainingSessions:0,  totalValue:"1500.00", status:"completed", expiresAt:"2026-08-31T23:59:00Z" },
    { id:"pk3", clientName:"Luciana Rocha",    name:"Pacote Unhas Premium", totalSessions:8,  usedSessions:2, remainingSessions:6,  totalValue:"480.00",  status:"active",    expiresAt:"2026-10-31T23:59:00Z" },
  ],
  financial: [
    { id:"f1", description:"Coloração — Isabela Carvalho", type:"revenue", status:"confirmed", amount:"280.00", dueDate:"2026-05-30", paymentMethod:"pix",          categoryName:"Serviços" },
    { id:"f2", description:"Mechas — Renata Oliveira",     type:"revenue", status:"pending",   amount:"380.00", dueDate:"2026-05-30", paymentMethod:null,            categoryName:"Serviços" },
    { id:"f3", description:"Produtos L'Oréal",             type:"expense", status:"confirmed", amount:"890.00", dueDate:"2026-05-28", paymentMethod:"bank_transfer", categoryName:"Fornecedores" },
    { id:"f4", description:"Aluguel — Junho",              type:"expense", status:"pending",   amount:"3200.00",dueDate:"2026-06-05", paymentMethod:null,            categoryName:"Fixo" },
  ],
  commissions: [
    { id:"cm1", professionalName:"Marina Santos", serviceName:"Coloração Completa", baseAmount:"280.00", commissionPct:"40", commissionAmt:"112.00", isPaid:false, referenceMonth:"2026-05", createdAt: D(8,30) },
    { id:"cm2", professionalName:"Camila Costa",  serviceName:"Mechas Balayage",    baseAmount:"380.00", commissionPct:"38", commissionAmt:"144.40", isPaid:false, referenceMonth:"2026-05", createdAt: D(9,0) },
    { id:"cm3", professionalName:"Ana Lucia",     serviceName:"Manicure+Pedicure",  baseAmount:"75.00",  commissionPct:"45", commissionAmt:"33.75",  isPaid:true,  referenceMonth:"2026-04", createdAt:"2026-04-30T16:00:00Z" },
  ],
  leads: [
    { id:"l1", name:"Bianca Souza",   whatsapp:"(34) 98111-0001", source:"instagram", status:"new",       serviceInterest:"Mechas",    estimatedValue:"380.00", createdAt: D(8,0),  followUpAt: D(14,0) },
    { id:"l2", name:"Camila Nunes",   whatsapp:"(34) 98111-0002", source:"whatsapp",  status:"contacted", serviceInterest:"Coloração", estimatedValue:"280.00", createdAt: D(9,0),  followUpAt: D(16,0) },
    { id:"l3", name:"Debora Castro",  whatsapp:"(34) 98111-0003", source:"indicacao", status:"scheduled", serviceInterest:"Estética",  estimatedValue:"180.00", createdAt: D(10,0), followUpAt: null },
    { id:"l4", name:"Elaine Martins", whatsapp:"(34) 98111-0004", source:"google",    status:"interested",serviceInterest:"Manicure",  estimatedValue:"75.00",  createdAt: D(11,0), followUpAt: D(15,0) },
    { id:"l5", name:"Fabiana Reis",   whatsapp:"(34) 98111-0005", source:"facebook",  status:"converted", serviceInterest:"Corte",     estimatedValue:"95.00",  createdAt:"2026-05-28T10:00:00Z", followUpAt: null },
  ],
};

// ─── HELPERS ─────────────────────────────────────────────────
const brl = (v: any) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString("pt-BR") : "—";
const fmtTime = (d: any) => d ? new Date(d).toLocaleTimeString("pt-BR", { hour:"2-digit", minute:"2-digit" }) : "—";
const fmtPct = (v: any) => `${Number(v || 0).toFixed(1)}%`;

const STATUS_APPT: any = {
  pending:     { label:"Pendente",       color: C.gold },
  confirmed:   { label:"Confirmado",     color: C.sapphire },
  in_progress: { label:"Atendendo",      color: C.rose },
  completed:   { label:"Concluído",      color: C.sage },
  cancelled:   { label:"Cancelado",      color: C.ruby },
  no_show:     { label:"Não compareceu", color: C.textMuted },
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
  bronze:   { label:"Bronze",  color:"#CD7F32" },
  silver:   { label:"Prata",   color:"#9CA3AF" },
  gold:     { label:"Ouro",    color: C.gold },
  platinum: { label:"Platina", color: C.sapphire },
  diamond:  { label:"Diamante",color: C.rose },
};

const PKG_STATUS: any = {
  active:    { label:"Ativo",     color: C.sage },
  completed: { label:"Concluído", color: C.textMuted },
  paused:    { label:"Pausado",   color: C.gold },
  expired:   { label:"Expirado",  color: C.ruby },
  cancelled: { label:"Cancelado", color: C.ruby },
};

const SOURCE_LABEL: any = { instagram:"Instagram", whatsapp:"WhatsApp", facebook:"Facebook", google:"Google", indicacao:"Indicação" };
const PAYMENT_LABEL: any = { cash:"Dinheiro", credit_card:"Cartão Crédito", debit_card:"Cartão Débito", pix:"Pix", bank_transfer:"Transferência", voucher:"Voucher", gift_card:"Vale-Presente" };

// ─── COMPONENTS ──────────────────────────────────────────────

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
              {trend >= 0 ? "▲" : "▼"} {Math.abs(trend).toFixed(1)}%
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
          <button onClick={onClose} style={{ background:"none", border:"none", color: C.textMuted, cursor:"pointer", fontSize:24, lineHeight:1, padding:"0 4px" }}>×</button>
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
      <span style={{ color: C.textMuted, fontSize:14 }}>✦</span>
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

// ─── PAGES ───────────────────────────────────────────────────

function LoginPage({ onLogin }: any) {
  const [email, setEmail] = useState("admin@beautytech.com.br");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
          <div style={{ fontSize:14, letterSpacing:"0.3em", color: C.rose, textTransform:"uppercase", marginBottom:12, fontFamily: FB }}>Sistema de Gestão</div>
          <div style={{ fontSize:44, fontWeight:700, color: C.text, fontFamily: FD, letterSpacing:"-0.03em", lineHeight:1 }}>BeautyTech</div>
          <div style={{ fontSize:13, color: C.textMuted, marginTop:8 }}>Salão de Beleza Enterprise v2</div>
        </div>
        <div style={{ background: C.card, border:`1px solid ${C.borderHi}`, borderRadius:24, padding:36 }}>
          <Inp label="E-mail" value={email} onChange={setEmail} type="email" placeholder="seu@email.com" />
          <Inp label="Senha" value={password} onChange={setPassword} type="password" placeholder="••••••••" />
          {error && <div style={{ background:`${C.ruby}15`, border:`1px solid ${C.ruby}30`, borderRadius:10, padding:"10px 14px", color: C.ruby, fontSize:12, marginBottom:16 }}>{error}</div>}
          <button onClick={submit} disabled={loading} style={{ width:"100%", padding:"13px 0", background:`linear-gradient(135deg, ${C.rose}, ${C.roseDeep})`, border:"none", borderRadius:12, color:"#fff", fontWeight:700, fontSize:14, cursor:"pointer", fontFamily: FB, letterSpacing:"0.02em" }}>
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── DASHBOARD ───────────────────────────────────────────────
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
      <PageHeader title="Dashboard" sub={`${NOW.toLocaleDateString("pt-BR", { weekday:"long", day:"numeric", month:"long", year:"numeric" })}`} />
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(210px, 1fr))", gap:16, marginBottom:28 }}>
        <KpiCard icon="📅" label="Agendamentos Hoje"  value={k.appointmentsToday} sub={`${k.appointmentsMonth} no mês`} color={C.rose} />
        <KpiCard icon="👥" label="Clientes Ativos"    value={k.activeClients}     sub="clientes"           color={C.gold} />
        <KpiCard icon="💰" label="Receita do Mês"     value={brl(k.revenueMonth)} sub={brl(k.revenuePrevMonth)+" mês ant."} color={C.sage} trend={k.revenueGrowth} />
        <KpiCard icon="🎯" label="Ticket Médio"       value={brl(k.averageTicket)} sub="por atendimento"   color={C.sapphire} />
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
                      <div style={{ fontSize:11, color: C.textMuted }}>{fmtTime(item.appointment?.scheduledAt)} · {item.professional?.fullName}</div>
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
          <div style={{ fontSize:15, fontWeight:700, color: C.text, marginBottom:18, fontFamily: FD }}>Performance do Mês</div>
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            {performance.length === 0 && <div style={{ color: C.textMuted, fontFamily: FB, fontSize:13 }}>Nenhum dado disponível.</div>}
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
          <div style={{ fontSize:15, fontWeight:700, color: C.text, marginBottom:16, fontFamily: FD }}>🎂 Aniversariantes do Mês</div>
          {birthdays.length === 0 && <div style={{ color: C.textMuted, fontFamily: FB, fontSize:13 }}>Nenhum aniversariante este mês.</div>}
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
          <div style={{ fontSize:15, fontWeight:700, color: C.text, marginBottom:16, fontFamily: FD }}>⚠️ Clientes em Risco</div>
          {atRisk.length === 0 && <div style={{ color: C.textMuted, fontFamily: FB, fontSize:13 }}>Nenhum cliente em risco.</div>}
          {atRisk.map((c: any, i: number) => (
            <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:`1px solid ${C.border}` }}>
              <div>
                <div style={{ fontSize:13, color: C.text, fontFamily: FB }}>{c.fullName}</div>
                <div style={{ fontSize:11, color: C.textMuted }}>Última visita: {fmtDate(c.lastVisitAt)}</div>
              </div>
              <a href={`https://wa.me/55${c.whatsapp?.replace(/\D/g,"")}`} target="_blank" style={{ fontSize:11, color: C.rose, textDecoration:"none", fontWeight:700, padding:"4px 10px", border:`1px solid ${C.rose}40`, borderRadius:8 }}>Reativar</a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── CLIENTES ────────────────────────────────────────────────
function ClientsPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ fullName:"", whatsapp:"", email:"", gender:"female", birthDate:"" });
  const f = (k: string) => (v: string) => setForm(p => ({ ...p, [k]:v }));

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
      if (selected) {
        const r: any = await clientsApi.update(selected.id, form);
        setData(d => d.map(c => c.id === selected.id ? r.data : c));
      } else {
        const r: any = await clientsApi.create(form);
        setData(d => [...d, r.data]);
      }
      setShowForm(false);
      setSelected(null);
    } catch(e: any) {
      console.error("Erro ao salvar cliente:", e);
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
    { v:"loyal", l:"Fiéis" },{ v:"at_risk", l:"Em Risco" },{ v:"new", l:"Novos" },
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
    { key:"loyaltyTier", label:"Fidelidade", render: (c: any) => { const l = LOYALTY[c.loyaltyTier]; return <Badge label={l?.label ?? c.loyaltyTier ?? "—"} color={l?.color ?? C.textMuted} />; } },
    { key:"totalVisits", label:"Visitas", render: (c: any) => <span style={{ color: C.textSec }}>{c.totalVisits ?? 0}</span> },
    { key:"totalSpent", label:"LTV", render: (c: any) => <span style={{ fontWeight:700, color: C.gold }}>{brl(c.totalSpent)}</span> },
    { key:"averageTicket", label:"Ticket", render: (c: any) => <span style={{ color: C.textMuted }}>{brl(c.averageTicket)}</span> },
    { key:"lastVisitAt", label:"Última Visita", render: (c: any) => <span style={{ color: C.textMuted, fontSize:12 }}>{fmtDate(c.lastVisitAt)}</span> },
    { key:"action", label:"", render: (c: any) => (
      <Btn small variant="secondary" onClick={(e: any) => { e.stopPropagation(); openEdit(c); }}>Editar</Btn>
    )},
  ];

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:400 }}>
      <div style={{ color: C.textMuted, fontFamily: FB }}>Carregando clientes...</div>
    </div>
  );

  return (
    <div>
      <PageHeader title="Clientes" sub={`${filtered.length} clientes`} action={<Btn onClick={openNew}>+ Nova Cliente</Btn>} />
      <div style={{ display:"flex", gap:12, marginBottom:20, flexWrap:"wrap", alignItems:"center" }}>
        <Search value={search} onChange={setSearch} placeholder="Buscar por nome ou WhatsApp..." />
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          {segs.map(s => (
            <button key={s.v} onClick={() => setFilter(s.v)} style={{ padding:"7px 14px", borderRadius:8, border:`1px solid ${filter===s.v ? C.rose : C.border}`, background: filter===s.v ? `${C.rose}15` : C.card, color: filter===s.v ? C.rose : C.textMuted, fontSize:12, cursor:"pointer", fontFamily: FB, fontWeight:600 }}>{s.l}</button>
          ))}
        </div>
      </div>
      <Table cols={cols} rows={filtered} onRow={openEdit} />
      <Modal open={showForm} onClose={() => setShowForm(false)} title={selected ? "Editar Cliente" : "Nova Cliente"}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:4 }}>
          <Inp label="Nome completo" value={form.fullName} onChange={f("fullName")} required placeholder="Ana Beatriz" grid="1/-1" />
          <Inp label="WhatsApp" value={form.whatsapp} onChange={f("whatsapp")} placeholder="(34) 99999-0000" />
          <Inp label="E-mail" value={form.email} onChange={f("email")} type="email" placeholder="ana@email.com" />
          <Inp label="Data de nascimento" value={form.birthDate} onChange={f("birthDate")} type="date" />
          <Sel label="Gênero" value={form.gender} onChange={f("gender")} options={[{ value:"female", label:"Feminino" },{ value:"male", label:"Masculino" },{ value:"other", label:"Outro" }]} />
        </div>
        <div style={{ display:"flex", gap:10, marginTop:8 }}>
          <Btn variant="secondary" onClick={() => setShowForm(false)}>Cancelar</Btn>
          <Btn onClick={save} disabled={saving}>{saving ? "Salvando..." : selected ? "Salvar" : "Cadastrar"}</Btn>
        </div>
      </Modal>
    </div>
  );
}

// ─── AGENDA ──────────────────────────────────────────────────
function AgendaPage() {
  const [filter, setFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ clientName:"", professionalId:"", serviceId:"", scheduledAt:"", totalPrice:"" });
  const f = (k: string) => (v: string) => setForm(p => ({ ...p, [k]:v }));

  useEffect(() => {
    // Por enquanto usa dados do banco via appointments/today
    import("./api/client").then(({ appointmentsApi }) => {
      appointmentsApi.today()
        .then((r: any) => setData(r.data ?? []))
        .catch(console.error)
        .finally(() => setLoading(false));
    });
  }, []);

  const filtered = filter === "all" ? data : data.filter((a: any) => a.appointment?.status === filter);
  const statuses = [{ v:"all", l:"Todos" },{ v:"pending", l:"Pendentes" },{ v:"confirmed", l:"Confirmados" },{ v:"in_progress", l:"Atendendo" },{ v:"completed", l:"Concluídos" }];

  const changeStatus = async (id: string, status: string) => {
    try {
      const { appointmentsApi } = await import("./api/client");
      if (status === "confirmed") await appointmentsApi.confirm(id);
      else if (status === "in_progress") await appointmentsApi.checkin(id);
      else if (status === "cancelled") await appointmentsApi.cancel(id);
      setData(d => d.map((a: any) => a.appointment?.id === id ? { ...a, appointment: { ...a.appointment, status } } : a));
    } catch(e) { console.error(e); }
  };

  const cols = [
    { key:"horario", label:"Horário", render: (a: any) => (
      <div>
        <div style={{ fontWeight:600, color: C.text, fontFamily: FB }}>{fmtTime(a.appointment?.scheduledAt)}</div>
        <div style={{ fontSize:11, color: C.textMuted }}>até {fmtTime(a.appointment?.endsAt)}</div>
      </div>
    )},
    { key:"client", label:"Cliente", render: (a: any) => (
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        <div style={{ width:28, height:28, borderRadius:"50%", background:`linear-gradient(135deg, ${C.rose}40, ${C.gold}40)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12 }}>
          {(a.client?.fullName ?? "?")[0]}
        </div>
        <div>
          <div style={{ fontWeight:600, color: C.text, display:"flex", gap:6 }}>
            {a.client?.fullName} {a.client?.isVip && <Badge label="VIP" color={C.gold} small />}
          </div>
          <div style={{ fontSize:11, color: C.textMuted }}>{a.client?.whatsapp}</div>
        </div>
      </div>
    )},
    { key:"professional", label:"Profissional", render: (a: any) => (
      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
        <div style={{ width:8, height:8, borderRadius:"50%", background: a.professional?.color ?? C.rose }} />
        <span style={{ color: C.textSec, fontSize:13 }}>{a.professional?.fullName}</span>
      </div>
    )},
    { key:"status", label:"Status", render: (a: any) => { const s = STATUS_APPT[a.appointment?.status]; return <Badge label={s?.label ?? a.appointment?.status} color={s?.color ?? C.textMuted} />; } },
    { key:"total", label:"Valor", render: (a: any) => <span style={{ fontWeight:700, color: C.gold }}>{brl(a.appointment?.totalPrice)}</span> },
    { key:"action", label:"Ações", render: (a: any) => (
      <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
        {a.appointment?.status === "pending"     && <Btn small onClick={(e: any) => { e.stopPropagation(); changeStatus(a.appointment.id, "confirmed"); }}>Confirmar</Btn>}
        {a.appointment?.status === "confirmed"   && <Btn small onClick={(e: any) => { e.stopPropagation(); changeStatus(a.appointment.id, "in_progress"); }}>Check-in</Btn>}
        {a.appointment?.status === "in_progress" && <Btn small variant="gold" onClick={(e: any) => { e.stopPropagation(); changeStatus(a.appointment.id, "completed"); }}>Concluir</Btn>}
        {["pending","confirmed"].includes(a.appointment?.status) && <Btn small variant="danger" onClick={(e: any) => { e.stopPropagation(); changeStatus(a.appointment.id, "cancelled"); }}>✕</Btn>}
        <a href={`https://wa.me/55${a.client?.whatsapp?.replace(/\D/g,"")}`} target="_blank" style={{ fontSize:11, color: C.sage, fontWeight:700, padding:"5px 10px", border:`1px solid ${C.sage}40`, borderRadius:8, textDecoration:"none" }}>WA</a>
      </div>
    )},
  ];

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:400 }}>
      <div style={{ color: C.textMuted, fontFamily: FB }}>Carregando agenda...</div>
    </div>
  );

  return (
    <div>
      <PageHeader title="Agenda" sub={`${filtered.length} agendamentos hoje`} action={<Btn onClick={() => setShowForm(true)}>+ Novo Agendamento</Btn>} />
      <div style={{ display:"flex", gap:8, marginBottom:20, flexWrap:"wrap" }}>
        {statuses.map(s => (
          <button key={s.v} onClick={() => setFilter(s.v)} style={{ padding:"7px 16px", borderRadius:8, border:`1px solid ${filter===s.v ? C.rose : C.border}`, background: filter===s.v ? `${C.rose}15` : C.card, color: filter===s.v ? C.rose : C.textMuted, fontSize:12, cursor:"pointer", fontFamily: FB, fontWeight:600 }}>{s.l}</button>
        ))}
      </div>
      <Table cols={cols} rows={filtered} />
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Novo Agendamento">
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:4 }}>
          <Inp label="Cliente" value={form.clientName} onChange={f("clientName")} required placeholder="Nome da cliente" grid="1/-1" />
          <Inp label="Data e Hora" value={form.scheduledAt} onChange={f("scheduledAt")} type="datetime-local" />
          <Inp label="Valor (R$)" value={form.totalPrice} onChange={f("totalPrice")} type="number" placeholder="180.00" />
        </div>
        <div style={{ display:"flex", gap:10, marginTop:8 }}>
          <Btn variant="secondary" onClick={() => setShowForm(false)}>Cancelar</Btn>
          <Btn onClick={() => setShowForm(false)}>Agendar</Btn>
        </div>
      </Modal>
    </div>
  );
}

// ─── PROFISSIONAIS ────────────────────────────────────────────
function ProfessionalsPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    professionalsApi.list({ isActive: "true" })
      .then((r: any) => setData(r.data ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:400 }}>
      <div style={{ color: C.textMuted, fontFamily: FB }}>Carregando profissionais...</div>
    </div>
  );

  return (
    <div>
      <PageHeader title="Profissionais" sub={`${data.length} profissionais ativos`} action={<Btn>+ Nova Profissional</Btn>} />
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
                <div style={{ fontSize:11, color: C.textMuted, marginTop:2 }}>{(p.specialties ?? []).slice(0,2).join(" · ")}</div>
              </div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
              <div style={{ background: C.surface, borderRadius:10, padding:"10px 12px" }}>
                <div style={{ fontSize:10, color: C.textMuted, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:4 }}>Meta Mensal</div>
                <div style={{ fontSize:16, fontWeight:700, color: C.gold, fontFamily: FD }}>{brl(p.monthlyGoal)}</div>
              </div>
              <div style={{ background: C.surface, borderRadius:10, padding:"10px 12px" }}>
                <div style={{ fontSize:10, color: C.textMuted, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:4 }}>Comissão</div>
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
    </div>
  );
}

// ─── SERVIÇOS ─────────────────────────────────────────────────
function ServicesPage() {
  const [data, setData] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name:"", categoryId:"", durationMinutes:"60", price:"", isActive:true });
  const f = (k: string) => (v: any) => setForm(p => ({ ...p, [k]:v }));

  useEffect(() => {
    Promise.all([
      servicesApi.list(),
      servicesApi.categories(),
    ]).then(([s, c]: any) => {
      setData(s.data ?? []);
      setCategories(c.data ?? []);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const r: any = await servicesApi.create(form);
      setData(d => [...d, r.data]);
      setShowForm(false);
    } catch(e: any) {
      alert("Erro: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (s: any) => {
    try {
      const r: any = await servicesApi.update(s.id, { isActive: !s.isActive });
      setData(d => d.map((x: any) => x.id === s.id ? r.data : x));
    } catch(e) { console.error(e); }
  };

  const cols = [
    { key:"name", label:"Serviço", render: (s: any) => <span style={{ fontWeight:600, color: C.text }}>{s.name}</span> },
    { key:"categoryName", label:"Categoria", render: (s: any) => <Badge label={s.categoryName ?? s.category?.name ?? "—"} color={C.rose} /> },
    { key:"durationMinutes", label:"Duração", render: (s: any) => <span style={{ color: C.textSec }}>{s.durationMinutes}min</span> },
    { key:"price", label:"Preço", render: (s: any) => <span style={{ fontWeight:700, color: C.gold }}>{brl(s.price)}</span> },
    { key:"isOnlineBookable", label:"Online", render: (s: any) => <Badge label={s.isOnlineBookable ? "Sim" : "Não"} color={s.isOnlineBookable ? C.sage : C.textMuted} /> },
    { key:"isActive", label:"Status", render: (s: any) => <Badge label={s.isActive ? "Ativo" : "Inativo"} color={s.isActive ? C.sage : C.textMuted} /> },
    { key:"action", label:"", render: (s: any) => (
      <Btn small variant="danger" onClick={(e: any) => { e.stopPropagation(); toggleActive(s); }}>
        {s.isActive ? "Desativar" : "Ativar"}
      </Btn>
    )},
  ];

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:400 }}>
      <div style={{ color: C.textMuted, fontFamily: FB }}>Carregando serviços...</div>
    </div>
  );

  return (
    <div>
      <PageHeader title="Serviços" sub={`${data.filter((s: any) => s.isActive).length} serviços ativos`} action={<Btn onClick={() => setShowForm(true)}>+ Novo Serviço</Btn>} />
      <Table cols={cols} rows={data} />
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Novo Serviço">
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:4 }}>
          <Inp label="Nome" value={form.name} onChange={f("name")} required placeholder="Coloração Completa" grid="1/-1" />
          <Sel label="Categoria" value={form.categoryId} onChange={f("categoryId")} options={categories.map((c: any) => ({ value:c.id, label:c.name }))} />
          <Inp label="Duração (min)" value={form.durationMinutes} onChange={f("durationMinutes")} type="number" placeholder="60" />
          <Inp label="Preço (R$)" value={form.price} onChange={f("price")} type="number" placeholder="180.00" grid="1/-1" />
        </div>
        <div style={{ display:"flex", gap:10, marginTop:8 }}>
          <Btn variant="secondary" onClick={() => setShowForm(false)}>Cancelar</Btn>
          <Btn onClick={save} disabled={saving}>{saving ? "Salvando..." : "Criar Serviço"}</Btn>
        </div>
      </Modal>
    </div>
  );
}

// ─── PACOTES ──────────────────────────────────────────────────
function PackagesPage() {
  const [data, setData] = useState(MOCK.packages);
  const cols = [
    { key:"clientName", label:"Cliente", render: (p: any) => <span style={{ fontWeight:600, color: C.text }}>{p.clientName}</span> },
    { key:"name", label:"Pacote", render: (p: any) => <span style={{ color: C.textSec }}>{p.name}</span> },
    { key:"sessions", label:"Sessões", render: (p: any) => (
      <div>
        <div style={{ fontWeight:700, color: C.text }}>{p.usedSessions} / {p.totalSessions}</div>
        <ProgressBar value={p.usedSessions} max={p.totalSessions} color={C.rose} />
      </div>
    )},
    { key:"remaining", label:"Restantes", render: (p: any) => <Badge label={`${p.remainingSessions} sessões`} color={p.remainingSessions > 0 ? C.sage : C.textMuted} /> },
    { key:"totalValue", label:"Valor Total", render: (p: any) => <span style={{ fontWeight:700, color: C.gold }}>{brl(p.totalValue)}</span> },
    { key:"status", label:"Status", render: (p: any) => { const s = PKG_STATUS[p.status]; return <Badge label={s?.label} color={s?.color ?? C.textMuted} />; } },
    { key:"expiresAt", label:"Vencimento", render: (p: any) => <span style={{ fontSize:12, color: C.textMuted }}>{fmtDate(p.expiresAt)}</span> },
    { key:"action", label:"", render: (p: any) => p.remainingSessions > 0 && p.status === "active" && (
      <Btn small onClick={(e: any) => { e.stopPropagation(); setData((d: any) => d.map((x: any) => x.id === p.id ? { ...x, usedSessions: x.usedSessions+1, remainingSessions: x.remainingSessions-1, status: x.remainingSessions-1 === 0 ? "completed" : "active" } : x)); }}>Usar Sessão</Btn>
    )},
  ];
  return (
    <div>
      <PageHeader title="Pacotes" sub={`${data.filter((p: any) => p.status === "active").length} pacotes ativos`} action={<Btn>+ Novo Pacote</Btn>} />
      <Table cols={cols} rows={data} />
    </div>
  );
}

// ─── FINANCEIRO ───────────────────────────────────────────────
function FinancialPage() {
  const [data, setData] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({ revenue:0, expenses:0, profit:0 });
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      financialApi.list({ limit: 100 }),
      financialApi.summary(),
    ]).then(([t, s]: any) => {
      setData(t.data ?? []);
      setSummary(s.data ?? { revenue:0, expenses:0, profit:0 });
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const filtered = filter === "all" ? data : data.filter((t: any) => t.type === filter);

  const cols = [
    { key:"description", label:"Descrição", render: (t: any) => <span style={{ fontWeight:600, color: C.text }}>{t.description}</span> },
    { key:"type", label:"Tipo", render: (t: any) => <Badge label={t.type==="revenue"?"Receita":"Despesa"} color={t.type==="revenue"?C.sage:C.ruby} /> },
    { key:"status", label:"Status", render: (t: any) => <Badge label={t.status==="confirmed"?"Pago":"Pendente"} color={t.status==="confirmed"?C.sage:C.gold} /> },
    { key:"paymentMethod", label:"Forma", render: (t: any) => <span style={{ color: C.textMuted, fontSize:12 }}>{t.paymentMethod ? PAYMENT_LABEL[t.paymentMethod] ?? t.paymentMethod : "—"}</span> },
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
      <PageHeader title="Financeiro" sub="Controle de receitas e despesas" action={<Btn>+ Nova Transação</Btn>} />
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16, marginBottom:24 }}>
        <KpiCard icon="💚" label="Receitas"     value={brl(summary.revenue)}  color={C.sage} />
        <KpiCard icon="🔴" label="Despesas"     value={brl(summary.expenses)} color={C.ruby} />
        <KpiCard icon="✨" label="Lucro Líquido" value={brl(summary.profit)}  color={summary.profit >= 0 ? C.gold : C.ruby} />
      </div>
      <div style={{ display:"flex", gap:8, marginBottom:16 }}>
        {[{ v:"all", l:"Todos" },{ v:"revenue", l:"Receitas" },{ v:"expense", l:"Despesas" }].map(f2 => (
          <button key={f2.v} onClick={() => setFilter(f2.v)} style={{ padding:"7px 16px", borderRadius:8, border:`1px solid ${filter===f2.v?C.rose:C.border}`, background: filter===f2.v?`${C.rose}15`:C.card, color: filter===f2.v?C.rose:C.textMuted, fontSize:12, cursor:"pointer", fontFamily: FB, fontWeight:600 }}>{f2.l}</button>
        ))}
      </div>
      <Table cols={cols} rows={filtered} emptyMsg="Nenhuma transação encontrada." />
    </div>
  );
}

// ─── COMISSÕES ────────────────────────────────────────────────
function CommissionsPage() {
  const [data, setData] = useState<any[]>([]);
  const [filter, setFilter] = useState("all");
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

  const filtered = filter === "all" ? data : data.filter((c: any) => c.isPaid === (filter === "paid"));
  const totalPending = data.filter((c: any) => !c.isPaid).reduce((s, c: any) => s + Number(c.commissionAmt), 0);
  const totalPaid    = data.filter((c: any) =>  c.isPaid).reduce((s, c: any) => s + Number(c.commissionAmt), 0);

  const cols = [
    { key:"professionalId", label:"Profissional", render: (c: any) => <span style={{ fontWeight:600, color: C.text }}>{c.professional?.fullName ?? c.professionalId}</span> },
    { key:"baseAmount", label:"Base", render: (c: any) => <span style={{ color: C.textMuted }}>{brl(c.baseAmount)}</span> },
    { key:"commissionPct", label:"Comissão %", render: (c: any) => <Badge label={`${c.commissionPct}%`} color={C.rose} /> },
    { key:"commissionAmt", label:"Valor", render: (c: any) => <span style={{ fontWeight:700, color: C.gold }}>{brl(c.commissionAmt)}</span> },
    { key:"referenceMonth", label:"Mês Ref.", render: (c: any) => <span style={{ color: C.textMuted, fontSize:12 }}>{c.referenceMonth}</span> },
    { key:"isPaid", label:"Status", render: (c: any) => <Badge label={c.isPaid?"Pago":"A Pagar"} color={c.isPaid?C.sage:C.gold} /> },
    { key:"action", label:"", render: (c: any) => !c.isPaid && (
      <Btn small variant="gold" onClick={(e: any) => { e.stopPropagation(); pay(c.id); }}>Pagar</Btn>
    )},
  ];

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:400 }}>
      <div style={{ color: C.textMuted, fontFamily: FB }}>Carregando comissões...</div>
    </div>
  );

  return (
    <div>
      <PageHeader title="Comissões" sub="Controle de comissões por profissional" />
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:16, marginBottom:24 }}>
        <KpiCard icon="⏳" label="A Pagar" value={brl(totalPending)} color={C.gold} />
        <KpiCard icon="✅" label="Pagas"   value={brl(totalPaid)}    color={C.sage} />
        <KpiCard icon="💼" label="Total"   value={brl(totalPending+totalPaid)} color={C.rose} />
      </div>
      <div style={{ display:"flex", gap:8, marginBottom:16 }}>
        {[{ v:"all",l:"Todas" },{ v:"pending",l:"A Pagar" },{ v:"paid",l:"Pagas" }].map(f2 => (
          <button key={f2.v} onClick={() => setFilter(f2.v)} style={{ padding:"7px 16px", borderRadius:8, border:`1px solid ${filter===f2.v?C.rose:C.border}`, background:filter===f2.v?`${C.rose}15`:C.card, color:filter===f2.v?C.rose:C.textMuted, fontSize:12, cursor:"pointer", fontFamily:FB, fontWeight:600 }}>{f2.l}</button>
        ))}
      </div>
      <Table cols={cols} rows={filtered} emptyMsg="Nenhuma comissão encontrada." />
    </div>
  );
}

// ─── CRM ──────────────────────────────────────────────────────
function CRMPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name:"", whatsapp:"", source:"instagram", serviceInterest:"", estimatedValue:"" });
  const f = (k: string) => (v: string) => setForm(p => ({ ...p, [k]:v }));

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
    } catch(e: any) {
      alert("Erro: " + e.message);
    } finally {
      setSaving(false);
    }
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
      <PageHeader title="CRM — Pipeline" sub={`${data.length} leads · ${data.filter((l: any) => l.status==="converted").length} convertidos`} action={<Btn onClick={() => setShowForm(true)}>+ Novo Lead</Btn>} />
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
                  <div style={{ fontSize:11, color: C.textMuted, marginBottom:6 }}>{lead.serviceInterest} · {brl(lead.estimatedValue)}</div>
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
          <Sel label="Origem" value={form.source} onChange={f("source")} options={Object.entries(SOURCE_LABEL).map(([v,l]) => ({ value:v, label:l }))} />
          <Inp label="Interesse" value={form.serviceInterest} onChange={f("serviceInterest")} placeholder="Coloração" />
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

// ─── SIDEBAR ─────────────────────────────────────────────────
const MENU = [
  { id:"dashboard",     label:"Dashboard",    icon:"◈" },
  { id:"agenda",        label:"Agenda",        icon:"◷" },
  { id:"clients",       label:"Clientes",      icon:"◯" },
  { id:"professionals", label:"Profissionais", icon:"◈" },
  { id:"services",      label:"Serviços",      icon:"◆" },
  { id:"packages",      label:"Pacotes",       icon:"◉" },
  { id:"financial",     label:"Financeiro",    icon:"◎" },
  { id:"commissions",   label:"Comissões",     icon:"◐" },
  { id:"crm",           label:"CRM",           icon:"◑" },
  { id:"fidelity",      label:"Fidelidade",    icon:"◒" },
];

function Sidebar({ page, setPage, user, onLogout }: any) {
  return (
    <div style={{ width:220, minHeight:"100vh", background: C.card, borderRight:`1px solid ${C.border}`, display:"flex", flexDirection:"column", position:"fixed", left:0, top:0, bottom:0, zIndex:100, fontFamily: FB }}>
      <div style={{ padding:"28px 20px 24px", borderBottom:`1px solid ${C.border}` }}>
        <div style={{ fontSize:11, letterSpacing:"0.3em", color: C.rose, textTransform:"uppercase", marginBottom:6 }}>Sistema</div>
        <div style={{ fontSize:22, fontWeight:700, color: C.text, fontFamily: FD, letterSpacing:"-0.02em" }}>BeautyTech</div>
        <div style={{ fontSize:10, color: C.textMuted, marginTop:2, letterSpacing:"0.1em" }}>ENTERPRISE v2</div>
      </div>
      <nav style={{ padding:"14px 10px", flex:1, overflowY:"auto" }}>
        {MENU.map(m => {
          const active = page === m.id;
          return (
            <button key={m.id} onClick={() => setPage(m.id)}
              style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"9px 14px", borderRadius:10, border:"none", background: active ? `${C.rose}12` : "transparent", color: active ? C.rose : C.textMuted, fontSize:13, fontWeight: active ? 600 : 400, cursor:"pointer", marginBottom:2, transition:"all .15s", fontFamily: FB, textAlign:"left" }}>
              <span style={{ fontSize:16, color: active ? C.rose : C.textMuted, opacity: active ? 1 : 0.5 }}>{m.icon}</span>
              {m.label}
              {active && <div style={{ marginLeft:"auto", width:4, height:4, borderRadius:"50%", background: C.rose }} />}
            </button>
          );
        })}
      </nav>
      <div style={{ padding:"16px 20px", borderTop:`1px solid ${C.border}` }}>
        <div style={{ fontSize:11, color: C.textMuted, marginBottom:4, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{user?.email}</div>
        <button onClick={onLogout} style={{ background:"none", border:"none", color: C.ruby, fontSize:12, cursor:"pointer", padding:0, fontFamily: FB }}>Sair</button>
      </div>
    </div>
  );
}

// ─── APP ─────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState<any>(null);
  const [page, setPage] = useState("dashboard");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_ev, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  if (loading) return (
    <div style={{ minHeight:"100vh", background: C.bg, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ fontSize:32, color: C.rose, fontFamily: FD }}>BeautyTech</div>
    </div>
  );

  if (!user) return <LoginPage onLogin={(d: any) => setUser(d.user)} />;

  function FidelityPage() {
  const [clients, setClients] = useState<any[]>([]);
  const tiers = ["bronze","silver","gold","platinum","diamond"];

  useEffect(() => {
    clientsApi.list({ limit: 200 })
      .then((r: any) => setClients(r.data ?? []))
      .catch(console.error);
  }, []);

  return (
    <div>
      <PageHeader title="Fidelidade" sub="Programa de pontos e benefícios" />
      <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:12, marginBottom:28 }}>
        {tiers.map(t => {
          const l = LOYALTY[t];
          const count = clients.filter((c: any) => c.loyaltyTier === t).length;
          return (
            <div key={t} style={{ background: C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:20, textAlign:"center" }}>
              <div style={{ fontSize:28, marginBottom:8 }}>{t==="diamond"?"💎":t==="platinum"?"🔷":t==="gold"?"🌟":t==="silver"?"⭐":"🔶"}</div>
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
              {["#","Cliente","Tier","Pontos","LTV","Visitas","Ação"].map(h => (
                <th key={h} style={{ padding:"10px 16px", textAlign:"left", color: C.textMuted, fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.07em", fontFamily: FB }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...clients].sort((a,b) => (b.loyaltyPoints ?? 0) - (a.loyaltyPoints ?? 0)).map((c: any, i: number) => {
              const l = LOYALTY[c.loyaltyTier];
              return (
                <tr key={c.id} style={{ borderBottom:`1px solid ${C.border}` }}>
                  <td style={{ padding:"12px 16px", color: C.textMuted, fontFamily: FB, fontWeight:700 }}>#{i+1}</td>
                  <td style={{ padding:"12px 16px", fontFamily: FB }}>
                    <div style={{ fontWeight:600, color: C.text, display:"flex", alignItems:"center", gap:6 }}>
                      {c.fullName} {c.isVip && <Badge label="VIP" color={C.gold} small />}
                    </div>
                  </td>
                  <td style={{ padding:"12px 16px" }}><Badge label={l?.label ?? "—"} color={l?.color ?? C.textMuted} /></td>
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
  };
  const PageComponent = PAGES[page] ?? DashboardPage;

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
      <Sidebar page={page} setPage={setPage} user={user} onLogout={logout} />
      <main style={{ marginLeft:220, padding:36, minHeight:"100vh", background: C.bg }}>
        <PageComponent />
      </main>
    </>
  );
}
