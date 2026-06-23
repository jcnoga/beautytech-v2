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

const STATUS_COLORS: Record<string, string> = {
  pending: "#94A3B8",
  sent: "#22C55E",
  replied: "#3B82F6",
  converted: "#F59E0B",
  blacklist: "#EF4444",
};

export default function ProspectPage({ token }: { token: string }) {
  const [leads, setLeads] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"leads" | "templates" | "send">("leads");
  const [filterNiche, setFilterNiche] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState("");
  const [sendConfig, setSendConfig] = useState({ niche: "", daily_limit: 50, min_interval: 30, max_interval: 60 });
  const [newTemplate, setNewTemplate] = useState({ niche: "", name: "", message: "" });
  const fileRef = useRef<HTMLInputElement>(null);

  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  async function loadLeads() {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterNiche) params.set("niche", filterNiche);
    if (filterStatus) params.set("status", filterStatus);
    const r = await fetch(`${API}/super-admin/prospects?${params}&limit=200`, { headers });
    const d = await r.json();
    setLeads(d.data ?? []);
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

  useEffect(() => { loadLeads(); loadTemplates(); loadStats(); }, [filterNiche, filterStatus]);

  async function importXLSX(e: any) {
    const file = e.target.files[0];
    if (!file) return;
    const data = await file.arrayBuffer();
    const wb = XLSX.read(data);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: "" }) as any[];
    console.log("Total linhas:", rows.length, "Colunas:", Object.keys(rows[0] || {}));

    const get = (r: any, ...keys: string[]) => {
      for (const k of keys) {
        const found = Object.keys(r).find(rk => rk.trim().toLowerCase() === k.toLowerCase());
        if (found && r[found] !== undefined && r[found] !== "") return r[found];
      }
      return "";
    };

    const leads = rows.map((r: any) => ({
      state: get(r, "Estado", "state", "UF", "uf", "Estado/UF"),
      city: get(r, "Cidade", "city", "Municipio", "Município"),
      niche: get(r, "Nicho Pesquisado", "Nicho", "niche", "nicho", "Segmento", "Categoria"),
      business_name: get(r, "Nome", "business_name", "nome", "Empresa", "Estabelecimento"),
      phone: get(r, "Telefone", "phone", "telefone", "Fone", "Celular", "WhatsApp", "Contato"),
      email: get(r, "Email", "email", "E-mail"),
      website: get(r, "Website", "website", "Site", "URL"),
      address: get(r, "Endereço", "address", "endereco", "Logradouro"),
      type: get(r, "Tipo", "type", "tipo", "Categoria", "Ramo"),
      rating: get(r, "avaliação", "Avaliação", "Nota", "rating") || 0,
      review_count: get(r, "Número de Avaliações", "Avaliações", "review_count", "Reviews") || 0,
      google_maps_link: get(r, "Link Google Maps", "Google Maps", "Maps", "google_maps_link", "ak Google Maps"),
    }));
    console.log("Primeiro lead processado:", leads[0]);

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

  async function sendCampaign() {
    setSending(true);
    setSendResult("Disparando...");
    const r = await fetch(`${API}/super-admin/prospects/send`, {
      method: "POST", headers,
      body: JSON.stringify(sendConfig),
    });
    const d = await r.json();
    setSendResult(d.data?.message ?? "Concluído");
    setSending(false);
    setTimeout(() => { loadLeads(); loadStats(); }, 3000);
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

  async function updateStatus(id: string, status: string) {
    await fetch(`${API}/super-admin/prospects/${id}/status`, {
      method: "PATCH", headers,
      body: JSON.stringify({ status }),
    });
    loadLeads();
  }

  const C = { bg: "#0B0F1A", card: "#141826", card2: "#1C2235", text: "#E2E8F0", muted: "#94A3B8", border: "#2A3150", gold: "#C9A96E", green: "#22C55E", red: "#EF4444" };

  return (
    <div style={{ background: C.bg, minHeight: "100vh", padding: 24, fontFamily: "Inter, sans-serif", color: C.text }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>🎯 Prospecção</h1>
      <p style={{ color: C.muted, marginBottom: 24 }}>Importar leads, gerenciar templates e disparar campanhas WhatsApp</p>

      {stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 8, marginBottom: 24 }}>
          {[
            { label: "Total", value: stats.totals?.total ?? 0, color: C.text },
            { label: "Pendentes", value: stats.totals?.pending ?? 0, color: C.muted },
            { label: "Enviados", value: stats.totals?.sent ?? 0, color: C.green },
            { label: "Respondidos", value: stats.totals?.replied ?? 0, color: "#3B82F6" },
            { label: "Convertidos", value: stats.totals?.converted ?? 0, color: C.gold },
            { label: "Blacklist", value: stats.totals?.blacklist ?? 0, color: C.red },
          ].map(s => (
            <div key={s.label} style={{ background: C.card, borderRadius: 10, padding: "12px 16px", textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, color: C.muted }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {(["leads", "templates", "send"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: "8px 20px", borderRadius: 8, border: `1px solid ${tab === t ? C.gold : C.border}`, background: tab === t ? C.gold + "20" : "transparent", color: tab === t ? C.gold : C.muted, cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
            {t === "leads" ? "Leads" : t === "templates" ? "Templates" : "Disparar"}
          </button>
        ))}
      </div>

      {tab === "leads" && (
        <div>
          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={importXLSX} style={{ display: "none" }} />
            <button onClick={() => fileRef.current?.click()}
              style={{ padding: "8px 16px", background: C.gold, color: "#000", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 700 }}>
              📥 Importar XLSX
            </button>
            <select value={filterNiche} onChange={e => setFilterNiche(e.target.value)}
              style={{ padding: "8px 12px", background: C.card2, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 13 }}>
              {NICHES.map(n => <option key={n.value} value={n.value}>{n.label}</option>)}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              style={{ padding: "8px 12px", background: C.card2, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 13 }}>
              <option value="">Todos os status</option>
              <option value="pending">Pendente</option>
              <option value="sent">Enviado</option>
              <option value="replied">Respondido</option>
              <option value="converted">Convertido</option>
              <option value="blacklist">Blacklist</option>
            </select>
            <span style={{ color: C.muted, fontSize: 13, padding: "8px 0" }}>{leads.length} leads</span>
          </div>

          {loading ? <div style={{ color: C.muted }}>Carregando...</div> : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: C.card2 }}>
                    {["Nome", "Nicho", "Cidade", "Telefone", "Avaliação", "Status", "Ações"].map(h => (
                      <th key={h} style={{ padding: "10px 12px", textAlign: "left", color: C.muted, fontWeight: 600, borderBottom: `1px solid ${C.border}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead: any) => (
                    <tr key={lead.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: "8px 12px" }}>{lead.business_name}</td>
                      <td style={{ padding: "8px 12px", color: C.muted }}>{lead.niche}</td>
                      <td style={{ padding: "8px 12px", color: C.muted }}>{lead.city}</td>
                      <td style={{ padding: "8px 12px" }}>{lead.phone}</td>
                      <td style={{ padding: "8px 12px", color: C.gold }}>{lead.rating} ⭐ ({lead.review_count})</td>
                      <td style={{ padding: "8px 12px" }}>
                        <span style={{ padding: "2px 8px", borderRadius: 99, background: (STATUS_COLORS[lead.status] ?? C.muted) + "25", color: STATUS_COLORS[lead.status] ?? C.muted, fontSize: 11, fontWeight: 700 }}>
                          {lead.status}
                        </span>
                      </td>
                      <td style={{ padding: "8px 12px" }}>
                        <select value={lead.status} onChange={e => updateStatus(lead.id, e.target.value)}
                          style={{ fontSize: 11, background: C.card2, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, padding: "4px 8px" }}>
                          <option value="pending">Pendente</option>
                          <option value="sent">Enviado</option>
                          <option value="replied">Respondido</option>
                          <option value="converted">Convertido</option>
                          <option value="blacklist">Blacklist</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "templates" && (
        <div>
          <div style={{ background: C.card, borderRadius: 12, padding: 20, marginBottom: 20 }}>
            <h3 style={{ marginBottom: 16, fontSize: 16 }}>Novo Template</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <select value={newTemplate.niche} onChange={e => setNewTemplate(p => ({ ...p, niche: e.target.value }))}
                style={{ padding: "10px 12px", background: C.card2, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text }}>
                <option value="">Selecione o nicho</option>
                {NICHES.filter(n => n.value).map(n => <option key={n.value} value={n.value}>{n.label}</option>)}
              </select>
              <input value={newTemplate.name} onChange={e => setNewTemplate(p => ({ ...p, name: e.target.value }))}
                placeholder="Nome do template"
                style={{ padding: "10px 12px", background: C.card2, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text }} />
            </div>
            <textarea value={newTemplate.message} onChange={e => setNewTemplate(p => ({ ...p, message: e.target.value }))}
              placeholder="Mensagem... Use {nome}, {cidade}, {nicho} como variáveis"
              rows={4}
              style={{ width: "100%", padding: "10px 12px", background: C.card2, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, resize: "vertical", boxSizing: "border-box", marginBottom: 12 }} />
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

      {tab === "send" && (
        <div style={{ background: C.card, borderRadius: 12, padding: 24, maxWidth: 500 }}>
          <h3 style={{ marginBottom: 20, fontSize: 16 }}>Configurar Disparo</h3>
          <div style={{ display: "grid", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: C.muted, display: "block", marginBottom: 6 }}>Nicho (vazio = todos)</label>
              <select value={sendConfig.niche} onChange={e => setSendConfig(p => ({ ...p, niche: e.target.value }))}
                style={{ width: "100%", padding: "10px 12px", background: C.card2, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text }}>
                {NICHES.map(n => <option key={n.value} value={n.value}>{n.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: C.muted, display: "block", marginBottom: 6 }}>Limite diário</label>
              <input type="number" value={sendConfig.daily_limit} onChange={e => setSendConfig(p => ({ ...p, daily_limit: Number(e.target.value) }))}
                style={{ width: "100%", padding: "10px 12px", background: C.card2, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, boxSizing: "border-box" }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: C.muted, display: "block", marginBottom: 6 }}>Intervalo mínimo (s)</label>
                <input type="number" value={sendConfig.min_interval} onChange={e => setSendConfig(p => ({ ...p, min_interval: Number(e.target.value) }))}
                  style={{ width: "100%", padding: "10px 12px", background: C.card2, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: C.muted, display: "block", marginBottom: 6 }}>Intervalo máximo (s)</label>
                <input type="number" value={sendConfig.max_interval} onChange={e => setSendConfig(p => ({ ...p, max_interval: Number(e.target.value) }))}
                  style={{ width: "100%", padding: "10px 12px", background: C.card2, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, boxSizing: "border-box" }} />
              </div>
            </div>
            <button onClick={sendCampaign} disabled={sending}
              style={{ padding: "12px 24px", background: sending ? C.muted : C.green, color: "#000", borderRadius: 8, border: "none", cursor: sending ? "not-allowed" : "pointer", fontWeight: 800, fontSize: 15, marginTop: 8 }}>
              {sending ? "Disparando..." : "🚀 Iniciar Disparo"}
            </button>
            {sendResult && <div style={{ color: C.green, fontSize: 13, textAlign: "center" }}>{sendResult}</div>}
          </div>
        </div>
      )}
    </div>
  );
}