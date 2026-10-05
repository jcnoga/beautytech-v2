// Aulas em turma: Grade semanal (C3). Horários recorrentes das turmas; as aulas do dia são geradas
// a partir daqui (4 semanas à frente). Conflito de instrutor, capacidade e desativação são conferidos
// no backend; a tela só mostra a mensagem. Só dono/gerente altera.
// API: /classes/schedules, /classes/settings (padrões), /class-instructors, /classes/modalities.
import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import { type Theme, WEEKDAYS, PageHeader, Button, Field, inputStyle, Badge, Card, Modal, Grid, Notice, Empty } from "./ui";

export const CLASS_TYPE_LABELS: Record<string, string> = { group: "Grupo", duo: "Dupla", individual: "Individual", assessment: "Avaliação" };
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]; // segunda primeiro
const EMPTY = { instructorId: "", modalityId: "", dayOfWeek: "1", startTime: "08:00", durationMinutes: "", room: "", capacity: "", classType: "group" };

/** "08:00" + 50 min → "08:50" (só para exibir). */
export function endTime(start: string, minutes: number) {
  const [h, m] = start.split(":").map(Number);
  const t = h * 60 + m + Number(minutes || 0);
  return `${String(Math.floor(t / 60) % 24).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}

export default function SchedulesPage({ C, FD, FB }: Theme) {
  const t = { C, FD, FB };
  const [list, setList] = useState<any[]>([]);
  const [instructors, setInstructors] = useState<any[]>([]);
  const [modalities, setModalities] = useState<any[]>([]);
  const [defaults, setDefaults] = useState<any>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<any>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const load = async () => {
    setLoading(true); setError("");
    try { const r: any = await api.get("/classes/schedules"); setList(r.data ?? []); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => {
    load();
    api.get<any>("/class-instructors").then((r) => setInstructors(r.data ?? [])).catch(() => {});
    api.get<any>("/classes/modalities").then((r) => setModalities(r.data ?? [])).catch(() => {});
    api.get<any>("/classes/settings").then((r) => setDefaults(r.data)).catch(() => {});
  }, []);

  const open = (s: any | null) => {
    setFormError("");
    setEditing(s ?? {});
    setForm(s ? {
      instructorId: s.instructor_id, modalityId: s.modality_id ?? "", dayOfWeek: String(s.day_of_week), startTime: s.start_time,
      durationMinutes: String(s.duration_minutes), room: s.room ?? "", capacity: String(s.capacity), classType: s.class_type,
    } : { ...EMPTY, instructorId: instructors.find((i) => i.isActive)?.id ?? "" });
  };
  const set = (k: string) => (e: any) => setForm((f: any) => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    setSaving(true); setFormError("");
    const n = (v: string) => (v === "" ? undefined : Number(v));
    const body: any = { instructorId: form.instructorId || undefined, modalityId: form.modalityId || null, dayOfWeek: Number(form.dayOfWeek),
      startTime: form.startTime, durationMinutes: n(form.durationMinutes), room: form.room, capacity: n(form.capacity), classType: form.classType };
    try {
      editing?.id ? await api.patch(`/classes/schedules/${editing.id}`, body) : await api.post("/classes/schedules", body);
      await load(); setEditing(null);
    } catch (e: any) { setFormError(e.message); }
    finally { setSaving(false); }
  };
  const setActive = async (active: boolean) => {
    setSaving(true); setFormError("");
    try { await api.patch(`/classes/schedules/${editing.id}`, { isActive: active }); await load(); setEditing(null); }
    catch (e: any) { setFormError(e.message); }
    finally { setSaving(false); }
  };

  const visible = list.filter((s) => showInactive || s.is_active);
  const byDay = useMemo(() => WEEK_ORDER.map((d) => ({ d, items: visible.filter((s) => s.day_of_week === d) })).filter((g) => g.items.length), [visible]);
  const inactiveCount = list.filter((s) => !s.is_active).length;
  const inp = inputStyle(C, FB);

  return (
    <div style={{ fontFamily: FB }}>
      <PageHeader {...t} title="Grade semanal" subtitle="Horários fixos das turmas. As aulas das próximas 4 semanas são geradas a partir daqui."
        action={<Button {...t} onClick={() => open(null)} disabled={instructors.length === 0}>+ Novo horário</Button>} />
      {error && <Notice C={C}>{error}</Notice>}
      {!loading && instructors.length === 0 && <Notice C={C} kind="info">Cadastre um instrutor (menu Instrutores) antes de montar a grade.</Notice>}
      {inactiveCount > 0 && (
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.textMuted, marginBottom: 12 }}>
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} style={{ width: 18, height: 18 }} />
          Mostrar horários desativados ({inactiveCount})
        </label>
      )}
      {loading ? <Empty C={C}>Carregando...</Empty> : byDay.length === 0 ? (
        <Empty C={C}>Nenhum horário na grade. Toque em “+ Novo horário” para criar o primeiro (ex.: segunda 08:00).</Empty>
      ) : byDay.map((g) => (
        <div key={g.d} style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>{WEEKDAYS[g.d]}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 10 }}>
            {g.items.map((s) => (
              <Card key={s.id} C={C} onClick={() => open(s)} style={{ opacity: s.is_active ? 1 : 0.5 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
                  <div style={{ fontWeight: 700, color: C.text, fontSize: 16 }}>{s.start_time}–{endTime(s.start_time, s.duration_minutes)}</div>
                  <div style={{ fontSize: 13, color: s.fixed_count >= s.capacity ? C.ruby : C.sage, fontWeight: 700, whiteSpace: "nowrap" }}>
                    {s.fixed_count}/{s.capacity} fixos
                  </div>
                </div>
                <div style={{ fontSize: 13, color: C.text, marginTop: 6 }}>{s.modality_name ?? "Aula"} · {s.instructor_name}</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                  <Badge label={CLASS_TYPE_LABELS[s.class_type] ?? s.class_type} color={C.gold} />
                  {s.room && <Badge label={s.room} color={C.textMuted} />}
                  {s.owner_enrollment_id && <Badge label="Horário de matrícula" color={C.sapphire ?? C.gold} />}
                  {!s.is_active && <Badge label="Desativado" color={C.textMuted} />}
                </div>
              </Card>
            ))}
          </div>
        </div>
      ))}

      <Modal {...t} open={editing !== null} onClose={() => setEditing(null)}
        title={editing?.id ? `${WEEKDAYS[editing.day_of_week]} ${editing.start_time}` : "Novo horário na grade"}>
        {formError && <Notice C={C}>{formError}</Notice>}
        {editing?.id && <Notice C={C} kind="info">Mudanças valem para as aulas futuras sem presença lançada. Se o instrutor foi trocado só numa aula, essa troca é mantida.</Notice>}
        <Grid>
          <Field C={C} label="Dia da semana">
            <select value={form.dayOfWeek} onChange={set("dayOfWeek")} style={inp}>
              {WEEK_ORDER.map((d) => <option key={d} value={d}>{WEEKDAYS[d]}</option>)}
            </select>
          </Field>
          <Field C={C} label="Início"><input type="time" value={form.startTime} onChange={set("startTime")} style={inp} /></Field>
          <Field C={C} label="Instrutor">
            <select value={form.instructorId} onChange={set("instructorId")} style={inp}>
              <option value="" disabled>Escolha</option>
              {instructors.filter((i) => i.isActive || i.id === form.instructorId).map((i) => <option key={i.id} value={i.id}>{i.fullName}</option>)}
            </select>
          </Field>
          <Field C={C} label="Modalidade">
            <select value={form.modalityId} onChange={set("modalityId")} style={inp}>
              <option value="">— sem modalidade —</option>
              {modalities.filter((m) => m.isActive || m.id === form.modalityId).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </Field>
          <Field C={C} label="Duração (min)" hint={!editing?.id && defaults ? `Vazio = padrão do studio (${defaults.defaultClassDuration} min)` : undefined}>
            <input type="number" inputMode="numeric" value={form.durationMinutes} onChange={set("durationMinutes")} style={inp}
              placeholder={defaults ? String(defaults.defaultClassDuration) : ""} />
          </Field>
          <Field C={C} label="Capacidade (alunos)" hint={!editing?.id && defaults ? `Vazio = padrão do studio (${defaults.defaultClassCapacity})` : undefined}>
            <input type="number" inputMode="numeric" value={form.capacity} onChange={set("capacity")} style={inp}
              placeholder={defaults ? String(defaults.defaultClassCapacity) : ""} />
          </Field>
          <Field C={C} label="Tipo de aula">
            <select value={form.classType} onChange={set("classType")} style={inp}>
              {["group", "duo", "individual"].map((v) => <option key={v} value={v}>{CLASS_TYPE_LABELS[v]}</option>)}
            </select>
          </Field>
          <Field C={C} label="Sala"><input value={form.room} onChange={set("room")} style={inp} placeholder="Opcional" /></Field>
        </Grid>
        {editing?.id && <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 12 }}>{editing.fixed_count} aluno(s) com horário fixo nesta turma.</div>}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
          {editing?.id && (editing.is_active
            ? <Button {...t} variant="danger" onClick={() => setActive(false)} disabled={saving} style={{ marginRight: "auto" }}>Desativar horário</Button>
            : <Button {...t} variant="secondary" onClick={() => setActive(true)} disabled={saving} style={{ marginRight: "auto" }}>Reativar horário</Button>)}
          <Button {...t} variant="secondary" onClick={() => setEditing(null)}>Cancelar</Button>
          {(!editing?.id || editing.is_active) && (
            <Button {...t} onClick={save} disabled={saving || !form.instructorId}>{saving ? "Salvando..." : editing?.id ? "Salvar alterações" : "Criar horário"}</Button>
          )}
        </div>
      </Modal>
    </div>
  );
}
