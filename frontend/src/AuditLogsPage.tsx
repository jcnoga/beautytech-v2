import { useEffect, useState } from "react";

const API = ((import.meta as any).env?.VITE_API_URL ?? "http://localhost:3000/api/v1").replace(/\/+$/, "");
const C = {
  bg: "#0B0F1A", card: "#141826", border: "rgba(255,255,255,0.07)",
  rose: "#C9847A", gold: "#C9A96E", sage: "#7EB8A0",
  text: "#E2E8F0", textMuted: "#94A3B8", surface: "#0F1320",
  ruby: "#E05C5C", sapphire: "#60A5FA",
};
const FB = "'Outfit', sans-serif";

function getToken() {
  const k = Object.keys(localStorage).find(x => x.includes("auth-token") || x.includes("sb-"));
  return k ? JSON.parse(localStorage.getItem(k) || "{}").access_token : "";
}

const ACTION_LABELS: any = {
  "appointment.created":   { label: "Agendamento criado",    color: C.sage },
  "appointment.cancelled": { label: "Agendamento cancelado", color: C.ruby },
  "appointment.completed": { label: "Atendimento concluido", color: C.gold },
  "client.created":        { label: "Cliente cadastrado",    color: C.sapphire },
  "client.updated":        { label: "Cliente atualizado",    color: C.sapphire },
  "professional.created":  { label: "Profissional adicionado", color: C.rose },
  "service.created":       { label: "Servico criado",        color: C.rose },
  "financial.created":     { label: "Transacao financeira",  color: C.gold },
  "user.login":            { label: "Login realizado",       color: C.textMuted },
};

function fmtDate(d: string) {
  if (!d) return "-";
  return new Date(d).toLocaleString("pt-BR", { day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit" });
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const token = getToken();
    fetch(`${API}/api/v1/audit-logs?limit=100`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(d => setLogs(d.data ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const actions = [...new Set(logs.map((l: any) => l.action))];

  const filtered = logs.filter((l: any) => {
    if (filter !== "all" && l.action !== filter) return false;
    if (search && !l.action.includes(search.toLowerCase()) && !JSON.stringify(l.newData ?? {}).toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div style={{ fontFamily: FB }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: C.text, marginBottom: 4 }}>Log de Ações</h1>
        <p style={{ fontSize: 13, color: C.textMuted }}>Histórico de ações realizadas no sistema</p>
      </div>

      {/* Filtros */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <input
          placeholder="Buscar..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ padding: "8px 14px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, fontSize: 13, fontFamily: FB, outline: "none", width: 200 }}
        />
        <button onClick={() => setFilter("all")}
          style={{ padding: "7px 16px", borderRadius: 8, border: `1px solid ${filter === "all" ? C.rose : C.border}`, background: filter === "all" ? `${C.rose}15` : C.card, color: filter === "all" ? C.rose : C.textMuted, fontSize: 12, cursor: "pointer", fontFamily: FB, fontWeight: 600 }}>
          Todos
        </button>
        {actions.map(a => {
          const meta = ACTION_LABELS[a] ?? { label: a, color: C.textMuted };
          return (
            <button key={a} onClick={() => setFilter(a)}
              style={{ padding: "7px 16px", borderRadius: 8, border: `1px solid ${filter === a ? meta.color : C.border}`, background: filter === a ? `${meta.color}15` : C.card, color: filter === a ? meta.color : C.textMuted, fontSize: 12, cursor: "pointer", fontFamily: FB, fontWeight: 600 }}>
              {meta.label}
            </button>
          );
        })}
      </div>

      {/* Contagem */}
      <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 16 }}>
        {loading ? "Carregando..." : `${filtered.length} registro${filtered.length !== 1 ? "s" : ""}`}
      </div>

      {/* Lista */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: C.textMuted }}>Carregando...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: C.textMuted }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
          <div>Nenhum log encontrado.</div>
          <div style={{ fontSize: 12, marginTop: 8 }}>As ações realizadas no sistema aparecerão aqui.</div>
        </div>
      ) : (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: C.surface }}>
                {["Data/Hora", "Ação", "Tabela", "Detalhes"].map(h => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: ".08em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((log: any, i: number) => {
                const meta = ACTION_LABELS[log.action] ?? { label: log.action, color: C.textMuted };
                const details = log.newData ? Object.entries(log.newData).map(([k, v]) => `${k}: ${v}`).join(" · ") : "-";
                return (
                  <tr key={log.id ?? i} style={{ borderTop: `1px solid ${C.border}` }}>
                    <td style={{ padding: "12px 16px", fontSize: 12, color: C.textMuted, whiteSpace: "nowrap" }}>{fmtDate(log.createdAt)}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: meta.color, padding: "3px 10px", borderRadius: 20, background: `${meta.color}15` }}>{meta.label}</span>
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 12, color: C.textMuted }}>{log.tableName ?? "-"}</td>
                    <td style={{ padding: "12px 16px", fontSize: 12, color: C.textMuted, maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{details}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
