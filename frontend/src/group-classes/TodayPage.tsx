// Aulas em turma: Aulas de hoje (C7, item 13). Feita para o celular: toque na aula → alunos com botões
// grandes Presente / Falta / Justificada, um toque salva na hora. No topo, "Pendentes": aulas de dias
// anteriores com aluno ainda sem presença. O que cada perfil pode lançar (instrutor só nas dele, prazo),
// crédito e reposição são decididos no backend; "Marcar todos presentes" passa pela prévia.
// API: GET /classes/sessions/today, GET /classes/sessions/pending, GET /classes/sessions/:id,
//      POST /classes/bookings/:id/attendance, POST /classes/sessions/:id/attendance-all (?preview=1).
import { useEffect, useState } from "react";
import { api } from "../api/client";
import { type Theme, BOOKING_KIND, BOOKING_STATUS, Button, Badge, Card, Modal, Notice, Empty, fmtDay, todaySP, weekday, WEEKDAYS } from "./ui";

const MARKS: [string, string, (C: any) => string][] = [
  ["present", "Presente", (C) => C.sage],
  ["absent", "Falta", (C) => C.ruby],
  ["excused", "Justificada", (C) => C.gold],
];
const INACTIVE = ["cancelled", "cancelled_late", "cancelled_studio", "paused"];

function Attendance({ C, FD, FB, sessionId, onChanged }: Theme & { sessionId: string; onChanged: () => void }) {
  const t = { C, FD, FB };
  const [s, setS] = useState<any>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);

  const load = async () => { const r: any = await api.get(`/classes/sessions/${sessionId}`); setS(r.data); };
  useEffect(() => { setS(null); setError(""); setConfirm(null); load().catch((e) => setError(e.message)); }, [sessionId]);

  const mark = async (b: any, status: string) => {
    if (b.status === status) return;
    setSaving(b.id); setError("");
    try {
      const r: any = await api.post(`/classes/bookings/${b.id}/attendance`, { status });
      setS((cur: any) => ({ ...cur, bookings: cur.bookings.map((x: any) => (x.id === b.id ? { ...x, status: r.data.status } : x)) }));
      onChanged();
    } catch (e: any) { setError(`${b.student_name}: ${e.message}`); }
    finally { setSaving(null); }
  };
  const previewAll = async () => {
    setError("");
    try {
      const r: any = await api.post(`/classes/sessions/${sessionId}/attendance-all?preview=1`);
      const d = r.data;
      setConfirm(d.marked === 0 ? "" : `Marcar ${d.marked} aluno(s) como presentes${d.creditsConsumed ? `; ${d.creditsConsumed} aula(s) de pacote serão descontadas` : ""}.`);
    } catch (e: any) { setError(e.message); }
  };
  const markAll = async () => {
    setSaving("all"); setError("");
    try { await api.post(`/classes/sessions/${sessionId}/attendance-all`); setConfirm(null); await load(); onChanged(); }
    catch (e: any) { setError(e.message); }
    finally { setSaving(null); }
  };

  if (!s) return error ? <Notice C={C}>{error}</Notice> : <div style={{ color: C.textMuted, padding: 20 }}>Carregando...</div>;
  const list = (s.bookings ?? []).filter((b: any) => !INACTIVE.includes(b.status));
  const out = (s.bookings ?? []).filter((b: any) => INACTIVE.includes(b.status));
  const left = list.filter((b: any) => b.status === "booked").length;

  return (
    <div>
      <div style={{ fontSize: 14, color: C.text, marginBottom: 12 }}>
        {fmtDay(s.session_date)} · {s.start_local}–{s.end_local} · {s.modality_name ?? "Aula"} · {s.instructor_name}
      </div>
      {s.status === "cancelled" && <Notice C={C}>Esta aula foi cancelada pelo studio.</Notice>}
      {error && <Notice C={C}>{error}</Notice>}
      {list.length === 0 && <Empty C={C}>Nenhum aluno nesta aula.</Empty>}
      {list.map((b: any) => (
        <div key={b.id} style={{ padding: "12px 0", borderBottom: `1px solid ${C.border}`, opacity: saving === b.id ? 0.6 : 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{b.student_name}</div>
            <div style={{ fontSize: 12, color: C.textMuted, whiteSpace: "nowrap" }}>{BOOKING_KIND[b.kind] ?? b.kind}</div>
          </div>
          {b.declared_restrictions && (
            <div style={{ fontSize: 13, fontWeight: 600, color: C.gold, background: `${C.gold}18`, border: `1px solid ${C.gold}44`, borderRadius: 8, padding: "6px 8px", marginTop: 6 }}>
              ⚠ {b.declared_restrictions}
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 10 }}>
            {MARKS.map(([v, label, color]) => {
              const on = b.status === v;
              return (
                <button key={v} type="button" onClick={() => mark(b, v)} disabled={!!saving || s.status === "cancelled"} aria-pressed={on}
                  style={{ minHeight: 52, borderRadius: 12, fontSize: 15, fontWeight: 700, fontFamily: FB, cursor: "pointer",
                    border: `2px solid ${on ? color(C) : C.border}`, background: on ? `${color(C)}30` : "transparent", color: on ? color(C) : C.text }}>
                  {on ? "✓ " : ""}{label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      {out.length > 0 && (
        <div style={{ fontSize: 12, color: C.textMuted, marginTop: 10 }}>
          Fora desta aula: {out.map((b: any) => `${b.student_name} (${(BOOKING_STATUS[b.status]?.label ?? b.status).toLowerCase()})`).join(", ")}
        </div>
      )}
      {left > 0 && s.status !== "cancelled" && (
        <div style={{ marginTop: 16 }}>
          {confirm === null ? (
            <Button {...t} onClick={previewAll} disabled={!!saving} style={{ width: "100%", minHeight: 50 }}>Marcar todos presentes ({left})</Button>
          ) : (
            <div style={{ border: `1px solid ${C.gold}66`, background: `${C.gold}14`, borderRadius: 12, padding: 12 }}>
              <div style={{ fontSize: 14, color: C.text, marginBottom: 10 }}>{confirm || "Ninguém sem presença."}</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <Button {...t} variant="secondary" onClick={() => setConfirm(null)}>Voltar</Button>
                <Button {...t} onClick={markAll} disabled={saving === "all" || !confirm}>Confirmar</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SessionCard({ C, s, onOpen, showDate, pendingCount }: { C: any; s: any; onOpen: () => void; showDate?: boolean; pendingCount?: number }) {
  const cancelled = s.status === "cancelled";
  return (
    <Card C={C} onClick={onOpen} style={{ padding: 14, opacity: cancelled ? 0.55 : 1 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: C.text }}>
          {showDate ? `${WEEKDAYS[weekday(s.session_date)].slice(0, 3)} ${fmtDay(s.session_date).slice(0, 5)} · ` : ""}{s.start_local}
        </div>
        <div style={{ fontSize: 13, color: C.textMuted }}>{s.taken}/{s.capacity}</div>
      </div>
      <div style={{ fontSize: 14, color: C.text, marginTop: 4 }}>{s.modality_name ?? "Aula"} · {s.instructor_name}</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
        {cancelled && <Badge label="Cancelada" color={C.ruby} />}
        {pendingCount !== undefined && <Badge label={`${pendingCount} sem presença`} color={C.gold} />}
        {pendingCount === undefined && s.pending_attendance && <Badge label="Presença pendente" color={C.gold} />}
        {s.room && <Badge label={s.room} color={C.textMuted} />}
      </div>
    </Card>
  );
}

export default function TodayPage({ C, FD, FB }: Theme) {
  const t = { C, FD, FB };
  const [today, setToday] = useState<any[]>([]);
  const [pending, setPending] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const load = async () => {
    setError("");
    try {
      const [a, p]: any = await Promise.all([api.get("/classes/sessions/today"), api.get("/classes/sessions/pending")]);
      setToday(a.data?.today ?? []); setPending(p.data ?? []);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  const d = todaySP();

  return (
    <div style={{ fontFamily: FB, maxWidth: 720 }}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontFamily: FD, fontSize: 26, color: C.text, margin: 0 }}>Aulas de hoje</h1>
        <div style={{ fontSize: 13, color: C.textMuted, marginTop: 4 }}>{WEEKDAYS[weekday(d)]}, {fmtDay(d)} · toque na aula para lançar a presença</div>
      </div>
      {error && <Notice C={C}>{error}</Notice>}
      {pending.length > 0 && (
        <div style={{ marginBottom: 20, border: `1px solid ${C.gold}55`, background: `${C.gold}0F`, borderRadius: 14, padding: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.gold, marginBottom: 8 }}>Pendentes: {pending.length} aula(s) passada(s) sem presença lançada</div>
          <div style={{ display: "grid", gap: 8 }}>
            {pending.map((s) => <SessionCard key={s.id} C={C} s={s} showDate pendingCount={s.pending_count} onOpen={() => setOpenId(s.id)} />)}
          </div>
        </div>
      )}
      {loading ? <Empty C={C}>Carregando...</Empty> : today.length === 0 ? <Empty C={C}>Nenhuma aula hoje.</Empty> : (
        <div style={{ display: "grid", gap: 10 }}>
          {today.map((s) => <SessionCard key={s.id} C={C} s={s} onOpen={() => setOpenId(s.id)} />)}
        </div>
      )}
      <Modal {...t} open={!!openId} onClose={() => { setOpenId(null); load(); }} title="Presença" width={560}>
        {openId && <Attendance {...t} sessionId={openId} onChanged={() => {}} />}
      </Modal>
    </div>
  );
}
