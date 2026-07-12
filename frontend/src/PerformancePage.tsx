import { useEffect, useState, useCallback } from "react";
import { api } from "./api/client";

const FB = "'Inter', sans-serif";
const FD = "'Playfair Display', serif";

interface PerformanceData {
  period: string;
  revenueToday: number;
  revenueWeek: number;
  revenueMonth: number;
  revenueYear: number;
  ticketMedio: number;
  receitaPorServico: { servico: string; receita: number }[];
  faturamentoPorProfissional: { id: string; nome: string; receita: number; atendimentos: number }[];
  totalAgendamentos: number;
  compareceram: number;
  cancelados: number;
  noShow: number;
  taxaComparecimento: number;
  taxaCancelamento: number;
  taxaNoShow: number;
  minutosDisponiveis: number;
  minutosUsados: number;
  ocupacaoAgenda: number;
  generatedAt: string;
}

const PERIODOS = [
  { id: "today", label: "Hoje" },
  { id: "week", label: "Semana" },
  { id: "month", label: "Mês" },
  { id: "year", label: "Ano" },
];

function brl(v: number | undefined | null) {
  return (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function pct(v: number | undefined | null) {
  return `${(Number(v) || 0).toFixed(1)}%`;
}

// Props C/FD/FB são injetadas pelo App.tsx no mesmo padrão de outras páginas
export default function PerformancePage({ C }: { C: any }) {
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("month");

  const load = useCallback(async (p: string) => {
    setLoading(true);
    try {
      const r: any = await api.get("/dashboard/performance", { period: p });
      setData(r.data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(period); }, [period, load]);

  const cor = C ?? {
    bg: "#0B0F1A", card: "#141826", border: "#2A3150",
    text: "#E2E8F0", textMuted: "#94A3B8",
    gold: "#C9A96E", rose: "#C9847A", sage: "#7C9473", sapphire: "#5B8DEF",
  };

  const card = (children: React.ReactNode, extra: any = {}) => (
    <div style={{ background: cor.card, border: `1px solid ${cor.border}`, borderRadius: 16, padding: 20, ...extra }}>
      {children}
    </div>
  );

  const kpiLabel = (text: string) => (
    <div style={{ fontSize: 11, color: cor.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6, fontFamily: FB }}>
      {text}
    </div>
  );

  const kpiValue = (text: string, color?: string) => (
    <div style={{ fontSize: 24, fontWeight: 700, color: color ?? cor.text, fontFamily: FD }}>
      {text}
    </div>
  );

  if (loading && !data) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 400 }}>
        <div style={{ color: cor.textMuted, fontFamily: FB }}>Carregando desempenho...</div>
      </div>
    );
  }

  const d = data;

  return (
    <div style={{ fontFamily: FB }}>
      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: FD, fontSize: 28, fontWeight: 700, color: cor.text, margin: 0 }}>Desempenho</h1>
          <div style={{ fontSize: 13, color: cor.textMuted, marginTop: 4 }}>
            Indicadores estratégicos do seu negócio
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, background: cor.card, border: `1px solid ${cor.border}`, borderRadius: 10, padding: 4 }}>
          {PERIODOS.map(p => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              style={{
                padding: "6px 16px", borderRadius: 8, border: "none", cursor: "pointer",
                fontFamily: FB, fontSize: 13, fontWeight: 600,
                background: period === p.id ? cor.gold : "transparent",
                color: period === p.id ? "#1a1a1a" : cor.textMuted,
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* 1. FATURAMENTO (Hoje / Semana / Mes / Ano) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 20 }}>
        {card(<>{kpiLabel("Faturamento Hoje")}{kpiValue(brl(d?.revenueToday), cor.sage)}</>)}
        {card(<>{kpiLabel("Faturamento Semana")}{kpiValue(brl(d?.revenueWeek), cor.sage)}</>)}
        {card(<>{kpiLabel("Faturamento Mês")}{kpiValue(brl(d?.revenueMonth), cor.sage)}</>)}
        {card(<>{kpiLabel("Faturamento Ano")}{kpiValue(brl(d?.revenueYear), cor.sage)}</>)}
      </div>

      {/* 2, 11-15: Ticket medio, agendamentos, comparecimento, cancelamento, no-show, ocupacao */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 20 }}>
        {card(<>{kpiLabel(`Ticket Médio (${PERIODOS.find(p=>p.id===period)?.label})`)}{kpiValue(brl(d?.ticketMedio), cor.gold)}</>)}
        {card(<>{kpiLabel("Total de Agendamentos")}{kpiValue(String(d?.totalAgendamentos ?? 0))}</>)}
        {card(<>{kpiLabel("Taxa de Comparecimento")}{kpiValue(pct(d?.taxaComparecimento), cor.sage)}</>)}
        {card(<>{kpiLabel("Taxa de Cancelamento")}{kpiValue(pct(d?.taxaCancelamento), cor.rose)}</>)}
        {card(<>{kpiLabel("Taxa de No-Show")}{kpiValue(pct(d?.taxaNoShow), cor.rose)}</>)}
        {card(<>
          {kpiLabel("Ocupação da Agenda")}
          {kpiValue(pct(d?.ocupacaoAgenda), cor.sapphire)}
          <div style={{ height: 6, background: cor.border, borderRadius: 3, marginTop: 10, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${Math.min(d?.ocupacaoAgenda ?? 0, 100)}%`, background: cor.sapphire, borderRadius: 3 }} />
          </div>
        </>)}
      </div>

      {/* 3. Receita por Servico + 5. Faturamento por Profissional */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        {card(<>
          <div style={{ fontSize: 14, fontWeight: 700, color: cor.text, marginBottom: 14, fontFamily: FD }}>
            Receita por Serviço
          </div>
          {(!d?.receitaPorServico || d.receitaPorServico.length === 0) ? (
            <div style={{ color: cor.textMuted, fontSize: 13 }}>Nenhum atendimento concluído no período.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {d.receitaPorServico.map((s, i) => {
                const max = d.receitaPorServico[0]?.receita || 1;
                const w = Math.max((s.receita / max) * 100, 4);
                return (
                  <div key={i}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                      <span style={{ color: cor.text }}>{s.servico}</span>
                      <span style={{ color: cor.gold, fontWeight: 600 }}>{brl(s.receita)}</span>
                    </div>
                    <div style={{ height: 6, background: cor.border, borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${w}%`, background: cor.gold, borderRadius: 3 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>)}

        {card(<>
          <div style={{ fontSize: 14, fontWeight: 700, color: cor.text, marginBottom: 14, fontFamily: FD }}>
            Faturamento por Profissional
          </div>
          {(!d?.faturamentoPorProfissional || d.faturamentoPorProfissional.length === 0) ? (
            <div style={{ color: cor.textMuted, fontSize: 13 }}>Nenhum profissional ativo cadastrado.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {d.faturamentoPorProfissional.map((p, i) => {
                const max = d.faturamentoPorProfissional[0]?.receita || 1;
                const w = Math.max((p.receita / max) * 100, 4);
                return (
                  <div key={p.id}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                      <span style={{ color: cor.text }}>
                        {i === 0 && p.receita > 0 ? "🏆 " : ""}{p.nome}
                        <span style={{ color: cor.textMuted, fontSize: 11 }}> ({p.atendimentos} atend.)</span>
                      </span>
                      <span style={{ color: cor.rose, fontWeight: 600 }}>{brl(p.receita)}</span>
                    </div>
                    <div style={{ height: 6, background: cor.border, borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${w}%`, background: cor.rose, borderRadius: 3 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>)}
      </div>

      <div style={{ fontSize: 11, color: cor.textMuted, textAlign: "right" }}>
        Atualizado {d ? new Date(d.generatedAt).toLocaleString("pt-BR") : ""}
      </div>
    </div>
  );
}
