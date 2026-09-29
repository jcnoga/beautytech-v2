// Pilates: Planos (C1). Dois tipos: por frequência (mensalidade, aulas/semana, vigência em meses)
// e pacote de aulas (créditos com validade). Aula experimental = pacote marcado como experimental.
// API: /pilates/plans e /pilates/modalities.
import { useEffect, useState } from "react";
import { api } from "../api/client";
import { type Theme, brl, PageHeader, Button, Field, inputStyle, Badge, Card, Modal, Grid, Notice, Empty } from "./ui";

const EMPTY = { name: "", description: "", kind: "frequency", price: "", classesPerWeek: "2", durationMonths: "1",
  totalClasses: "10", validityDays: "60", modalityId: "", isTrial: false, status: "active" };
const DURATIONS: Record<string, string> = { "1": "Mensal", "3": "Trimestral", "6": "Semestral", "12": "Anual" };

export function describePlan(p: any) {
  if (p.kind === "frequency") return `${p.classesPerWeek}x por semana · ${DURATIONS[String(p.durationMonths)] ?? `${p.durationMonths} meses`}`;
  return `${p.totalClasses} aula${p.totalClasses > 1 ? "s" : ""} · validade de ${p.validityDays} dias`;
}

export default function PilatesPlansPage({ C, FD, FB }: Theme) {
  const t = { C, FD, FB };
  const [plans, setPlans] = useState<any[]>([]);
  const [modalities, setModalities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<any>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const load = async () => {
    setLoading(true); setError("");
    try { const r: any = await api.get("/pilates/plans"); setPlans(r.data ?? []); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => {
    load();
    api.get<any>("/pilates/modalities").then((r) => setModalities((r.data ?? []).filter((m: any) => m.isActive))).catch(() => {});
  }, []);

  const open = (p: any | null, preset?: any) => {
    setFormError("");
    setEditing(p ?? {});
    setForm(p ? Object.fromEntries(Object.keys(EMPTY).map((k) => [k, p[k] === null || p[k] === undefined ? (EMPTY as any)[k] : typeof p[k] === "boolean" ? p[k] : String(p[k])]))
      : { ...EMPTY, ...preset });
  };
  const set = (k: string) => (e: any) => setForm((f: any) => ({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  const save = async () => {
    if (!form.name.trim()) { setFormError("Informe o nome do plano."); return; }
    setSaving(true); setFormError("");
    const n = (v: string) => (v === "" ? null : Number(v));
    const body: any = { name: form.name, description: form.description, kind: form.kind, price: form.price === "" ? 0 : Number(form.price),
      modalityId: form.modalityId || null, status: form.status };
    if (form.kind === "frequency") Object.assign(body, { classesPerWeek: n(form.classesPerWeek), durationMonths: n(form.durationMonths), isTrial: false });
    else Object.assign(body, { totalClasses: n(form.totalClasses), validityDays: n(form.validityDays), isTrial: !!form.isTrial });
    try {
      editing?.id ? await api.patch(`/pilates/plans/${editing.id}`, body) : await api.post("/pilates/plans", body);
      await load();
      setEditing(null);
    } catch (e: any) { setFormError(e.message); }
    finally { setSaving(false); }
  };

  const inp = inputStyle(C, FB);
  const groups = [
    { title: "Planos por frequência (mensalidade)", items: plans.filter((p) => p.kind === "frequency") },
    { title: "Pacotes de aulas", items: plans.filter((p) => p.kind === "package") },
  ];
  return (
    <div style={{ fontFamily: FB }}>
      <PageHeader {...t} title="Planos" subtitle="O que o studio vende: mensalidades por frequência e pacotes de aulas"
        action={<Button {...t} onClick={() => open(null)}>+ Novo plano</Button>} />
      {error && <Notice C={C}>{error}</Notice>}
      {loading ? <Empty C={C}>Carregando...</Empty> : plans.length === 0 ? (
        <Card C={C}>
          <div style={{ color: C.text, fontWeight: 600, marginBottom: 8 }}>Nenhum plano ainda. Comece por um destes:</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Button {...t} small variant="secondary" onClick={() => open(null, { name: "Pilates 2x por semana", kind: "frequency", classesPerWeek: "2", durationMonths: "1" })}>Pilates 2x por semana</Button>
            <Button {...t} small variant="secondary" onClick={() => open(null, { name: "Pacote de 10 aulas", kind: "package", totalClasses: "10", validityDays: "60" })}>Pacote de 10 aulas</Button>
            <Button {...t} small variant="secondary" onClick={() => open(null, { name: "Aula experimental", kind: "package", totalClasses: "1", validityDays: "7", price: "0", isTrial: true })}>Aula experimental</Button>
            <Button {...t} small variant="secondary" onClick={() => open(null, { name: "Aula avulsa", kind: "package", totalClasses: "1", validityDays: "30" })}>Aula avulsa</Button>
          </div>
        </Card>
      ) : groups.map((g) => g.items.length > 0 && (
        <div key={g.title} style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>{g.title}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
            {g.items.map((p) => (
              <Card key={p.id} C={C} onClick={() => open(p)} style={{ opacity: p.status === "active" ? 1 : 0.55 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <div style={{ fontWeight: 700, color: C.text, fontSize: 15 }}>{p.name}</div>
                  <div style={{ fontWeight: 700, color: C.gold, whiteSpace: "nowrap" }}>{brl(p.price)}</div>
                </div>
                <div style={{ fontSize: 12, color: C.textMuted, marginTop: 6 }}>{describePlan(p)}{p.modalityName ? ` · ${p.modalityName}` : ""}</div>
                <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                  {p.isTrial && <Badge label="Experimental" color={C.sapphire ?? C.gold} />}
                  {p.status !== "active" && <Badge label="Inativo" color={C.textMuted} />}
                </div>
              </Card>
            ))}
          </div>
        </div>
      ))}

      <Modal {...t} open={editing !== null} onClose={() => setEditing(null)} title={editing?.id ? `Plano: ${editing.name}` : "Novo plano"}>
        {formError && <Notice C={C}>{formError}</Notice>}
        <Field C={C} label="Tipo de plano">
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[["frequency", "Por frequência (mensalidade)"], ["package", "Pacote de aulas"]].map(([v, l]) => (
              <Button key={v} {...t} small variant={form.kind === v ? "primary" : "secondary"} onClick={() => setForm((f: any) => ({ ...f, kind: v }))}>{l}</Button>
            ))}
          </div>
        </Field>
        <Field C={C} label="Nome"><input value={form.name} onChange={set("name")} style={inp} placeholder={form.kind === "frequency" ? "Ex.: Pilates 2x por semana" : "Ex.: Pacote de 10 aulas"} /></Field>
        <Grid>
          <Field C={C} label="Preço (R$)"><input type="number" min={0} step="0.01" value={form.price} onChange={set("price")} style={inp} /></Field>
          <Field C={C} label="Modalidade">
            <select value={form.modalityId} onChange={set("modalityId")} style={inp}>
              <option value="">— qualquer —</option>
              {modalities.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </Field>
          {form.kind === "frequency" ? (<>
            <Field C={C} label="Aulas por semana">
              <select value={form.classesPerWeek} onChange={set("classesPerWeek")} style={inp}>
                {[1, 2, 3, 4, 5, 6, 7].map((n) => <option key={n} value={n}>{n}x por semana</option>)}
              </select>
            </Field>
            <Field C={C} label="Vigência">
              <select value={form.durationMonths} onChange={set("durationMonths")} style={inp}>
                {Object.entries(DURATIONS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Field>
          </>) : (<>
            <Field C={C} label="Quantidade de aulas"><input type="number" min={1} value={form.totalClasses} onChange={set("totalClasses")} style={inp} /></Field>
            <Field C={C} label="Validade (dias)"><input type="number" min={1} value={form.validityDays} onChange={set("validityDays")} style={inp} /></Field>
          </>)}
        </Grid>
        <Field C={C} label="Descrição"><textarea value={form.description} onChange={set("description")} style={{ ...inp, minHeight: 60 }} /></Field>
        {form.kind === "package" && (
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: C.text, marginBottom: 10 }}>
            <input type="checkbox" checked={!!form.isTrial} onChange={set("isTrial")} style={{ width: 18, height: 18 }} /> É aula experimental
          </label>
        )}
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: C.text, marginBottom: 14 }}>
          <input type="checkbox" checked={form.status === "active"} onChange={(e) => setForm((f: any) => ({ ...f, status: e.target.checked ? "active" : "inactive" }))} style={{ width: 18, height: 18 }} />
          Plano ativo (disponível para novas matrículas)
        </label>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <Button {...t} variant="secondary" onClick={() => setEditing(null)}>Cancelar</Button>
          <Button {...t} onClick={save} disabled={saving}>{saving ? "Salvando..." : editing?.id ? "Salvar alterações" : "Criar plano"}</Button>
        </div>
      </Modal>
    </div>
  );
}
