// Aulas em turma: Histórico do aluno (itens 13 e 15, C5). Cada movimento de crédito do pacote e de
// reposição, com o motivo e a regra aplicada (studio ou plano), já montados pelo backend. As
// reposições aparecem separadas: disponíveis, geradas, usadas e vencidas.
// API: GET /classes/bookings/history?studentId=, GET /classes/makeups?studentId=.
import { useEffect, useState } from "react";
import { api } from "../api/client";
import { type Theme, Button, Notice, fmtDay } from "./ui";

const FILTERS: [string, string][] = [["all", "Tudo"], ["credit", "Créditos do pacote"], ["makeup", "Reposições"]];
const EVENT_LABEL: Record<string, string> = {
  makeup_generated: "Reposição gerada", makeup_used: "Reposição usada", makeup_expired: "Reposição vencida",
};
const dayOf = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });

export default function StudentHistory({ C, FD, FB, studentId }: Theme & { studentId: string }) {
  const t = { C, FD, FB };
  const [items, setItems] = useState<any[] | null>(null);
  const [makeups, setMakeups] = useState<any[]>([]);
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState("");

  useEffect(() => {
    setItems(null); setError("");
    Promise.all([api.get<any>("/classes/bookings/history", { studentId }), api.get<any>("/classes/makeups", { studentId })])
      .then(([h, m]) => { setItems(h.data ?? []); setMakeups(m.data ?? []); })
      .catch((e) => { setError(e.message); setItems([]); });
  }, [studentId]);

  if (items === null) return <div style={{ fontSize: 13, color: C.textMuted }}>Carregando...</div>;
  const count = (ev: string) => items.filter((i) => i.event === ev).length;
  const available = makeups.filter((m) => m.status === "available");
  const tiles: [string, number, string][] = [
    ["Disponíveis", available.length, C.sage],
    ["Geradas", count("makeup_generated"), C.text],
    ["Usadas", count("makeup_used"), C.textMuted],
    ["Vencidas", count("makeup_expired"), C.ruby],
  ];
  const shown = filter === "all" ? items : items.filter((i) => i.type === filter);

  return (
    <div>
      {error && <Notice C={C}>{error}</Notice>}
      <div style={{ fontSize: 12, fontWeight: 700, color: C.textMuted, marginBottom: 6 }}>Reposições</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, marginBottom: 8 }}>
        {tiles.map(([label, n, color]) => (
          <div key={label} style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: "8px 6px", textAlign: "center" }}>
            <div style={{ fontSize: 20, fontWeight: 700, color }}>{n}</div>
            <div style={{ fontSize: 11, color: C.textMuted }}>{label}</div>
          </div>
        ))}
      </div>
      {available.length > 0 && (
        <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 12 }}>
          Disponíveis: {available.map((m) => `válida até ${fmtDay(m.expires_on)}${m.plan_name ? ` (${m.plan_name})` : ""}`).join("; ")}
        </div>
      )}

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "8px 0" }}>
        {FILTERS.map(([v, l]) => (
          <Button key={v} {...t} small variant={filter === v ? "primary" : "secondary"} onClick={() => setFilter(v)}>{l}</Button>
        ))}
      </div>
      {shown.length === 0 ? (
        <div style={{ fontSize: 13, color: C.textMuted, padding: "8px 0" }}>
          {items.length === 0 ? "Nenhum movimento ainda. Presenças, faltas, cancelamentos e reposições aparecem aqui." : "Nenhum movimento neste filtro."}
        </div>
      ) : shown.map((i, k) => {
        const color = i.delta > 0 ? C.sage : i.delta < 0 ? C.ruby : C.textMuted;
        return (
          <div key={k} style={{ display: "grid", gridTemplateColumns: "76px 1fr", gap: 10, padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 12, color: C.textMuted }}>{dayOf(i.at)}</div>
            <div>
              {EVENT_LABEL[i.event] && <div style={{ fontSize: 11, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: 0.4 }}>{EVENT_LABEL[i.event]}</div>}
              <div style={{ fontSize: 13, color: i.delta ? color : C.text }}>{i.text}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
