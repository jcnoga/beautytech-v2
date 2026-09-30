// Pilates: Instrutores (reaproveita o cadastro de profissionais) e horários de trabalho.
// API: /class-instructors e /class-instructors/:id/schedules.
import { useEffect, useState } from "react";
import { api } from "../api/client";
import { type Theme, WEEKDAYS, PageHeader, Button, Field, inputStyle, Badge, Card, Modal, Section, Grid, Notice, Empty } from "./ui";

const EMPTY = { fullName: "", phone: "", whatsapp: "", email: "", specialties: "", professionalRegistration: "", commissionPct: "0", isActive: true, bio: "" };
const DEFAULT_DAYS = WEEKDAYS.map((_, d) => ({ dayOfWeek: d, isWorking: d >= 1 && d <= 5, startTime: "07:00", endTime: "12:00" }));

export default function PilatesInstructorsPage({ C, FD, FB }: Theme) {
  const t = { C, FD, FB };
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<any>(EMPTY);
  const [days, setDays] = useState<any[]>(DEFAULT_DAYS);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [savedDays, setSavedDays] = useState(false);

  const load = async () => {
    setLoading(true); setError("");
    try { const r: any = await api.get("/class-instructors"); setList(r.data ?? []); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const open = async (i: any | null) => {
    setFormError(""); setSavedDays(false);
    setEditing(i ?? {});
    setForm(i ? { ...EMPTY, ...Object.fromEntries(Object.keys(EMPTY).map((k) => [k, i[k] ?? (EMPTY as any)[k]])), specialties: (i.specialties ?? []).join(", "), commissionPct: String(i.commissionPct ?? "0") } : EMPTY);
    setDays(DEFAULT_DAYS);
    if (i?.id) {
      try {
        const r: any = await api.get(`/class-instructors/${i.id}/schedules`);
        const saved = r.data ?? [];
        if (saved.length) setDays(DEFAULT_DAYS.map((d) => ({ ...d, isWorking: false, ...(saved.find((s: any) => s.dayOfWeek === d.dayOfWeek) ?? {}) })));
      } catch { /* sem horários ainda */ }
    }
  };
  const set = (k: string) => (e: any) => setForm((f: any) => ({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  const save = async () => {
    if (!form.fullName.trim()) { setFormError("Informe o nome do instrutor."); return; }
    setSaving(true); setFormError("");
    const body = { ...form, specialties: form.specialties.split(",").map((s: string) => s.trim()).filter(Boolean), commissionPct: Number(form.commissionPct || 0) };
    try {
      const r: any = editing?.id ? await api.patch(`/class-instructors/${editing.id}`, body) : await api.post("/class-instructors", body);
      await load();
      setEditing(r.data);
    } catch (e: any) { setFormError(e.message); }
    finally { setSaving(false); }
  };
  const saveDays = async () => {
    setFormError(""); setSavedDays(false);
    try {
      await api.put(`/class-instructors/${editing.id}/schedules`, days.map(({ dayOfWeek, isWorking, startTime, endTime }) => ({ dayOfWeek, isWorking, startTime, endTime })));
      setSavedDays(true);
    } catch (e: any) { setFormError(e.message); }
  };
  const setDay = (d: number, k: string, v: any) => setDays((all) => all.map((x) => (x.dayOfWeek === d ? { ...x, [k]: v } : x)));

  const inp = inputStyle(C, FB);
  return (
    <div style={{ fontFamily: FB }}>
      <PageHeader {...t} title="Instrutores" subtitle="Equipe do studio, especialidades e horários de trabalho"
        action={<Button {...t} onClick={() => open(null)}>+ Novo instrutor</Button>} />
      {error && <Notice C={C}>{error}</Notice>}
      {loading ? <Empty C={C}>Carregando...</Empty> : list.length === 0 ? <Empty C={C}>Nenhum instrutor cadastrado. Use “+ Novo instrutor”.</Empty> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
          {list.map((i) => (
            <Card key={i.id} C={C} onClick={() => open(i)} style={{ opacity: i.isActive ? 1 : 0.6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <div style={{ fontWeight: 700, color: C.text, fontSize: 15 }}>{i.fullName}</div>
                <Badge label={i.isActive ? "Ativo" : "Inativo"} color={i.isActive ? C.sage : C.textMuted} />
              </div>
              {i.professionalRegistration && <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>{i.professionalRegistration}</div>}
              {(i.specialties ?? []).length > 0 && <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>{i.specialties.join(" · ")}</div>}
              <div style={{ fontSize: 12, color: C.textMuted, marginTop: 6 }}>{i.studentsCount ?? 0} aluno(s) ativo(s)</div>
            </Card>
          ))}
        </div>
      )}

      <Modal {...t} open={editing !== null} onClose={() => setEditing(null)} title={editing?.id ? `Instrutor: ${editing.fullName}` : "Novo instrutor"}>
        {formError && <Notice C={C}>{formError}</Notice>}
        <Field C={C} label="Nome completo"><input value={form.fullName} onChange={set("fullName")} style={inp} autoFocus /></Field>
        <Grid>
          <Field C={C} label="WhatsApp"><input value={form.whatsapp} onChange={set("whatsapp")} style={inp} inputMode="tel" /></Field>
          <Field C={C} label="Telefone"><input value={form.phone} onChange={set("phone")} style={inp} inputMode="tel" /></Field>
          <Field C={C} label="E-mail"><input value={form.email} onChange={set("email")} style={inp} type="email" /></Field>
          <Field C={C} label="Registro profissional" hint="CREF ou CREFITO (opcional)"><input value={form.professionalRegistration} onChange={set("professionalRegistration")} style={inp} /></Field>
          <Field C={C} label="Especialidades" hint="Separe por vírgula. Ex.: Reformer, Mat, Gestantes"><input value={form.specialties} onChange={set("specialties")} style={inp} /></Field>
          <Field C={C} label="Comissão (%)"><input type="number" min={0} max={100} step="0.5" value={form.commissionPct} onChange={set("commissionPct")} style={inp} /></Field>
        </Grid>
        <Field C={C} label="Sobre"><textarea value={form.bio} onChange={set("bio")} style={{ ...inp, minHeight: 60 }} /></Field>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: C.text, marginBottom: 12 }}>
          <input type="checkbox" checked={!!form.isActive} onChange={set("isActive")} style={{ width: 18, height: 18 }} /> Instrutor ativo
        </label>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <Button {...t} variant="secondary" onClick={() => setEditing(null)}>Fechar</Button>
          <Button {...t} onClick={save} disabled={saving}>{saving ? "Salvando..." : editing?.id ? "Salvar alterações" : "Cadastrar instrutor"}</Button>
        </div>

        {editing?.id && (
          <Section C={C} title="Horários de trabalho">
            {days.map((d) => (
              <div key={d.dayOfWeek} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, padding: "6px 0" }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, width: 120, fontSize: 14, color: C.text }}>
                  <input type="checkbox" checked={d.isWorking} onChange={(e) => setDay(d.dayOfWeek, "isWorking", e.target.checked)} style={{ width: 18, height: 18 }} />
                  {WEEKDAYS[d.dayOfWeek]}
                </label>
                <input type="time" value={d.startTime} disabled={!d.isWorking} onChange={(e) => setDay(d.dayOfWeek, "startTime", e.target.value)} style={{ ...inp, width: 120 }} />
                <span style={{ color: C.textMuted, fontSize: 13 }}>até</span>
                <input type="time" value={d.endTime} disabled={!d.isWorking} onChange={(e) => setDay(d.dayOfWeek, "endTime", e.target.value)} style={{ ...inp, width: 120 }} />
              </div>
            ))}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
              <Button {...t} variant="secondary" onClick={saveDays}>Salvar horários</Button>
              {savedDays && <span style={{ fontSize: 13, color: C.sage }}>✓ Horários salvos</span>}
            </div>
          </Section>
        )}
      </Modal>
    </div>
  );
}
