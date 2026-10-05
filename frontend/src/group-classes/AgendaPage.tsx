// Aulas em turma: Agenda de aulas (itens 8, 9, 15, C3, C4). Semana a semana, com filtro por instrutor.
// Cada aula mostra inscritos/capacidade e vagas (calculadas no backend); tocar abre o SessionPanel.
// "+ Aula avulsa" cria uma aula fora da grade (ex.: avaliação inicial).
// API: GET /classes/sessions?from&to&instructorId, POST /classes/sessions, /class-instructors, /classes/modalities.
import { useEffect, useState } from "react";
import { api } from "../api/client";
import { type Theme, WEEKDAYS, PageHeader, Button, Field, inputStyle, Badge, Card, Modal, Grid, Notice, Empty, todaySP, addDays, weekday, fmtDay } from "./ui";
import { CLASS_TYPE_LABELS } from "./SchedulesPage";
import SessionPanel from "./SessionPanel";

const mondayOf = (d: string) => addDays(d, -((weekday(d) + 6) % 7));
const NEW = { date: "", startTime: "08:00", instructorId: "", classType: "assessment", modalityId: "", durationMinutes: "", capacity: "", room: "", notes: "" };

export default function AgendaPage({ C, FD, FB }: Theme) {
  const t = { C, FD, FB };
  const inp = inputStyle(C, FB);
  const [monday, setMonday] = useState(() => mondayOf(todaySP()));
  const [instructorId, setInstructorId] = useState("");
  const [instructors, setInstructors] = useState<any[]>([]);
  const [modalities, setModalities] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState<any>(null);
  const [createError, setCreateError] = useState("");

  const load = async () => {
    setLoading(true); setError("");
    try { const r: any = await api.get("/classes/sessions", { from: monday, to: addDays(monday, 6), instructorId }); setSessions(r.data ?? []); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [monday, instructorId]);
  useEffect(() => {
    api.get<any>("/class-instructors").then((r) => setInstructors((r.data ?? []).filter((i: any) => i.isActive))).catch(() => {});
    api.get<any>("/classes/modalities").then((r) => setModalities((r.data ?? []).filter((m: any) => m.isActive))).catch(() => {});
  }, []);

  const create = async () => {
    setCreateError("");
    const n = (v: string) => (v === "" ? undefined : Number(v));
    try {
      const r: any = await api.post("/classes/sessions", { ...creating, modalityId: creating.modalityId || null,
        durationMinutes: n(creating.durationMinutes), capacity: n(creating.capacity) });
      setCreating(null); await load(); setOpenId(r.data.id);
    } catch (e: any) { setCreateError(e.message); }
  };

  const today = todaySP();
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const setC = (k: string) => (e: any) => setCreating((c: any) => ({ ...c, [k]: e.target.value }));

  return (
    <div style={{ fontFamily: FB }}>
      <PageHeader {...t} title="Agenda de aulas" subtitle="Aulas da semana com vagas. Toque numa aula para inscrever, cancelar ou trocar o instrutor."
        action={<Button {...t} onClick={() => { setCreateError(""); setCreating({ ...NEW, date: today, instructorId: instructors[0]?.id ?? "" }); }}>+ Aula avulsa</Button>} />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 16 }}>
        <Button {...t} small variant="secondary" onClick={() => setMonday(addDays(monday, -7))}>‹ Semana anterior</Button>
        <Button {...t} small variant="secondary" onClick={() => setMonday(mondayOf(today))}>Esta semana</Button>
        <Button {...t} small variant="secondary" onClick={() => setMonday(addDays(monday, 7))}>Próxima ›</Button>
        <span style={{ fontSize: 13, color: C.textMuted }}>{fmtDay(monday)} a {fmtDay(addDays(monday, 6))}</span>
        <select value={instructorId} onChange={(e) => setInstructorId(e.target.value)} style={{ ...inp, width: "auto", minWidth: 180, marginLeft: "auto" }}>
          <option value="">Todos os instrutores</option>
          {instructors.map((i) => <option key={i.id} value={i.id}>{i.fullName}</option>)}
        </select>
      </div>
      {error && <Notice C={C}>{error}</Notice>}
      {loading ? <Empty C={C}>Carregando...</Empty> : sessions.length === 0 ? (
        <Empty C={C}>Nenhuma aula nesta semana. Monte a Grade (menu Grade) ou crie uma aula avulsa.</Empty>
      ) : days.map((d) => {
        const list = sessions.filter((s) => s.session_date === d);
        if (!list.length) return null;
        return (
          <div key={d} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: d === today ? C.rose : C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
              {WEEKDAYS[weekday(d)]} {fmtDay(d).slice(0, 5)}{d === today ? " · hoje" : ""}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 10 }}>
              {list.map((s) => {
                const cancelled = s.status === "cancelled";
                const free = Math.max(Number(s.capacity) - Number(s.taken), 0);
                return (
                  <Card key={s.id} C={C} onClick={() => setOpenId(s.id)} style={{ opacity: cancelled ? 0.55 : 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
                      <div style={{ fontWeight: 700, color: C.text, fontSize: 16, textDecoration: cancelled ? "line-through" : "none" }}>{s.start_local}–{s.end_local}</div>
                      {!cancelled && <div style={{ fontSize: 13, fontWeight: 700, color: free === 0 ? C.ruby : C.sage, whiteSpace: "nowrap" }}>{s.taken}/{s.capacity}</div>}
                    </div>
                    <div style={{ fontSize: 13, color: C.text, marginTop: 4 }}>{s.modality_name ?? "Aula"} · {s.instructor_name}</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                      {cancelled ? <Badge label="Cancelada" color={C.ruby} /> : free === 0 ? <Badge label="Turma lotada" color={C.ruby} /> : <Badge label={`${free} vaga(s)`} color={C.sage} />}
                      {s.class_type !== "group" && <Badge label={CLASS_TYPE_LABELS[s.class_type] ?? s.class_type} color={C.gold} />}
                      {!s.schedule_id && <Badge label="Avulsa" color={C.sapphire ?? C.gold} />}
                      {s.pending_attendance && <Badge label="Presença pendente" color={C.gold} />}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}

      <Modal {...t} open={!!openId} onClose={() => setOpenId(null)} title="Aula">
        {openId && <SessionPanel {...t} sessionId={openId} onChanged={load} />}
      </Modal>

      <Modal {...t} open={!!creating} onClose={() => setCreating(null)} title="Aula avulsa (fora da grade)">
        {creating && (<>
          {createError && <Notice C={C}>{createError}</Notice>}
          <Grid>
            <Field C={C} label="Data"><input type="date" value={creating.date} onChange={setC("date")} style={inp} /></Field>
            <Field C={C} label="Início"><input type="time" value={creating.startTime} onChange={setC("startTime")} style={inp} /></Field>
            <Field C={C} label="Instrutor">
              <select value={creating.instructorId} onChange={setC("instructorId")} style={inp}>
                <option value="" disabled>Escolha</option>
                {instructors.map((i) => <option key={i.id} value={i.id}>{i.fullName}</option>)}
              </select>
            </Field>
            <Field C={C} label="Tipo">
              <select value={creating.classType} onChange={setC("classType")} style={inp}>
                {["assessment", "individual", "duo", "group"].map((v) => <option key={v} value={v}>{CLASS_TYPE_LABELS[v]}</option>)}
              </select>
            </Field>
            <Field C={C} label="Modalidade">
              <select value={creating.modalityId} onChange={setC("modalityId")} style={inp}>
                <option value="">— sem modalidade —</option>
                {modalities.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </Field>
            <Field C={C} label="Duração (min)" hint="Vazio = padrão do studio"><input type="number" inputMode="numeric" value={creating.durationMinutes} onChange={setC("durationMinutes")} style={inp} /></Field>
            <Field C={C} label="Capacidade" hint="Vazio = pelo tipo de aula"><input type="number" inputMode="numeric" value={creating.capacity} onChange={setC("capacity")} style={inp} /></Field>
            <Field C={C} label="Sala"><input value={creating.room} onChange={setC("room")} style={inp} placeholder="Opcional" /></Field>
          </Grid>
          <Field C={C} label="Observação"><input value={creating.notes} onChange={setC("notes")} style={inp} placeholder="Opcional" /></Field>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Button {...t} variant="secondary" onClick={() => setCreating(null)}>Cancelar</Button>
            <Button {...t} onClick={create} disabled={!creating.date || !creating.instructorId}>Criar aula</Button>
          </div>
        </>)}
      </Modal>
    </div>
  );
}
