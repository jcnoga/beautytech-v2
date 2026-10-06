// Aulas em turma: Alunos (reaproveita o cadastro de clientes + ficha do aluno) e suas matrículas.
// Matrícula por frequência ativa mostra os horários fixos (EnrollmentSlots).
// Seção Histórico: créditos e reposições do aluno (StudentHistory).
// Ficha em abas (Matrículas · Pagamentos · Dados · Histórico · LGPD): abre em Matrículas quando o aluno tem matrícula ativa;
// só as ativas aparecem em cartões; as encerradas/canceladas ficam em "Ver anteriores".
// API: /class-students, /memberships/enrollments, /memberships/plans, /class-instructors, /consent-forms (C8), /classes/slots.
import { useEffect, useState } from "react";
import { api } from "../api/client";
import {
  type Theme, LEVEL_LABELS, STUDENT_STATUS, ENROLLMENT_STATUS, brl, todaySP, fmtDay,
  PageHeader, Button, Field, inputStyle, Badge, Card, Modal, Section, Grid, Notice, Empty,
} from "./ui";
import EnrollmentSlots from "./EnrollmentSlots";
import StudentHistory from "./StudentHistory";
import StudentPayments from "./StudentPayments";

const EMPTY = {
  fullName: "", phone: "", whatsapp: "", email: "", birthDate: "",
  goal: "", level: "beginner", startDate: "", weeklyFrequency: "", status: "active", instructorId: "",
  notes: "", emergencyContactName: "", emergencyContactPhone: "", initialAssessmentDate: "", declaredRestrictions: "",
};
// Textos do "?" de cada campo (só explicação; as regras continuam no backend).
const HELP = {
  fullName: <>Nome do aluno como você quer ver na lista, na chamada e nas matrículas. Use o nome completo para não confundir alunos com o mesmo primeiro nome.</>,
  whatsapp: <>Número principal para falar com o aluno, com DDD, ex.: (34) 99999-0000. É o número usado para contato pelo WhatsApp.</>,
  phone: <>Outro telefone do aluno (fixo ou recado), se houver. Pode ficar vazio.</>,
  email: <>E-mail do aluno, se houver. Útil para enviar comprovantes e avisos. Pode ficar vazio.</>,
  birthDate: <>Data de nascimento. Ajuda a lembrar aniversários e a adaptar os exercícios à idade.</>,
  status: <>Em que situação o aluno está com o studio. <b>Ativo:</b> fazendo aulas. <b>Pausado:</b> parou por um tempo (férias, lesão). <b>Inativo:</b> parou sem previsão de volta. <b>Cancelado:</b> encerrou o vínculo.<br />Serve para organizar a lista (use os filtros no topo da tela). Não bloqueia as aulas sozinho: para parar as aulas, encerre ou cancele a matrícula abaixo.</>,
  level: <>Nível de experiência do aluno no Pilates: iniciante, intermediário ou avançado. Ajuda o instrutor a escolher os exercícios e a montar turmas parecidas.</>,
  instructor: <>O instrutor que acompanha este aluno de perto (avaliação, evolução). É uma referência: o aluno pode fazer aula com qualquer instrutor.</>,
  weeklyFrequency: <>Quantas vezes por semana o aluno pretende vir. É só uma anotação. Quem garante a vaga e coloca o aluno na chamada são os <b>horários fixos</b> da matrícula por frequência (seção Matrículas, abaixo).</>,
  startDate: <>Quando o aluno começou no studio. É uma anotação da ficha; as datas que valem para as aulas são as das matrículas.</>,
  assessment: <>Quando foi feita a avaliação inicial do aluno (postura, limitações, objetivos). Deixe vazio se ainda não foi feita.</>,
  goal: <>O que o aluno quer conquistar com o Pilates, ex.: melhorar a postura, fortalecer, aliviar dor nas costas. Ajuda o instrutor a planejar as aulas.</>,
  restrictions: <>Tudo o que o próprio aluno contou sobre a saúde e que pede cuidado nas aulas, ex.: gestante, hérnia de disco, cirurgia no joelho em 2024. Anote com as palavras dele: não é diagnóstico.</>,
  notes: <>Qualquer outra informação útil sobre o aluno, ex.: "prefere aulas de manhã", "vem de carona". Só para consulta do studio.</>,
  emergencyName: <>Quem chamar se o aluno passar mal durante a aula, ex.: um familiar. Recomendado preencher.</>,
  emergencyPhone: <>Telefone dessa pessoa de contato, com DDD.</>,
  plan: <>Qual plano o aluno está contratando. Os planos são cadastrados no menu <b>Planos</b>. O aluno pode ter mais de uma matrícula ativa, ex.: mensalidade + pacote extra.</>,
  enrollStart: <>A partir de quando a matrícula vale. A data final é calculada pelo plano: a vigência (mensalidade) ou a validade em dias (pacote).</>,
  dueDay: <>Dia do mês em que a mensalidade vence, de 1 a 28, ex.: 10. Se ficar vazio, vale o dia da data de início.<br />Ao matricular, as mensalidades entram no <b>Financeiro</b> como receitas pendentes: a 1ª vence na data de início e as seguintes neste dia de cada mês. Pacote: uma parcela só, na data de início.</>,
  price: <>Quanto este aluno vai pagar nesta matrícula. Vazio = o preço do plano. Use para dar desconto ou preço especial só para este aluno, sem mudar o plano.</>,
};

/** sessionStorage: id do aluno que a tela deve abrir ao montar (ver openStudentPage). */
export const OPEN_STUDENT_KEY = "zs_open_student";
/** Vai para a tela Alunos já com a ficha do aluno aberta. */
export function openStudentPage(id: string) {
  try { sessionStorage.setItem(OPEN_STUDENT_KEY, id); } catch { /* sem sessionStorage */ }
  window.dispatchEvent(new CustomEvent("zs:open-page", { detail: "class_students" }));
}

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
  const [tab, setTab] = useState<"enrollments" | "payments" | "data" | "history" | "lgpd">("data");
  const [loadError, setLoadError] = useState(""); // matrículas ou termo LGPD não carregaram
  const [showPast, setShowPast] = useState(false);
  const [moreOpen, setMoreOpen] = useState<string | null>(null); // matrícula com o menu "Mais" aberto
  const [slotsFor, setSlotsFor] = useState<any | null>(null);     // matrícula com a janela de horários aberta
  const [slotCount, setSlotCount] = useState<Record<string, number>>({});
  const [newOpen, setNewOpen] = useState(false);                   // janela "Nova matrícula"
  const [enrollError, setEnrollError] = useState("");

  const load = async () => {
    setLoading(true); setError("");
    try {
      const r: any = await api.get("/class-students", { status, search });
      setStudents(r.data ?? []);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [status]);
  // Aberta por outra tela (ex.: Interessados → "Converter em aluno"): abre a ficha pedida.
  useEffect(() => {
    let id: string | null = null;
    try { id = sessionStorage.getItem(OPEN_STUDENT_KEY); sessionStorage.removeItem(OPEN_STUDENT_KEY); } catch { /* sem sessionStorage */ }
    if (id) api.get<any>(`/class-students/${id}`).then((r) => open(r.data)).catch((e: any) => setError(e.message));
  }, []);
  const loadSlotCounts = (list: any[]) => {
    for (const e of list.filter((x) => x.status === "active" && x.planKind === "frequency")) {
      api.get<any>("/classes/slots", { enrollmentId: e.id })
        .then((r) => setSlotCount((c) => ({ ...c, [e.id]: (r.data ?? []).length })))
        .catch(() => setSlotCount((c) => { const n = { ...c }; delete n[e.id]; return n; }));
    }
  };
  useEffect(() => { loadSlotCounts(enrollments); }, [enrollments]);
  useEffect(() => {
    api.get<any>("/class-instructors").then((r) => setInstructors((r.data ?? []).filter((i: any) => i.isActive))).catch(() => {});
    api.get<any>("/memberships/plans", { status: "active" }).then((r) => setPlans(r.data ?? [])).catch(() => {});
  }, []);

  const open = async (s: any | null) => {
    setFormError("");
    setEditing(s ?? {});
    setForm(s ? Object.fromEntries(Object.keys(EMPTY).map((k) => [k, s[k] ?? (EMPTY as any)[k]])) : { ...EMPTY, startDate: todaySP() });
    setEnrollments([]); setConsent(null); setLoadError(""); setShowPast(false); setMoreOpen(null);
    setSlotsFor(null); setNewOpen(false); setSlotCount({});
    setEnroll({ planId: "", startDate: todaySP(), dueDay: "", price: "" });
    setTab(s?.id && s.hasProfile && Number(s.activeEnrollments) > 0 ? "enrollments" : "data");
    if (s?.id && s.hasProfile) {
      api.get<any>("/memberships/enrollments", { studentId: s.id }).then((r) => setEnrollments(r.data ?? []))
        .catch((e: any) => setLoadError(`Não foi possível carregar as matrículas (${e.message}).`));
      api.get<any>(`/consent-forms/${s.id}`).then((r) => setConsent((r.data ?? []).find((c: any) => c.type === "lgpd") ?? null))
        .catch((e: any) => setLoadError(`Não foi possível carregar o termo LGPD (${e.message}).`));
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
      if (!editing?.id || !editing.hasProfile) { await open(r.data); setTab("enrollments"); } // próximo passo: matricular
      else setEditing(r.data);
    } catch (e: any) { setFormError(e.message); }
    finally { setSaving(false); }
  };

  const openNewEnrollment = () => { setEnroll({ planId: "", startDate: todaySP(), dueDay: "", price: "" }); setEnrollError(""); setNewOpen(true); };
  const addEnrollment = async () => {
    if (!enroll.planId) { setEnrollError("Escolha o plano."); return; }
    setEnrollError("");
    try {
      await api.post("/memberships/enrollments", {
        studentId: editing.id, planId: enroll.planId, startDate: enroll.startDate,
        dueDay: enroll.dueDay === "" ? undefined : Number(enroll.dueDay), price: enroll.price === "" ? undefined : Number(enroll.price),
      });
      const r: any = await api.get("/memberships/enrollments", { studentId: editing.id });
      setEnrollments(r.data ?? []);
      setEnroll({ planId: "", startDate: todaySP(), dueDay: "", price: "" });
      setNewOpen(false);
      load();
    } catch (e: any) { setEnrollError(e.message); }
  };
  const setEnrollmentStatus = async (id: string, st: string) => {
    setMoreOpen(null);
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
  const active = enrollments.filter((e) => e.status === "active" || e.status === "paused");
  const past = enrollments.filter((e) => e.status !== "active" && e.status !== "paused");
  const hasTabs = !!(editing?.id && editing.hasProfile);
  const TABS: [typeof tab, string][] = [["enrollments", `Matrículas (${active.length})`], ["payments", "Pagamentos"], ["data", "Dados"], ["history", "Histórico"], ["lgpd", "LGPD"]];

  /** O principal da matrícula em letra grande: aulas restantes (pacote) ou aulas da semana (frequência). */
  const usageLine = (e: any) => {
    if (!e.usage) return null;
    if (e.planKind === "package") return `Restam ${e.usage.remaining} de ${e.usage.total} aulas`;
    return `Esta semana: ${e.usage.thisWeek} de ${e.usage.perWeek} aulas`;
  };
  const enrollmentCard = (e: any) => {
    const st = ENROLLMENT_STATUS[e.status] ?? ENROLLMENT_STATUS.active;
    const isActive = e.status === "active";
    return (
      <div key={e.id} style={{ border: `1px solid ${isActive ? C.sage + "66" : C.border}`, borderRadius: 14, padding: "14px 16px", background: C.card }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{e.planName}</span>
          <Badge label={st.label} color={st.color(C)} />
        </div>
        <div style={{ fontSize: 14, color: C.textSec, marginTop: 6 }}>
          {fmtDay(e.startDate)} a {fmtDay(e.endDate)} · {brl(e.price)}{e.dueDay ? ` · vence dia ${e.dueDay}` : ""}
        </div>
        {isActive && usageLine(e) && <div style={{ fontSize: 18, fontWeight: 700, color: C.text, marginTop: 8 }}>{usageLine(e)}</div>}
        {isActive && e.planKind === "frequency" && e.usage?.perWeek > 0 && slotCount[e.id] !== undefined && (
          <div style={{ fontSize: 15, marginTop: 6, fontWeight: slotCount[e.id] < e.usage.perWeek ? 700 : 400,
            color: slotCount[e.id] < e.usage.perWeek ? C.gold : C.textSec }}>
            Horários fixos: {slotCount[e.id]} de {e.usage.perWeek} escolhidos{slotCount[e.id] < e.usage.perWeek ? " — falta escolher" : ""}
          </div>
        )}
        {isActive && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
            {e.planKind === "frequency" && (
              <Button {...t} small variant={e.usage?.perWeek > 0 && (slotCount[e.id] ?? 0) < e.usage.perWeek ? "primary" : "secondary"} onClick={() => setSlotsFor(e)}>Horários</Button>
            )}
            <Button {...t} small variant="secondary" onClick={() => setMoreOpen(moreOpen === e.id ? null : e.id)}>{moreOpen === e.id ? "Menos ▴" : "Mais ▾"}</Button>
            {moreOpen === e.id && (<>
              <Button {...t} small variant="secondary" onClick={() => setEnrollmentStatus(e.id, "ended")}>Encerrar</Button>
              <Button {...t} small variant="danger" onClick={() => { if (confirm("Cancelar esta matrícula?")) setEnrollmentStatus(e.id, "cancelled"); }}>Cancelar</Button>
            </>)}
          </div>
        )}
      </div>
    );
  };

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
        {hasTabs && (
          <div role="tablist" style={{ display: "flex", gap: 4, flexWrap: "wrap", borderBottom: `1px solid ${C.border}`, marginBottom: 16 }}>
            {TABS.map(([k, l]) => (
              <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
                style={{ background: "transparent", border: "none", borderBottom: `2px solid ${tab === k ? C.rose : "transparent"}`, color: tab === k ? C.text : C.textSec,
                  fontWeight: tab === k ? 700 : 500, fontSize: 15, fontFamily: FB, padding: "10px 12px", minHeight: 44, cursor: "pointer" }}>{l}</button>
            ))}
          </div>
        )}
        {loadError && <Notice C={C}>{loadError}</Notice>}

        {(!hasTabs || tab === "data") && (<>
        <Section C={C} title="Dados do aluno">
          <Field C={C} label="Nome completo" help={HELP.fullName}><input value={form.fullName} onChange={set("fullName")} style={inp} autoFocus /></Field>
          <Grid>
            <Field C={C} label="WhatsApp" help={HELP.whatsapp}><input value={form.whatsapp} onChange={set("whatsapp")} style={inp} inputMode="tel" /></Field>
            <Field C={C} label="Telefone" help={HELP.phone}><input value={form.phone} onChange={set("phone")} style={inp} inputMode="tel" /></Field>
            <Field C={C} label="E-mail" help={HELP.email}><input value={form.email} onChange={set("email")} style={inp} type="email" /></Field>
            <Field C={C} label="Nascimento" help={HELP.birthDate}><input value={form.birthDate} onChange={set("birthDate")} style={inp} type="date" /></Field>
          </Grid>
        </Section>
        <Section C={C} title="Pilates">
          <Grid>
            <Field C={C} label="Situação" help={HELP.status}>
              <select value={form.status} onChange={set("status")} style={inp}>
                {Object.entries(STUDENT_STATUS).map(([v, s]) => <option key={v} value={v}>{s.label}</option>)}
              </select>
            </Field>
            <Field C={C} label="Nível" help={HELP.level}>
              <select value={form.level} onChange={set("level")} style={inp}>
                {Object.entries(LEVEL_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Field>
            <Field C={C} label="Instrutor responsável" help={HELP.instructor}>
              <select value={form.instructorId} onChange={set("instructorId")} style={inp}>
                <option value="">— sem instrutor —</option>
                {instructors.map((i) => <option key={i.id} value={i.id}>{i.fullName}</option>)}
              </select>
            </Field>
            <Field C={C} label="Frequência (aulas por semana)" help={HELP.weeklyFrequency}>
              <select value={String(form.weeklyFrequency)} onChange={set("weeklyFrequency")} style={inp}>
                <option value="">—</option>
                {[1, 2, 3, 4, 5, 6, 7].map((n) => <option key={n} value={n}>{n}x por semana</option>)}
              </select>
            </Field>
            <Field C={C} label="Data de início" help={HELP.startDate}><input value={form.startDate} onChange={set("startDate")} style={inp} type="date" /></Field>
            <Field C={C} label="Data da avaliação inicial" help={HELP.assessment}><input value={form.initialAssessmentDate} onChange={set("initialAssessmentDate")} style={inp} type="date" /></Field>
          </Grid>
          <Field C={C} label="Objetivo" help={HELP.goal}><input value={form.goal} onChange={set("goal")} style={inp} placeholder="Ex.: postura, fortalecimento, alívio de dor nas costas" /></Field>
          <Field C={C} label="Restrições e cuidados informados pelo aluno" help={HELP.restrictions} hint="O que o próprio aluno declarou (ex.: gestante, cirurgia no joelho em 2024). Não é diagnóstico.">
            <textarea value={form.declaredRestrictions} onChange={set("declaredRestrictions")} style={{ ...inp, minHeight: 64 }} />
          </Field>
          <Field C={C} label="Observações" help={HELP.notes}><textarea value={form.notes} onChange={set("notes")} style={{ ...inp, minHeight: 64 }} /></Field>
        </Section>
        <Section C={C} title="Contato de emergência">
          <Grid>
            <Field C={C} label="Nome" help={HELP.emergencyName}><input value={form.emergencyContactName} onChange={set("emergencyContactName")} style={inp} /></Field>
            <Field C={C} label="Telefone" help={HELP.emergencyPhone}><input value={form.emergencyContactPhone} onChange={set("emergencyContactPhone")} style={inp} inputMode="tel" /></Field>
          </Grid>
        </Section>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", margin: "8px 0 4px" }}>
          <Button {...t} variant="secondary" onClick={() => setEditing(null)}>Fechar</Button>
          <Button {...t} onClick={save} disabled={saving}>{saving ? "Salvando..." : !editing?.id ? "Cadastrar aluno" : editing.hasProfile ? "Salvar alterações" : "Completar ficha"}</Button>
        </div>

        </>)}

        {hasTabs && tab === "enrollments" && (
          <div style={{ display: "grid", gap: 10 }}>
            {active.length === 0 && <div style={{ fontSize: 14, color: C.textMuted }}>Nenhuma matrícula ativa.</div>}
            {active.map(enrollmentCard)}
            {past.length > 0 && (
              <div>
                <Button {...t} small variant="secondary" onClick={() => setShowPast((v) => !v)}>{showPast ? "Esconder anteriores" : `Ver anteriores (${past.length})`}</Button>
                {showPast && <div style={{ display: "grid", gap: 10, marginTop: 10 }}>{past.map(enrollmentCard)}</div>}
              </div>
            )}
            <div><Button {...t} onClick={openNewEnrollment}>+ Nova matrícula</Button></div>
          </div>
        )}

        {hasTabs && tab === "payments" && <StudentPayments {...t} studentId={editing.id} />}
        {hasTabs && tab === "history" && <StudentHistory {...t} studentId={editing.id} />}

        {hasTabs && tab === "lgpd" && (
          consent?.is_signed
            ? <div style={{ fontSize: 15, color: C.sage }}>✓ Aceite registrado em {new Date(consent.signed_at).toLocaleDateString("pt-BR")}{consent.signed_by_name ? ` por ${consent.signed_by_name}` : ""}</div>
            : <Button {...t} variant="secondary" onClick={registerConsent}>Registrar aceite do termo LGPD</Button>
        )}

        <Modal {...t} open={!!slotsFor} onClose={() => setSlotsFor(null)} title={`Horários fixos · ${slotsFor?.planName ?? ""}`} width={620}>
          {slotsFor && <EnrollmentSlots {...t} enrollment={slotsFor} onChange={() => loadSlotCounts(enrollments)} />}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
            <Button {...t} variant="secondary" onClick={() => setSlotsFor(null)}>Fechar</Button>
          </div>
        </Modal>

        <Modal {...t} open={newOpen} onClose={() => setNewOpen(false)} title="Nova matrícula" width={560}>
          {enrollError && <Notice C={C}>{enrollError}</Notice>}
          <div style={{ fontSize: 14, color: C.textMuted, marginBottom: 10 }}>O aluno pode ter mais de uma ativa, ex.: mensal + pacote.</div>
          <Grid>
                <Field C={C} label="Plano" help={HELP.plan}>
                  <select value={enroll.planId} onChange={(e) => setEnroll((x: any) => ({ ...x, planId: e.target.value }))} style={inp}>
                    <option value="">— escolha —</option>
                    {plans.map((p) => <option key={p.id} value={p.id}>{p.name} · {brl(p.price)}</option>)}
                  </select>
                </Field>
                <Field C={C} label="Início" help={HELP.enrollStart}><input type="date" value={enroll.startDate} onChange={(e) => setEnroll((x: any) => ({ ...x, startDate: e.target.value }))} style={inp} /></Field>
                {selectedPlan?.kind === "frequency" && (
                  <Field C={C} label="Dia de vencimento" help={HELP.dueDay} hint="Padrão: o dia do início (até 28)">
                    <input type="number" min={1} max={28} value={enroll.dueDay} onChange={(e) => setEnroll((x: any) => ({ ...x, dueDay: e.target.value }))} style={inp} />
                  </Field>
                )}
                <Field C={C} label="Valor" help={HELP.price} hint={selectedPlan ? `Padrão: ${brl(selectedPlan.price)}` : undefined}>
                  <input type="number" min={0} step="0.01" value={enroll.price} onChange={(e) => setEnroll((x: any) => ({ ...x, price: e.target.value }))} style={inp} />
                </Field>
              </Grid>
              {plans.length === 0 && <Notice C={C} kind="info">Cadastre um plano em “Planos” para matricular.</Notice>}
          {plans.length === 0 && <Notice C={C} kind="info">Cadastre um plano em “Planos” para matricular.</Notice>}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap", marginTop: 6 }}>
            <Button {...t} variant="secondary" onClick={() => setNewOpen(false)}>Cancelar</Button>
            <Button {...t} onClick={addEnrollment} disabled={!enroll.planId}>Matricular</Button>
          </div>
        </Modal>
      </Modal>
    </div>
  );
}
