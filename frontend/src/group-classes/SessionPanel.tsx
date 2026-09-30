// Aulas em turma: painel de UMA aula (usado na Agenda de aulas). Mostra os inscritos e permite inscrever
// (crédito do pacote, reposição ou aula extra), cancelar inscrição, trocar instrutor/sala desta aula e
// cancelar a aula pelo studio. Vagas, prazos, créditos e permissões são do backend: os cancelamentos
// passam antes pela PRÉVIA (?preview=1), que roda a mesma regra sem gravar, e a tela só explica o efeito.
// API: /classes/sessions/:id (+ /cancel, PATCH), /classes/bookings (+ /extra, /:id/cancel),
//      /class-students, /memberships/enrollments, /memberships/plans, /classes/makeups, /class-instructors.
import { useEffect, useState } from "react";
import { api } from "../api/client";
import { type Theme, BOOKING_KIND, BOOKING_STATUS, Button, Field, inputStyle, Badge, Notice, Section, fmtDay } from "./ui";
import { CLASS_TYPE_LABELS } from "./SchedulesPage";

/** Texto da prévia de cancelamento de uma inscrição (o efeito vem do backend). */
export function describeBookingCancel(r: any) {
  const prazo = r.cancelMinHours ? `prazo de ${r.cancelMinHours} h; faltam ${r.hoursBefore} h` : "sem prazo mínimo";
  return [
    r.timely ? `Cancelamento no prazo (${prazo}).` : `Cancelamento FORA do prazo (${prazo}).`,
    r.creditConsumed ? "Desconta 1 aula do aluno." : "Não desconta aula.",
    r.makeupGenerated ? "Gera 1 reposição." : "Não gera reposição.",
  ].join(" ");
}
/** Texto da prévia de cancelamento da aula pelo studio. */
export function describeSessionCancel(r: any) {
  const n = r.effects?.length ?? 0;
  if (!n) return "Ninguém inscrito: a aula só é marcada como cancelada.";
  const back = r.effects.filter((e: any) => e.effect === "makeup_returned").length;
  const parts = [`${n} aluno(s) inscrito(s).`];
  if (r.refunded) parts.push(`${r.refunded} recebe(m) o crédito de volta.`);
  if (r.makeups) parts.push(`${r.makeups} recebe(m) uma reposição.`);
  if (back) parts.push(`${back} reposição(ões) usada(s) volta(m) a ficar disponível(is).`);
  const none = n - r.refunded - r.makeups - back;
  if (none > 0) parts.push(`${none} sem efeito no plano (regra do plano/studio).`);
  return parts.join(" ");
}

export default function SessionPanel({ C, FD, FB, sessionId, onChanged }: Theme & { sessionId: string; onChanged: () => void }) {
  const t = { C, FD, FB };
  const inp = inputStyle(C, FB);
  const [s, setS] = useState<any>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<{ text: string; run: () => Promise<unknown>; label: string } | null>(null);
  // inscrever
  const [students, setStudents] = useState<any[] | null>(null);
  const [add, setAdd] = useState<any>(null); // { studentId, source: "enrollment:<id>" | "makeup:<id>" | "extra", planId }
  const [sources, setSources] = useState<{ enrollments: any[]; makeups: any[]; packages: any[] }>({ enrollments: [], makeups: [], packages: [] });
  // editar
  const [instructors, setInstructors] = useState<any[]>([]);
  const [edit, setEdit] = useState<any>(null);
  const [reason, setReason] = useState("");

  const load = async () => { const r: any = await api.get(`/classes/sessions/${sessionId}`); setS(r.data); };
  useEffect(() => { setS(null); setError(""); setConfirm(null); setAdd(null); setEdit(null); load().catch((e) => setError(e.message)); }, [sessionId]);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true); setError("");
    try { await fn(); setConfirm(null); setAdd(null); setEdit(null); await load(); onChanged(); }
    catch (e: any) { setError(e.message); setConfirm(null); }
    finally { setBusy(false); }
  };
  /** Prévia primeiro; só grava depois do "confirmar". */
  const withPreview = async (url: string, body: any, describe: (r: any) => string, label: string) => {
    setBusy(true); setError("");
    try {
      const r: any = await api.post(`${url}?preview=1`, body);
      setConfirm({ text: describe(r.data), label, run: () => api.post(url, body) });
    } catch (e: any) { setError(e.message); }
    finally { setBusy(false); }
  };

  const openAdd = async () => {
    setAdd({ studentId: "", source: "", planId: "" });
    if (!students) api.get<any>("/class-students").then((r) => setStudents((r.data ?? []).filter((x: any) => x.hasProfile))).catch(() => setStudents([]));
  };
  const pickStudent = async (studentId: string) => {
    setAdd({ studentId, source: "", planId: "" });
    if (!studentId) return;
    const [e, m, p]: any = await Promise.all([
      api.get("/memberships/enrollments", { studentId }), api.get("/classes/makeups", { studentId }), api.get("/memberships/plans", { status: "active" }),
    ]);
    setSources({
      enrollments: (e.data ?? []).filter((x: any) => x.status === "active"),
      makeups: (m.data ?? []).filter((x: any) => x.status === "available"),
      packages: (p.data ?? []).filter((x: any) => x.kind === "package"),
    });
  };
  const book = () => {
    const [kind, id] = add.source.split(":");
    if (kind === "extra") return run(() => api.post("/classes/bookings/extra", { studentId: add.studentId, planId: add.planId, sessionId }));
    return run(() => api.post("/classes/bookings", { sessionId, studentId: add.studentId, ...(kind === "makeup" ? { makeupCreditId: id } : { enrollmentId: id }) }));
  };
  const openEdit = () => {
    setEdit({ instructorId: s.instructor_id, room: s.room ?? "", notes: s.notes ?? "" });
    if (!instructors.length) api.get<any>("/class-instructors").then((r) => setInstructors((r.data ?? []).filter((i: any) => i.isActive))).catch(() => {});
  };
  const saveEdit = () => {
    const body: any = {};
    if (edit.instructorId !== s.instructor_id) body.instructorId = edit.instructorId;
    if (edit.room !== (s.room ?? "")) body.room = edit.room;
    if (edit.notes !== (s.notes ?? "")) body.notes = edit.notes;
    return run(() => api.patch(`/classes/sessions/${sessionId}`, body));
  };

  if (!s) return error ? <Notice C={C}>{error}</Notice> : <div style={{ color: C.textMuted, padding: 20 }}>Carregando...</div>;
  const cancelled = s.status === "cancelled";
  const future = new Date(s.starts_at) > new Date();
  const free = Math.max(Number(s.capacity) - Number(s.taken), 0);
  const active = (s.bookings ?? []).filter((b: any) => !["cancelled", "cancelled_late", "cancelled_studio"].includes(b.status));
  const past = (s.bookings ?? []).filter((b: any) => ["cancelled", "cancelled_late", "cancelled_studio"].includes(b.status));

  return (
    <div>
      <div style={{ fontSize: 14, color: C.text, marginBottom: 4 }}>
        {fmtDay(s.session_date)} · {s.start_local}–{s.end_local} · {s.modality_name ?? "Aula"} · {s.instructor_name}{s.instructor_overridden ? " (trocado nesta aula)" : ""}
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        <Badge label={CLASS_TYPE_LABELS[s.class_type] ?? s.class_type} color={C.gold} />
        {s.room && <Badge label={s.room} color={C.textMuted} />}
        {cancelled ? <Badge label="Cancelada pelo studio" color={C.ruby} />
          : <Badge label={free === 0 ? "Turma lotada" : `${s.taken}/${s.capacity} · ${free} vaga(s)`} color={free === 0 ? C.ruby : C.sage} />}
        {s.pending_attendance && <Badge label="Presença pendente" color={C.gold} />}
      </div>
      {cancelled && s.cancel_reason && <Notice C={C} kind="info">Motivo: {s.cancel_reason}</Notice>}
      {s.notes && <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 10 }}>Obs.: {s.notes}</div>}
      {error && <Notice C={C}>{error}</Notice>}

      {confirm && (
        <div style={{ border: `1px solid ${C.gold}66`, background: `${C.gold}14`, borderRadius: 12, padding: 12, marginBottom: 12 }}>
          <div style={{ fontSize: 13, color: C.text, marginBottom: 10 }}>{confirm.text}</div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
            <Button {...t} small variant="secondary" onClick={() => setConfirm(null)}>Voltar</Button>
            <Button {...t} small variant="danger" onClick={() => run(confirm.run)} disabled={busy}>{confirm.label}</Button>
          </div>
        </div>
      )}

      <Section C={C} title={`Alunos (${active.length})`}>
        {active.length === 0 && <div style={{ fontSize: 13, color: C.textMuted }}>Ninguém inscrito.</div>}
        {active.map((b: any) => {
          const st = BOOKING_STATUS[b.status] ?? BOOKING_STATUS.booked;
          return (
            <div key={b.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap", padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
              <div>
                <div style={{ fontSize: 14, color: C.text, fontWeight: 600 }}>{b.student_name}</div>
                <div style={{ fontSize: 12, color: C.textMuted }}>{BOOKING_KIND[b.kind] ?? b.kind}{b.plan_name ? ` · ${b.plan_name}` : ""}</div>
                {b.declared_restrictions && <div style={{ fontSize: 12, color: C.gold, marginTop: 2 }}>⚠ {b.declared_restrictions}</div>}
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <Badge label={st.label} color={st.color(C)} />
                {b.status === "booked" && future && !cancelled && (
                  <Button {...t} small variant="secondary" disabled={busy}
                    onClick={() => withPreview(`/classes/bookings/${b.id}/cancel`, undefined, describeBookingCancel, "Confirmar cancelamento")}>Cancelar</Button>
                )}
              </div>
            </div>
          );
        })}
        {past.length > 0 && (
          <div style={{ fontSize: 12, color: C.textMuted, marginTop: 8 }}>
            Cancelaram: {past.map((b: any) => `${b.student_name} (${(BOOKING_STATUS[b.status]?.label ?? b.status).toLowerCase()})`).join(", ")}
          </div>
        )}
      </Section>

      {!cancelled && future && (
        <Section C={C} title="Inscrever aluno">
          {!add ? <Button {...t} small onClick={openAdd} disabled={free === 0}>{free === 0 ? "Turma lotada" : "+ Inscrever aluno"}</Button> : (<>
            <Field C={C} label="Aluno">
              <select value={add.studentId} onChange={(e) => pickStudent(e.target.value)} style={inp}>
                <option value="">{students ? "— escolha —" : "Carregando..."}</option>
                {(students ?? []).map((x) => <option key={x.id} value={x.id}>{x.fullName}</option>)}
              </select>
            </Field>
            {add.studentId && (
              <Field C={C} label="Usar">
                <select value={add.source} onChange={(e) => setAdd({ ...add, source: e.target.value })} style={inp}>
                  <option value="">— escolha —</option>
                  {sources.enrollments.map((e) => <option key={e.id} value={`enrollment:${e.id}`}>Matrícula: {e.planName}{e.usage?.remaining !== undefined ? ` (${e.usage.remaining} aula(s) restante(s))` : ""}</option>)}
                  {sources.makeups.map((m) => <option key={m.id} value={`makeup:${m.id}`}>Reposição (vale até {fmtDay(m.expires_on)})</option>)}
                  <option value="extra">Aula extra (matrícula avulsa)</option>
                </select>
              </Field>
            )}
            {add.source === "extra" && (
              <Field C={C} label="Plano avulso (pacote)">
                <select value={add.planId} onChange={(e) => setAdd({ ...add, planId: e.target.value })} style={inp}>
                  <option value="">— escolha —</option>
                  {sources.packages.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </Field>
            )}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <Button {...t} small variant="secondary" onClick={() => setAdd(null)}>Cancelar</Button>
              <Button {...t} small onClick={book} disabled={busy || !add.source || (add.source === "extra" && !add.planId)}>Inscrever</Button>
            </div>
          </>)}
        </Section>
      )}

      {!cancelled && future && (
        <Section C={C} title="Só nesta aula">
          {!edit ? (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Button {...t} small variant="secondary" onClick={openEdit}>Trocar instrutor / sala</Button>
              <Button {...t} small variant="danger" disabled={busy}
                onClick={() => withPreview(`/classes/sessions/${sessionId}/cancel`, { reason }, describeSessionCancel, "Cancelar a aula")}>Cancelar aula (studio)</Button>
            </div>
          ) : (<>
            <Field C={C} label="Instrutor">
              <select value={edit.instructorId} onChange={(e) => setEdit({ ...edit, instructorId: e.target.value })} style={inp}>
                {instructors.map((i) => <option key={i.id} value={i.id}>{i.fullName}</option>)}
                {!instructors.some((i) => i.id === edit.instructorId) && <option value={edit.instructorId}>{s.instructor_name}</option>}
              </select>
            </Field>
            <Field C={C} label="Sala"><input value={edit.room} onChange={(e) => setEdit({ ...edit, room: e.target.value })} style={inp} /></Field>
            <Field C={C} label="Observação"><input value={edit.notes} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} style={inp} /></Field>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <Button {...t} small variant="secondary" onClick={() => setEdit(null)}>Voltar</Button>
              <Button {...t} small onClick={saveEdit} disabled={busy}>Salvar nesta aula</Button>
            </div>
          </>)}
          {!edit && (
            <Field C={C} label="Motivo do cancelamento (opcional)" hint="Ex.: feriado, studio fechado">
              <input value={reason} onChange={(e) => setReason(e.target.value)} style={inp} />
            </Field>
          )}
        </Section>
      )}
    </div>
  );
}
