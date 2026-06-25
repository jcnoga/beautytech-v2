import { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";

const API = ((import.meta as any).env?.VITE_API_URL ?? "http://localhost:3000/api/v1").replace(/\/+$/, "");

const NICHES = [
  { value: "", label: "Todos os nichos" },
  { value: "salão de beleza", label: "Salão de Beleza" },
  { value: "barbearia", label: "Barbearia" },
  { value: "clínica de estética", label: "Clínica de Estética" },
  { value: "manicure", label: "Manicure/Studio" },
];

const STATUSES = [
  { key: "pending",   label: "Pendente",    color: "#94A3B8", bg: "#94A3B815" },
  { key: "sent",      label: "Enviado",     color: "#22C55E", bg: "#22C55E15" },
  { key: "replied",   label: "Respondido",  color: "#3B82F6", bg: "#3B82F615" },
  { key: "converted", label: "Convertido",  color: "#F59E0B", bg: "#F59E0B15" },
  { key: "blacklist", label: "Blacklist",   color: "#EF4444", bg: "#EF444415" },
];

const C = {
  bg: "#0B0F1A", card: "#141826", card2: "#1C2235",
  text: "#E2E8F0", muted: "#94A3B8", border: "#2A3150",
  gold: "#C9A96E", green: "#22C55E", red: "#EF4444",
};

export default function ProspectPage({ token }: { token: string }) {
  const [leads, setLeads]           = useState<any[]>([]);
  const [templates, setTemplates]   = useState<any[]>([]);
  const [stats, setStats]           = useState<any>(null);
  const [loading, setLoading]       = useState(false);
  const [tab, setTab]               = useState<"kanban" | "lista" | "templates" | "send">("kanban");
  const [filterNiche, setFilterNiche]   = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterState, setFilterState]   = useState("");
  const [filterCity, setFilterCity]     = useState("");
  const [allStatesDb, setAllStatesDb]   = useState([]);
  const [allCitiesDb, setAllCitiesDb]   = useState([]);
  const [search, setSearch]             = useState("");
  const [sending, setSending]           = useState(false);
  const [sendResult, setSendResult]     = useState("");
  const [sendConfig, setSendConfig]     = useState({ niche: "", daily_limit: 50, min_interval: 30, max_interval: 60 });
  const [waStatus, setWaStatus]         = useState<"disconnected"|"connecting"|"connected">("disconnected");
  const [waQr, setWaQr]                 = useState("");
  const [waPhone, setWaPhone]           = useState("");
  const [waPolling, setWaPolling]       = useState(false);
  const [sendProgress, setSendProgress] = useState<{current: number, total: number, name: string, phone: string} | null>(null);
  const [sendLog, setSendLog]           = useState<{name: string, status: string}[]>([]);
  const [stopSend, setStopSend]         = useState(false);



  const [newTemplate, setNewTemplate]   = useState({ niche: "", name: "", message: "" });
  const [dragId, setDragId]             = useState<string | null>(null);
  const [currentPage, setCurrentPage]   = useState(1);
  const [totalPages, setTotalPages]     = useState(1);
  const [totalLeads, setTotalLeads]     = useState(0);
  const PAGE_SIZE = 100;
  const fileRef = useRef<HTMLInputElement>(null);
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  async function loadLeads(page = 1) {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterNiche)  params.set("niche", filterNiche);
    if (filterStatus) params.set("status", filterStatus);
    if (filterState)  params.set("state", filterState);
    if (filterCity)   params.set("city", filterCity);
    if (search)       params.set("search", search);
    params.set("page",  String(page));
    params.set("limit", String(PAGE_SIZE));
    const r = await fetch(`${API}/super-admin/prospects?${params}`, { headers });
    const d = await r.json();
    setLeads(d.data ?? []);
    setTotalLeads(d.total ?? 0);
    setTotalPages(d.pages ?? 1);
    setCurrentPage(page);
    setLoading(false);
  }

  async function loadTemplates() {
    const r = await fetch(`${API}/super-admin/prospect-templates`, { headers });
    const d = await r.json();
    setTemplates(d.data ?? []);
  }

  async function loadStats() {
    const r = await fetch(`${API}/super-admin/prospects/stats`, { headers });
    const d = await r.json();
    setStats(d.data);
  }

  useEffect(() => { loadLeads(1); loadTemplates(); loadStats(); loadFilters(); }, [filterNiche, filterStatus, filterState, filterCity]);

  // Listas derivadas para filtros dinâmicos
  const allStates = [...new Set(leads.map(l => l.state).filter(Boolean))].sort();
  const allCities = [...new Set(leads.filter(l => !filterState || l.state === filterState).map(l => l.city).filter(Boolean))].sort();

  // Filtragem local por busca
  const filtered = leads.filter(l => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (l.business_name ?? "").toLowerCase().includes(q) ||
      (l.phone ?? "").toLowerCase().includes(q) ||
      (l.city ?? "").toLowerCase().includes(q)
    );
  });

  async function importXLSX(e: any) {
    const file = e.target.files[0];
    if (!file) return;
    const data = await file.arrayBuffer();
    const wb = XLSX.read(data);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: "" }) as any[];
    const get = (r: any, ...keys: string[]) => {
      for (const k of keys) {
        const found = Object.keys(r).find(rk => rk.trim().toLowerCase() === k.toLowerCase());
        if (found && r[found] !== undefined && r[found] !== "") return r[found];
      }
      return "";
    };
    const leads = rows.map((r: any) => ({
      state:           get(r, "Estado", "state", "UF", "uf", "Estado/UF"),
      city:            get(r, "Cidade", "city", "Municipio", "Município"),
      niche:           get(r, "Nicho Pesquisado", "Nicho", "niche", "nicho", "Segmento", "Categoria"),
      business_name:   get(r, "Nome", "business_name", "nome", "Empresa", "Estabelecimento"),
      phone:           get(r, "Telefone", "phone", "telefone", "Fone", "Celular", "WhatsApp", "Contato"),
      email:           get(r, "Email", "email", "E-mail"),
      website:         get(r, "Website", "website", "Site", "URL"),
      address:         get(r, "Endereço", "address", "endereco", "Logradouro"),
      type:            get(r, "Tipo", "type", "tipo", "Categoria", "Ramo"),
      rating:          get(r, "avaliação", "Avaliação", "Nota", "rating") || 0,
      review_count:    get(r, "Número de Avaliações", "Avaliações", "review_count", "Reviews") || 0,
      google_maps_link:get(r, "Link Google Maps", "Google Maps", "Maps", "google_maps_link"),
    }));
    setLoading(true);
    const r = await fetch(`${API}/super-admin/prospects/import`, {
      method: "POST", headers,
      body: JSON.stringify({ leads }),
    });
    const d = await r.json();
    alert(`Importados: ${d.data?.inserted ?? 0} | Ignorados: ${d.data?.skipped ?? 0}`);
    loadLeads(); loadStats();
    setLoading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function updateStatus(id: string, status: string) {
    await fetch(`${API}/super-admin/prospects/${id}/status`, {
      method: "PATCH", headers,
      body: JSON.stringify({ status }),
    });
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l));
    loadStats();
  }

  async function conectarWhatsApp() {
    setWaStatus("connecting"); setWaQr("");
    try {
      // Verifica status primeiro
      const sr = await fetch(`${API}/super-admin/prospects/whatsapp/status`, { headers });
      const sd = await sr.json();
      if (sd.connected) { setWaStatus("connected"); setWaPhone(sd.phone ?? ""); return; }
      // Se nao conectado, gera QR
      const r = await fetch(`${API}/super-admin/prospects/whatsapp/connect`, { method: "POST", headers });
      const d = await r.json();
      if (d.qrcode) { setWaQr(d.qrcode); pollStatus(); }
      else if (d.connected) { setWaStatus("connected"); setWaPhone(d.phone ?? ""); }
    } catch { setWaStatus("disconnected"); }
  }

  async function pollStatus() {
    if (waPolling) return;
    setWaPolling(true);
    const interval = setInterval(async () => {
      try {
        const r = await fetch(`${API}/super-admin/prospects/whatsapp/status`, { headers });
        const d = await r.json();
        if (d.connected) {
          setWaStatus("connected"); setWaPhone(d.phone ?? "");
          setWaQr(""); clearInterval(interval); setWaPolling(false);
        }
      } catch {}
    }, 3000);
    setTimeout(() => { clearInterval(interval); setWaPolling(false); }, 120000);
  }

  async function desconectarWhatsApp() {
    await fetch(`${API}/super-admin/prospects/whatsapp/disconnect`, { method: "POST", headers });
    setWaStatus("disconnected"); setWaQr(""); setWaPhone("");
  }

  async function sendCampaign() {
    setSending(true); setSendResult(""); setSendLog([]); setStopSend(false);
    const params = new URLSearchParams({ status: "pending", limit: String(sendConfig.daily_limit), page: "1" });
    if (sendConfig.niche) params.set("niche", sendConfig.niche);
    const r = await fetch(`${API}/super-admin/prospects?${params}`, { headers });
    const d = await r.json();
    const pending = d.data ?? [];
    if (pending.length === 0) { setSendResult("Nenhum lead pendente!"); setSending(false); return; }
    setSendProgress({ current: 0, total: pending.length, name: "", phone: "" });
    let sent = 0;
    for (let i = 0; i < pending.length; i++) {
      if (stopSend) break;
      const lead = pending[i];
      setSendProgress({ current: i + 1, total: pending.length, name: lead.name, phone: lead.phone ?? "" });
      try {
        const sr = await fetch(`${API}/super-admin/prospects/send-one`, {
          method: "POST", headers,
          body: JSON.stringify({ leadId: lead.id }),
        });
        const sd = await sr.json();
        if (sd.success) {
          setSendLog(prev => [{ name: lead.name, status: "Enviado" }, ...prev].slice(0, 20));
          sent++;
        } else {
          setSendLog(prev => [{ name: lead.name, status: "Erro: " + (sd.error ?? "?") }, ...prev].slice(0, 20));
        }
      } catch(e: any) {
        setSendLog(prev => [{ name: lead.name, status: "Erro: " + e.message }, ...prev].slice(0, 20));
      }
      const wait = sendConfig.min_interval * 1000 + Math.random() * (sendConfig.max_interval - sendConfig.min_interval) * 1000;
      await new Promise(res => setTimeout(res, wait));
    }
    setSendResult("Concluido! " + sent + " mensagens enviadas.");
    setSending(false); setSendProgress(null);
    setTimeout(() => { loadLeads(); loadStats(); }, 2000);
  }

  async function addTemplate() {
    if (!newTemplate.niche || !newTemplate.name || !newTemplate.message) return alert("Preencha todos os campos");
    await fetch(`${API}/super-admin/prospect-templates`, {
      method: "POST", headers,
      body: JSON.stringify(newTemplate),
    });
    setNewTemplate({ niche: "", name: "", message: "" });
    loadTemplates();
  }

  async function deleteTemplate(id: string) {
    if (!confirm("Remover template?")) return;
    await fetch(`${API}/super-admin/prospect-templates/${id}`, { method: "DELETE", headers });
    loadTemplates();
  }

  // Drag & Drop handlers para o Kanban
  const onDragStart = (id: string) => setDragId(id);
  const onDrop = async (status: string) => {
    if (!dragId) return;
    await updateStatus(dragId, status);
    setDragId(null);
  };

  const inp = {
    padding: "8px 12px", background: C.card2,
    border: `1px solid ${C.border}`, borderRadius: 8,
    color: C.text, fontSize: 13,
  } as React.CSSProperties;

  return (
    <div style={{ background: C.bg, minHeight: "100vh", padding: 24, fontFamily: "Inter, sans-serif", color: C.text }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>🎯 Prospecção</h1>
      <p style={{ color: C.muted, marginBottom: 20 }}>Importar leads, gerenciar templates e disparar campanhas WhatsApp</p>

      {/* STATS */}
      {stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 8, marginBottom: 20 }}>
          {[
            { label: "Total",      value: stats.totals?.total     ?? 0, color: C.text  },
            { label: "Pendentes",  value: stats.totals?.pending   ?? 0, color: C.muted },
            { label: "Enviados",   value: stats.totals?.sent      ?? 0, color: C.green },
            { label: "Respondidos",value: stats.totals?.replied   ?? 0, color: "#3B82F6" },
            { label: "Convertidos",value: stats.totals?.converted ?? 0, color: C.gold  },
            { label: "Blacklist",  value: stats.totals?.blacklist ?? 0, color: C.red   },
          ].map(s => (
            <div key={s.label} style={{ background: C.card, borderRadius: 10, padding: "12px 16px", textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, color: C.muted }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* TABS */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {(["kanban", "lista", "templates", "send"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: "8px 20px", borderRadius: 8, border: `1px solid ${tab === t ? C.gold : C.border}`, background: tab === t ? C.gold + "20" : "transparent", color: tab === t ? C.gold : C.muted, cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
            {t === "kanban" ? "📋 Kanban" : t === "lista" ? "📄 Lista" : t === "templates" ? "📝 Templates" : "🚀 Disparar"}
          </button>
        ))}
      </div>

      {/* FILTROS COMUNS (kanban e lista) */}
      {(tab === "kanban" || tab === "lista") && (
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={importXLSX} style={{ display: "none" }} />
          <button onClick={() => fileRef.current?.click()}
            style={{ padding: "8px 16px", background: C.gold, color: "#000", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13 }}>
            📥 Importar XLSX
          </button>

          {/* Busca */}
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="🔍 Buscar nome, telefone, cidade..."
            style={{ ...inp, minWidth: 220 }} />

          {/* Filtro Nicho */}
          <select value={filterNiche} onChange={e => setFilterNiche(e.target.value)} style={inp}>
            {NICHES.map(n => <option key={n.value} value={n.value}>{n.label}</option>)}
          </select>

          {/* Filtro Estado */}
          <select value={filterState} onChange={e => { setFilterState(e.target.value); setFilterCity(""); }} style={inp}>
            <option value="">Todos os estados</option>
            {(allStatesDb.length ? allStatesDb : allStates).map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          {/* Filtro Cidade */}
          <select value={filterCity} onChange={e => setFilterCity(e.target.value)} style={inp}>
            <option value="">Todas as cidades</option>
            {(allCitiesDb.length ? allCitiesDb : allCities).map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          {tab === "lista" && (
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={inp}>
              <option value="">Todos os status</option>
              {STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          )}

          <span style={{ color: C.muted, fontSize: 13 }}>{filtered.length} leads</span>
        </div>
      )}

      {/* KANBAN */}
      {tab === "kanban" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, alignItems: "start" }}>
          {STATUSES.map(st => {
            const col = filtered.filter(l => l.status === st.key);
            return (
              <div key={st.key}
                onDragOver={e => e.preventDefault()}
                onDrop={() => onDrop(st.key)}
                style={{ background: C.card, borderRadius: 12, padding: 12, minHeight: 200, border: `1px solid ${st.color}30` }}>
                {/* Cabeçalho coluna */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: st.color, textTransform: "uppercase", letterSpacing: "0.05em" }}>{st.label}</span>
                  <span style={{ fontSize: 11, background: st.color + "25", color: st.color, borderRadius: 99, padding: "2px 8px", fontWeight: 700 }}>{col.length}</span>
                </div>

                {/* Cards */}
                {loading ? (
                  <div style={{ color: C.muted, fontSize: 12, textAlign: "center", padding: 20 }}>Carregando...</div>
                ) : col.length === 0 ? (
                  <div style={{ color: C.muted, fontSize: 12, textAlign: "center", padding: 20, opacity: 0.5 }}>Nenhum lead</div>
                ) : col.map(lead => (
                  <div key={lead.id}
                    draggable
                    onDragStart={() => onDragStart(lead.id)}
                    style={{ background: C.card2, borderRadius: 8, padding: 10, marginBottom: 8, cursor: "grab", border: `1px solid ${C.border}`, userSelect: "none" }}>
                    <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 4, color: C.text }}>{lead.business_name}</div>
                    <div style={{ fontSize: 11, color: C.muted, marginBottom: 2 }}>📍 {lead.city}{lead.state ? ` — ${lead.state}` : ""}</div>
                    <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>📱 {lead.phone}</div>
                    {lead.rating > 0 && (
                      <div style={{ fontSize: 11, color: C.gold }}>⭐ {lead.rating} ({lead.review_count})</div>
                    )}
                    {/* Mover para status */}
                    <select value={lead.status} onChange={e => updateStatus(lead.id, e.target.value)}
                      style={{ marginTop: 8, fontSize: 10, background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, padding: "3px 6px", width: "100%" }}>
                      {STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* LISTA */}
      {tab === "lista" && (
        <div style={{ overflowX: "auto" }}>
          {loading ? <div style={{ color: C.muted }}>Carregando...</div> : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: C.card2 }}>
                  {["Nome", "Nicho", "Estado", "Cidade", "Telefone", "Avaliação", "Status", "Ações"].map(h => (
                    <th key={h} style={{ padding: "10px 12px", textAlign: "left", color: C.muted, fontWeight: 600, borderBottom: `1px solid ${C.border}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((lead: any) => (
                  <tr key={lead.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: "8px 12px", fontWeight: 600 }}>{lead.business_name}</td>
                    <td style={{ padding: "8px 12px", color: C.muted }}>{lead.niche}</td>
                    <td style={{ padding: "8px 12px", color: C.muted }}>{lead.state}</td>
                    <td style={{ padding: "8px 12px", color: C.muted }}>{lead.city}</td>
                    <td style={{ padding: "8px 12px" }}>{lead.phone}</td>
                    <td style={{ padding: "8px 12px", color: C.gold }}>{lead.rating > 0 ? `${lead.rating} ⭐ (${lead.review_count})` : "-"}</td>
                    <td style={{ padding: "8px 12px" }}>
                      {(() => { const s = STATUSES.find(x => x.key === lead.status); return s ? (
                        <span style={{ padding: "2px 8px", borderRadius: 99, background: s.bg, color: s.color, fontSize: 11, fontWeight: 700 }}>{s.label}</span>
                      ) : null; })()}
                    </td>
                    <td style={{ padding: "8px 12px" }}>
                      <select value={lead.status} onChange={e => updateStatus(lead.id, e.target.value)}
                        style={{ fontSize: 11, background: C.card2, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, padding: "4px 8px" }}>
                        {STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={8} style={{ textAlign: "center", padding: 32, color: C.muted }}>Nenhum lead encontrado.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* TEMPLATES */}
      {tab === "templates" && (
        <div>
          <div style={{ background: C.card, borderRadius: 12, padding: 20, marginBottom: 20 }}>
            <h3 style={{ marginBottom: 16, fontSize: 16 }}>Novo Template</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <select value={newTemplate.niche} onChange={e => setNewTemplate(p => ({ ...p, niche: e.target.value }))} style={inp}>
                <option value="">Selecione o nicho</option>
                {NICHES.filter(n => n.value).map(n => <option key={n.value} value={n.value}>{n.label}</option>)}
              </select>
              <input value={newTemplate.name} onChange={e => setNewTemplate(p => ({ ...p, name: e.target.value }))}
                placeholder="Nome do template" style={inp} />
            </div>
            <textarea value={newTemplate.message} onChange={e => setNewTemplate(p => ({ ...p, message: e.target.value }))}
              placeholder="Mensagem... Use {nome}, {cidade}, {nicho} como variáveis"
              rows={4}
              style={{ ...inp, width: "100%", resize: "vertical", boxSizing: "border-box", marginBottom: 12 }} />
            <button onClick={addTemplate}
              style={{ padding: "10px 24px", background: C.gold, color: "#000", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 700 }}>
              Salvar Template
            </button>
          </div>
          <div style={{ display: "grid", gap: 12 }}>
            {templates.map((t: any) => (
              <div key={t.id} style={{ background: C.card, borderRadius: 10, padding: 16, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>{t.name} <span style={{ color: C.gold, fontSize: 12 }}>({t.niche})</span></div>
                  <div style={{ color: C.muted, fontSize: 13, whiteSpace: "pre-wrap" }}>{t.message}</div>
                  <div style={{ color: C.muted, fontSize: 11, marginTop: 8 }}>Enviados: {t.sent_count}</div>
                </div>
                <button onClick={() => deleteTemplate(t.id)}
                  style={{ padding: "6px 12px", background: C.red + "20", color: C.red, border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12, marginLeft: 16 }}>
                  Remover
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DISPARAR */}
      {/* PAGINACAO */}
      {(tab === "kanban" || tab === "lista") && totalPages > 1 && (
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:12, marginTop:24 }}>
          <button onClick={() => loadLeads(currentPage - 1)} disabled={currentPage <= 1}
            style={{ padding:"8px 16px", borderRadius:8, border:`1px solid ${C.border}`, background:"transparent", color:currentPage<=1?C.muted:C.gold, cursor:currentPage<=1?"not-allowed":"pointer", fontSize:13 }}>
            ← Anterior
          </button>
          <span style={{ color:C.muted, fontSize:13 }}>
            Página {currentPage} de {totalPages} · {totalLeads} leads
          </span>
          <button onClick={() => loadLeads(currentPage + 1)} disabled={currentPage >= totalPages}
            style={{ padding:"8px 16px", borderRadius:8, border:`1px solid ${C.border}`, background:"transparent", color:currentPage>=totalPages?C.muted:C.gold, cursor:currentPage>=totalPages?"not-allowed":"pointer", fontSize:13 }}>
            Próxima →
          </button>
        </div>
      )}

      {tab === "send" && (
        <div style={{ background: C.card, borderRadius: 12, padding: 24, maxWidth: 500 }}>
          <h3 style={{ marginBottom: 20, fontSize: 16 }}>Configurar Disparo</h3>
          <div style={{ display: "grid", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: C.muted, display: "block", marginBottom: 6 }}>Nicho (vazio = todos)</label>
              <select value={sendConfig.niche} onChange={e => setSendConfig(p => ({ ...p, niche: e.target.value }))} style={{ ...inp, width: "100%" }}>
                {NICHES.map(n => <option key={n.value} value={n.value}>{n.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: C.muted, display: "block", marginBottom: 6 }}>Limite diário</label>
              <input type="number" value={sendConfig.daily_limit} onChange={e => setSendConfig(p => ({ ...p, daily_limit: Number(e.target.value) }))}
                style={{ ...inp, width: "100%", boxSizing: "border-box" }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: C.muted, display: "block", marginBottom: 6 }}>Intervalo mínimo (s)</label>
                <input type="number" value={sendConfig.min_interval} onChange={e => setSendConfig(p => ({ ...p, min_interval: Number(e.target.value) }))}
                  style={{ ...inp, width: "100%", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: C.muted, display: "block", marginBottom: 6 }}>Intervalo máximo (s)</label>
                <input type="number" value={sendConfig.max_interval} onChange={e => setSendConfig(p => ({ ...p, max_interval: Number(e.target.value) }))}
                  style={{ ...inp, width: "100%", boxSizing: "border-box" }} />
              </div>
            </div>
            {/* WhatsApp Connection */}
            <div style={{ background: "#1a1a1a", borderRadius: 10, padding: 16, border: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>📱 WhatsApp para Prospecção</span>
                <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: waStatus === "connected" ? "#1a3a1a" : waStatus === "connecting" ? "#2a2a1a" : "#3a1a1a", color: waStatus === "connected" ? "#4caf50" : waStatus === "connecting" ? "#ffcc00" : "#e87070" }}>
                  {waStatus === "connected" ? "✅ Conectado" : waStatus === "connecting" ? "⏳ Aguardando QR" : "❌ Desconectado"}
                </span>
              </div>
              {waStatus === "connected" && waPhone && (
                <div style={{ fontSize: 12, color: "#7eb8a0", marginBottom: 10 }}>📞 {waPhone}</div>
              )}
              {waQr && (
                <div style={{ textAlign: "center", marginBottom: 12 }}>
                  <img src={waQr} alt="QR Code" style={{ width: 200, height: 200, borderRadius: 8 }} />
                  <div style={{ fontSize: 11, color: "#aaa", marginTop: 6 }}>Escaneie com o WhatsApp</div>
                </div>
              )}
              {waStatus !== "connected" ? (
                <button onClick={conectarWhatsApp} disabled={waStatus === "connecting"}
                  style={{ width: "100%", padding: "10px", background: "#25d366", color: "#000", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13 }}>
                  {waStatus === "connecting" ? "⏳ Aguardando conexão..." : "🔗 Conectar WhatsApp"}
                </button>
              ) : (
                <button onClick={desconectarWhatsApp}
                  style={{ width: "100%", padding: "10px", background: "#e87070", color: "#fff", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13 }}>
                  Desconectar
                </button>
              )}
            </div>
            <button onClick={sendCampaign} disabled={sending || waStatus !== "connected"}
              style={{ padding: "12px 24px", background: (sending || waStatus !== "connected") ? C.muted : C.green, color: "#000", borderRadius: 8, border: "none", cursor: (sending || waStatus !== "connected") ? "not-allowed" : "pointer", fontWeight: 800, fontSize: 15, marginTop: 8 }}>
              {sending ? "Disparando..." : waStatus !== "connected" ? "🔒 Conecte o WhatsApp primeiro" : "🚀 Iniciar Disparo"}
            </button>
            {sending && (
              <button onClick={() => setStopSend(true)}
                style={{ width: "100%", padding: "10px", background: "#e87070", color: "#fff", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13 }}>
                ⏹ Parar Disparo
              </button>
            )}
            {sendProgress && (
              <div style={{ background: "#1a1a1a", borderRadius: 10, padding: 14, border: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ fontSize: 12, color: "#aaa", marginBottom: 6 }}>Enviando {sendProgress.current} de {sendProgress.total}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#f0ece4", marginBottom: 4 }}>📤 {sendProgress.name}</div>
                <div style={{ fontSize: 12, color: "#7eb8a0" }}>{sendProgress.phone}</div>
                <div style={{ marginTop: 10, background: "#333", borderRadius: 4, height: 6 }}>
                  <div style={{ width: `${(sendProgress.current / sendProgress.total) * 100}%`, background: "#25d366", height: 6, borderRadius: 4, transition: "width 0.3s" }} />
                </div>
              </div>
            )}
            {sendLog.length > 0 && (
              <div style={{ background: "#1a1a1a", borderRadius: 10, padding: 14, border: "1px solid rgba(255,255,255,0.08)", maxHeight: 200, overflowY: "auto" }}>
                <div style={{ fontSize: 11, color: "#aaa", marginBottom: 8, fontWeight: 700 }}>LOG DE ENVIO</div>
                {sendLog.map((l, i) => (
                  <div key={i} style={{ fontSize: 12, padding: "4px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#f0ece4" }}>{l.name}</span>
                    <span>{l.status}</span>
                  </div>
                ))}
              </div>
            )}
            {sending && (
              <button onClick={() => setStopSend(true)}
                style={{ width: "100%", padding: "10px", background: "#e87070", color: "#fff", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13 }}>
                ⏹ Parar Disparo
              </button>
            )}
            {sendProgress && (
              <div style={{ background: "#1a1a1a", borderRadius: 10, padding: 14, border: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ fontSize: 12, color: "#aaa", marginBottom: 6 }}>Enviando {sendProgress.current} de {sendProgress.total}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#f0ece4", marginBottom: 4 }}>📤 {sendProgress.name}</div>
                <div style={{ fontSize: 12, color: "#7eb8a0" }}>{sendProgress.phone}</div>
                <div style={{ marginTop: 10, background: "#333", borderRadius: 4, height: 6 }}>
                  <div style={{ width: `${(sendProgress.current / sendProgress.total) * 100}%`, background: "#25d366", height: 6, borderRadius: 4, transition: "width 0.3s" }} />
                </div>
              </div>
            )}
            {sendLog.length > 0 && (
              <div style={{ background: "#1a1a1a", borderRadius: 10, padding: 14, border: "1px solid rgba(255,255,255,0.08)", maxHeight: 200, overflowY: "auto" }}>
                <div style={{ fontSize: 11, color: "#aaa", marginBottom: 8, fontWeight: 700 }}>LOG DE ENVIO</div>
                {sendLog.map((l, i) => (
                  <div key={i} style={{ fontSize: 12, padding: "4px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#f0ece4" }}>{l.name}</span>
                    <span>{l.status}</span>
                  </div>
                ))}
              </div>
            )}
            {sendResult && <div style={{ color: C.green, fontSize: 13, textAlign: "center" }}>{sendResult}</div>}
          </div>
        </div>
      )}
    </div>
  );
}
