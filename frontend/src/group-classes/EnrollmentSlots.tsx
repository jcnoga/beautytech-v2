// Aulas em turma: horários fixos de uma matrícula por frequência (item 10, C2). Ex.: seg 08:00 e qua 08:00.
// Limite por semana, turma lotada, conflito e horário individual são conferidos no backend (createSlot);
// a tela só lista, adiciona e remove, mostrando a mensagem do backend.
// API: GET/POST /classes/slots, DELETE /classes/slots/:id, GET /classes/schedules, GET /class-instructors.
import { useEffect, useState } from "react";
import { api } from "../api/client";
import { type Theme, WEEKDAYS, Button, inputStyle, Badge, Notice } from "./ui";
import { CLASS_TYPE_LABELS, endTime } from "./SchedulesPage";

const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

export default function EnrollmentSlots({ C, FD, FB, enrollment, onChange }: Theme & { enrollment: any; onChange?: () => void }) {
  const t = { C, FD, FB };
  const [slots, setSlots] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [instructors, setInstructors] = useState<any[]>([]);
  const [pick, setPick] = useState("");
  const [individual, setIndividual] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    const [s, g]: any = await Promise.all([api.get("/classes/slots", { enrollmentId: enrollment.id }), api.get("/classes/schedules")]);
    setSlots(s.data ?? []); setSchedules((g.data ?? []).filter((x: any) => x.is_active && !x.owner_enrollment_id));
  };
  useEffect(() => { load().catch((e) => setError(e.message)); }, [enrollment.id]);

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true); setError("");
    try { await fn(); await load(); setPick(""); setIndividual(null); onChange?.(); }
    catch (e: any) { setError(e.message); }
    finally { setBusy(false); }
  };
  const add = () => act(() => api.post("/classes/slots", { enrollmentId: enrollment.id, scheduleId: pick }));
  const addIndividual = () => act(() => api.post("/classes/slots", { enrollmentId: enrollment.id, individual: {
    dayOfWeek: Number(individual.dayOfWeek), startTime: individual.startTime, instructorId: individual.instructorId } }));
  const remove = (s: any) => {
    if (!confirm(`Remover o horário fixo de ${WEEKDAYS[s.day_of_week]} ${s.start_time}? As aulas futuras deixam de reservar a vaga.`)) return;
    act(() => api.delete(`/classes/slots/${s.id}`));
  };
  const openIndividual = () => {
    setIndividual({ dayOfWeek: "1", startTime: "08:00", instructorId: "" });
    if (!instructors.length) api.get<any>("/class-instructors").then((r) => setInstructors((r.data ?? []).filter((i: any) => i.isActive))).catch(() => {});
  };

  const taken = new Set(slots.map((s) => s.schedule_id));
  const options = WEEK_ORDER.flatMap((d) => schedules.filter((s) => s.day_of_week === d && !taken.has(s.id)));
  const inp = inputStyle(C, FB);
  const perWeek = enrollment.usage?.perWeek;

  return (
    <div style={{ marginTop: 8, padding: "10px 12px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: C.textMuted, marginBottom: 6 }}>
        Horários fixos {perWeek ? `(${slots.length} de ${perWeek} por semana)` : ""}
      </div>
      {error && <Notice C={C}>{error}</Notice>}
      {slots.length === 0 && <div style={{ fontSize: 14, color: C.textMuted, marginBottom: 6 }}>Nenhum horário fixo ainda.</div>}
      {slots.map((s) => (
        <div key={s.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "6px 0", flexWrap: "wrap" }}>
          <div style={{ fontSize: 14, color: C.text }}>
            <strong>{WEEKDAYS[s.day_of_week]} {s.start_time}–{endTime(s.start_time, s.duration_minutes)}</strong>
            <span style={{ color: C.textMuted }}> · {s.modality_name ?? "Aula"} · {s.instructor_name}</span>
            {s.individual && <> <Badge label={CLASS_TYPE_LABELS[s.class_type] ?? "Individual"} color={C.sapphire ?? C.gold} /></>}
          </div>
          <Button {...t} small variant="danger" onClick={() => remove(s)} disabled={busy}>Remover</Button>
        </div>
      ))}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
        <select value={pick} onChange={(e) => setPick(e.target.value)} style={{ ...inp, flex: "1 1 220px", width: "auto" }}>
          <option value="">— escolha um horário da grade —</option>
          {options.map((s) => (
            <option key={s.id} value={s.id}>
              {WEEKDAYS[s.day_of_week]} {s.start_time} · {s.modality_name ?? "Aula"} · {s.instructor_name} · {s.fixed_count}/{s.capacity} fixos
            </option>
          ))}
        </select>
        <Button {...t} small onClick={add} disabled={busy || !pick}>Adicionar</Button>
        {!individual && <Button {...t} small variant="secondary" onClick={openIndividual} disabled={busy}>Horário individual</Button>}
      </div>
      {individual && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8, alignItems: "center" }}>
          <select value={individual.dayOfWeek} onChange={(e) => setIndividual({ ...individual, dayOfWeek: e.target.value })} style={{ ...inp, width: "auto" }}>
            {WEEK_ORDER.map((d) => <option key={d} value={d}>{WEEKDAYS[d]}</option>)}
          </select>
          <input type="time" value={individual.startTime} onChange={(e) => setIndividual({ ...individual, startTime: e.target.value })} style={{ ...inp, width: 120 }} />
          <select value={individual.instructorId} onChange={(e) => setIndividual({ ...individual, instructorId: e.target.value })} style={{ ...inp, width: "auto", minWidth: 160 }}>
            <option value="">— instrutor —</option>
            {instructors.map((i) => <option key={i.id} value={i.id}>{i.fullName}</option>)}
          </select>
          <Button {...t} small onClick={addIndividual} disabled={busy || !individual.instructorId}>Criar</Button>
          <Button {...t} small variant="secondary" onClick={() => setIndividual(null)}>Cancelar</Button>
        </div>
      )}
    </div>
  );
}
