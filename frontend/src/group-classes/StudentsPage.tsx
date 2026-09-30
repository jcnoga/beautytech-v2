// Aulas em turma: Alunos (reaproveita o cadastro de clientes + ficha do aluno) e suas matrículas.
// Matrícula por frequência ativa mostra os horários fixos (EnrollmentSlots).
// Seção Histórico: créditos e reposições do aluno (StudentHistory).
// API: /class-students, /memberships/enrollments, /memberships/plans, /class-instructors, /consent-forms (C8), /classes/slots.
import { useEffect, useState } from "react";
import { api } from "../api/client";
import {
  type Theme, LEVEL_LABELS, STUDENT_STATUS, ENROLLMENT_STATUS, brl, todaySP, fmtDay,
  PageHeader, Button, Field, inputStyle, Badge, Card, Modal, Section, Grid, Notice, Empty,
} from "./ui";
import EnrollmentSlots from "./EnrollmentSlots";
import StudentHistory from "./StudentHistory";

const EMPTY = {
  fullName: "", phone: "", whatsapp: "", email: "", birthDate: "",
  goal: "", level: "beginner", startDate: "", weeklyFrequency: "", status: "active", instructorId: "",
  notes: "", emergencyContactName: "", emergencyContactPhone: "", initialAssessmentDate: "", declaredRestrictions: "",
};
const FILTERS = [["", "Todos"], ["active", "Ativos"], ["paused", "Pausados"], ["inactive", "Inativos"], ["cancelled", "Cancelados"], ["incomplete", "Ficha incompleta"]];

export default function ClassStudentsPage({ C, FD, FB }: Theme) {
  const t = { C, FD, FB };
  const [students, setStudents] = useState<any[]>([]);
  const [instructors, setInstructors] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<any | null>(null); // null = fechado; {} = novo
  const [form, setForm] = useState<any>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [enroll, setEnroll] = useState<any>({ planId: "", startDate: todaySP(), dueDay: "", price: "" });
  const [consent, setConsent] = useState<any | null>(null);

  const load = async () => {
    setLoading(true); setError("");
    try {
      const r: any = await api.get("/class-students", { status, search });
      setStudents(r.data ?? []);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [status]);
  useEffect(() => {
    api.get<any>("/class-instructors").then((r) => setInstructors((r.data ?? []).filter((i: any) => i.isActive))).catch(() => {});
    api.get<any>("/memberships/plans", { status: "active" }).then((r) => setPlans(r.data ?? [])).catch(() => {});
  }, []);

  const open = async (s: any | null) => {
    setFormError("");
    setEditing(s ?? {});
    setForm(s ? Object.fromEntries(Object.keys(EMPTY).map((k) => [k, s[k] ?? (EMPTY as any)[k]])) : { ...EMPTY, startDate: todaySP() });
    setEnrollments([]); setConsent(null);
    setEnroll({ planId: "", startDate: todaySP(), dueDay: "", price: "" });
    if (s?.id && s.hasProfile) {
      api.get<any>("/memberships/enrollments", { studentId: s.id }).then((r) => setEnrollments(r.data ?? [])).catch(() => {});
      api.get<any>(`/consent-forms/${s.id}`).then((r) => setConsent((r.data ?? []).find((c: any) => c.type === "lgpd") ?? null)).catch(() => {});
    }
  };
  const set = (k: string) => (e: any) => setForm((f: any) => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    if (!form.fullName.trim()) { setFormError("Informe o nome do aluno."); return; }
    setSaving(true); setFormError("");
    const body = { ...form, weeklyFrequency: form.weeklyFrequency === "" ? null : Number(form.weeklyFrequency) };
    try {
      const r: any = editing?.id ? await api.patch(`/class-students/${editing.id}`, body) : await api.post("/class-students", body);
      await load();
      if (!editing?.id || !editing.hasProfile) await open(r.data); else setEditing(r.data);
    } catch (e: any) { setFormError(e.message); }
    finally { setSaving(false); }
  };

  const addEnrollment = async () => {
    if (!enroll.planId) { setFormError("Escolha o plano."); return; }
    setFormError("");
    try {
      await api.post("/memberships/enrollments", {
        studentId: editing.id, planId: enroll.planId, startDate: enroll.startDate,
        dueDay: enroll.dueDay === "" ? undefined : Number(enroll.dueDay), price: enroll.price === "" ? undefined : Number(enroll.price),
      });
      const r: any = await api.get("/memberships/enrollments", { studentId: editing.id });
      setEnrollments(r.data ?? []);
      setEnroll({ planId: "", startDate: todaySP(), dueDay: "", price: "" });
      load();
    } catch (e: any) { setFormError(e.message); }
  };
  const setEnrollmentStatus = async (id: string, st: string) => {
    try {
      await api.patch(`/memberships/enrollments/${id}`, { status: st });
      const r: any = await api.get("/memberships/enrollments", { studentId: editing.id });
      setEnrollments(r.data ?? []);
      load();
    } catch (e: any) { setFormError(e.message); }
  };
  const registerConsent = async () => {
    try {
      const r: any = consent ?? (await api.post("/consent-forms", { clientId: editing.id, type: "lgpd",
        content: "Autorizo o uso dos meus dados pessoais conforme a LGPD (Lei 13.709/2018) para a prestação dos serviços deste studio." })).data;
      const id = r?.id;
      if (id && !r.is_signed) await api.post(`/consent-forms/${id}/sign`, { signedByName: form.fullName });
      const list: any = await api.get(`/consent-forms/${editing.id}`);
      setConsent((list.data ?? []).find((c: any) => c.type === "lgpd") ?? null);
    } catch (e: any) { setFormError(e.message); }
  };

  const inp = inputStyle(C, FB);
  const selectedPlan = plans.find((p) => p.id === enroll.planId);

  return (
    <div style={{ fontFamily: FB }}>
      <PageHeader {...t} title="Alunos" subtitle="Cadastro, plano e matrículas dos alunos do studio"
        action={<Button {...t} onClick={() => open(null)}>+ Novo aluno</Button>} />

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        {FILTERS.map(([v, l]) => (
          <Button key={v} {...t} small variant={status === v ? "primary" : "secondary"} onClick={() => setStatus(v)}>{l}</Button>
        ))}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); load(); }} style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar aluno pelo nome" style={{ ...inp, flex: 1 }} />
        <Button {...t} type="submit" variant="secondary">Buscar</Button>
      </form>

      {error && <Notice C={C}>{error}</Notice>}
      {loading ? <Empty C={C}>Carregando...</Empty> : students.length === 0 ? (
        <Empty C={C}>Nenhum aluno {status ? "nesta situação" : "cadastrado"}. Use “+ Novo aluno”.</Empty>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
          {students.map((s) => {
            const st = STUDENT_STATUS[s.status] ?? STUDENT_STATUS.active;
            return (
              <Card key={s.id} C={C} onClick={() => open(s)}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
                  <div style={{ fontWeight: 700, color: C.text, fontSize: 15 }}>{s.fullName}</div>
                  {s.hasProfile ? <Badge label={st.label} color={st.color(C)} /> : <Badge label="Ficha de Pilates incompleta" color={C.gold} />}
                </div>
                {!s.hasProfile ? (
                  <div style={{ fontSize: 12, color: C.textMuted, marginTop: 6 }}>Cliente do studio sem ficha de Pilates. Toque para completar.</div>
                ) : (<>
                <div style={{ fontSize: 12, color: C.textMuted, marginTop: 6 }}>
                  {LEVEL_LABELS[s.level] ?? s.level}{s.instructorName ? ` · Instrutor: ${s.instructorName}` : ""}
                </div>
                <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>
                  {s.activeEnrollments > 0 ? `${s.activeEnrollments} matrícula(s) ativa(s)` : "Sem matrícula ativa"}
                </div>
                {s.declaredRestrictions && <div style={{ fontSize: 12, color: C.gold, marginTop: 6 }}>⚠ {s.declaredRestrictions}</div>}
                </>)}
              </Card>
            );
          })}
        </div>
      )}

      <Modal {...t} open={editing !== null} onClose={() => setEditing(null)} title={editing?.id ? `Aluno: ${editing.fullName}` : "Novo aluno"}>
        {formError && <Notice C={C}>{formError}</Notice>}
        {editing?.id && !editing.hasProfile && (
          <Notice C={C} kind="info">Ficha de Pilates incompleta: confira os dados abaixo e salve para completar. O cadastro do cliente é o mesmo (nada é duplicado).</Notice>
        )}
        <Section C={C} title="Dados do aluno">
          <Field C={C} label="Nome completo"><input value={form.fullName} onChange={set("fullName")} style={inp} autoFocus /></Field>
          <Grid>
            <Field C={C} label="WhatsApp"><input value={form.whatsapp} onChange={set("whatsapp")} style={inp} inputMode="tel" /></Field>
            <Field C={C} label="Telefone"><input value={form.phone} onChange={set("phone")} style={inp} inputMode="tel" /></Field>
            <Field C={C} label="E-mail"><input value={form.email} onChange={set("email")} style={inp} type="email" /></Field>
            <Field C={C} label="Nascimento"><input value={form.birthDate} onChange={set("birthDate")} style={inp} type="date" /></Field>
          </Grid>
        </Section>
        <Section C={C} title="Pilates">
          <Grid>
            <Field C={C} label="Situação">
              <select value={form.status} onChange={set("status")} style={inp}>
                {Object.entries(STUDENT_STATUS).map(([v, s]) => <option key={v} value={v}>{s.label}</option>)}
              </select>
            </Field>
            <Field C={C} label="Nível">
              <select value={form.level} onChange={set("level")} style={inp}>
                {Object.entries(LEVEL_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Field>
            <Field C={C} label="Instrutor responsável">
              <select value={form.instructorId} onChange={set("instructorId")} style={inp}>
                <option value="">— sem instrutor —</option>
                {instructors.map((i) => <option key={i.id} value={i.id}>{i.fullName}</option>)}
              </select>
            </Field>
            <Field C={C} label="Frequência (aulas por semana)">
              <select value={String(form.weeklyFrequency)} onChange={set("weeklyFrequency")} style={inp}>
                <option value="">—</option>
                {[1, 2, 3, 4, 5, 6, 7].map((n) => <option key={n} value={n}>{n}x por semana</option>)}
              </select>
            </Field>
            <Field C={C} label="Data de início"><input value={form.startDate} onChange={set("startDate")} style={inp} type="date" /></Field>
            <Field C={C} label="Data da avaliação inicial"><input value={form.initialAssessmentDate} onChange={set("initialAssessmentDate")} style={inp} type="date" /></Field>
          </Grid>
          <Field C={C} label="Objetivo"><input value={form.goal} onChange={set("goal")} style={inp} placeholder="Ex.: postura, fortalecimento, alívio de dor nas costas" /></Field>
          <Field C={C} label="Restrições e cuidados informados pelo aluno" hint="O que o próprio aluno declarou (ex.: gestante, cirurgia no joelho em 2024). Não é diagnóstico.">
            <textarea value={form.declaredRestrictions} onChange={set("declaredRestrictions")} style={{ ...inp, minHeight: 64 }} />
          </Field>
          <Field C={C} label="Observações"><textarea value={form.notes} onChange={set("notes")} style={{ ...inp, minHeight: 64 }} /></Field>
        </Section>
        <Section C={C} title="Contato de emergência">
          <Grid>
            <Field C={C} label="Nome"><input value={form.emergencyContactName} onChange={set("emergencyContactName")} style={inp} /></Field>
            <Field C={C} label="Telefone"><input value={form.emergencyContactPhone} onChange={set("emergencyContactPhone")} style={inp} inputMode="tel" /></Field>
          </Grid>
        </Section>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", margin: "8px 0 4px" }}>
          <Button {...t} variant="secondary" onClick={() => setEditing(null)}>Fechar</Button>
          <Button {...t} onClick={save} disabled={saving}>{saving ? "Salvando..." : !editing?.id ? "Cadastrar aluno" : editing.hasProfile ? "Salvar alterações" : "Completar ficha"}</Button>
        </div>

        {editing?.id && editing.hasProfile && (
          <>
            <Section C={C} title="Matrículas">
              {enrollments.length === 0 && <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 10 }}>Nenhuma matrícula ainda.</div>}
              {enrollments.map((e) => {
                const st = ENROLLMENT_STATUS[e.status] ?? ENROLLMENT_STATUS.active;
                return (
                  <div key={e.id} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, justifyContent: "space-between",
                    padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
                    <div>
                      <div style={{ fontWeight: 600, color: C.text, fontSize: 14 }}>{e.planName} <Badge label={st.label} color={st.color(C)} /></div>
                      <div style={{ fontSize: 12, color: C.textMuted }}>
                        {fmtDay(e.startDate)} a {fmtDay(e.endDate)} · {brl(e.price)}{e.dueDay ? ` · vence dia ${e.dueDay}` : ""}
                      </div>
                    </div>
                    {e.status === "active" && (
                      <div style={{ display: "flex", gap: 6 }}>
                        <Button {...t} small variant="secondary" onClick={() => setEnrollmentStatus(e.id, "ended")}>Encerrar</Button>
                        <Button {...t} small variant="danger" onClick={() => { if (confirm("Cancelar esta matrícula?")) setEnrollmentStatus(e.id, "cancelled"); }}>Cancelar</Button>
                      </div>
                    )}
                    {e.status === "active" && e.planKind === "frequency" && (
                      <div style={{ flexBasis: "100%" }}><EnrollmentSlots {...t} enrollment={e} /></div>
                    )}
                  </div>
                );
              })}
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 8 }}>Nova matrícula (o aluno pode ter mais de uma ativa, ex.: mensal + pacote):</div>
                <Grid>
                  <Field C={C} label="Plano">
                    <select value={enroll.planId} onChange={(e) => setEnroll((x: any) => ({ ...x, planId: e.target.value }))} style={inp}>
                      <option value="">— escolha —</option>
                      {plans.map((p) => <option key={p.id} value={p.id}>{p.name} · {brl(p.price)}</option>)}
                    </select>
                  </Field>
                  <Field C={C} label="Início"><input type="date" value={enroll.startDate} onChange={(e) => setEnroll((x: any) => ({ ...x, startDate: e.target.value }))} style={inp} /></Field>
                  {selectedPlan?.kind === "frequency" && (
                    <Field C={C} label="Dia de vencimento" hint="Padrão: o dia do início (até 28)">
                      <input type="number" min={1} max={28} value={enroll.dueDay} onChange={(e) => setEnroll((x: any) => ({ ...x, dueDay: e.target.value }))} style={inp} />
                    </Field>
                  )}
                  <Field C={C} label="Valor" hint={selectedPlan ? `Padrão: ${brl(selectedPlan.price)}` : undefined}>
                    <input type="number" min={0} step="0.01" value={enroll.price} onChange={(e) => setEnroll((x: any) => ({ ...x, price: e.target.value }))} style={inp} />
                  </Field>
                </Grid>
                {plans.length === 0 && <Notice C={C} kind="info">Cadastre um plano em “Planos” para matricular.</Notice>}
                <Button {...t} variant="secondary" onClick={addEnrollment} disabled={!enroll.planId}>Matricular</Button>
              </div>
            </Section>
            <Section C={C} title="Histórico">
              <StudentHistory {...t} studentId={editing.id} />
            </Section>
            <Section C={C} title="Termo LGPD">
              {consent?.is_signed
                ? <div style={{ fontSize: 13, color: C.sage }}>✓ Aceite registrado em {new Date(consent.signed_at).toLocaleDateString("pt-BR")}{consent.signed_by_name ? ` por ${consent.signed_by_name}` : ""}</div>
                : <Button {...t} small variant="secondary" onClick={registerConsent}>Registrar aceite do termo LGPD</Button>}
            </Section>
          </>
        )}
      </Modal>
    </div>
  );
}
