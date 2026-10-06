// Aulas em turma: Painel do studio (tela inicial do Pilates). Só exibe os números calculados no backend.
// "A receber" e "Atrasados" entram quando as mensalidades gerarem lançamento no Financeiro.
// API: GET /classes/dashboard.
import { useEffect, useState } from "react";
import { api } from "../api/client";
import { type Theme, fmtDay, PageHeader, Button, Card, Notice, Empty } from "./ui";

export default function StudioDashboardPage({ C, FD, FB }: Theme) {
  const t = { C, FD, FB };
  const [data, setData] = useState<any | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true); setError("");
    try { const r: any = await api.get("/classes/dashboard"); setData(r.data); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const big = (value: number | string, label: string, sub?: string) => (
    <Card C={C} style={{ padding: 22 }}>
      <div style={{ fontSize: 15, color: C.textSec, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 44, fontWeight: 800, color: C.text, fontFamily: FD, lineHeight: 1.1, marginTop: 6 }}>{value}</div>
      {sub && <div style={{ fontSize: 15, color: C.textMuted, marginTop: 6 }}>{sub}</div>}
    </Card>
  );

  return (
    <div style={{ fontFamily: FB }}>
      <PageHeader {...t} title="Painel do studio" subtitle={data ? `Hoje, ${fmtDay(data.date)}` : "Resumo do dia"}
        action={<Button {...t} variant="secondary" onClick={load} disabled={loading}>{loading ? "Atualizando..." : "Atualizar"}</Button>} />
      {error && <Notice C={C}>Não foi possível carregar o painel ({error}). <Button {...t} small variant="secondary" onClick={load}>Tentar de novo</Button></Notice>}
      {loading && !data ? <Empty C={C}>Carregando...</Empty> : data && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
          {big(data.activeStudents, "Alunos ativos", "com matrícula ativa hoje")}
          {big(data.today.classes, "Aulas hoje",
            data.today.classes ? `${data.today.students} ${data.today.students === 1 ? "aluno" : "alunos"} de ${data.today.capacity} vagas` : "nenhuma aula hoje")}
        </div>
      )}
    </div>
  );
}
