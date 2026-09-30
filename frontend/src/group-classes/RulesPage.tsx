// Aulas em turma: Regras do studio (itens 14 e 27, C5, C6). Padrões que valem para todos os planos;
// cada plano pode ter exceções (tela de Planos). Só dono/gerente altera (o backend confere).
// API: GET/PATCH /classes/settings.
import { useEffect, useState } from "react";
import { api } from "../api/client";
import { type Theme, PageHeader, Button, inputStyle, Card, Notice, Empty } from "./ui";
import { type RuleField, PLAN_RULE_SECTIONS, STUDIO_ONLY_SECTIONS, humanizeRuleError } from "./ruleFields";

export function RuleInput({ C, FB, field, value, onChange, disabled }: {
  C: any; FB: string; field: RuleField; value: any; onChange: (v: any) => void; disabled?: boolean;
}) {
  const inp = { ...inputStyle(C, FB), width: field.kind === "number" ? 110 : "100%", opacity: disabled ? 0.5 : 1 };
  if (field.kind === "bool") {
    return (
      <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: C.text, minHeight: 40, cursor: "pointer" }}>
        <input type="checkbox" checked={!!value} disabled={disabled} onChange={(e) => onChange(e.target.checked)} style={{ width: 20, height: 20, flexShrink: 0 }} />
        {field.label}
      </label>
    );
  }
  return (
    <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", fontSize: 14, color: C.text, minHeight: 44, opacity: disabled ? 0.6 : 1 }}>
      <span>{field.label}</span>
      <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {field.kind === "number" ? (
          <input type="number" inputMode="numeric" value={value ?? ""} disabled={disabled} onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))} style={inp} />
        ) : (
          <select value={value == null ? "" : String(value)} disabled={disabled} onChange={(e) => onChange(e.target.value)} style={{ ...inp, width: "auto", minWidth: 170 }}>
            {field.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        )}
        {field.kind === "number" && <span style={{ fontSize: 12, color: C.textMuted }}>{field.unit}</span>}
      </span>
    </label>
  );
}

export default function RulesPage({ C, FD, FB }: Theme) {
  const t = { C, FD, FB };
  const [saved, setSaved] = useState<Record<string, any> | null>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try { const r: any = await api.get("/classes/settings"); setSaved(r.data); setForm(r.data); }
    catch (e: any) { setError(e.message); }
  };
  useEffect(() => { load(); }, []);

  // individualSlotCapacity chega como número e o select trabalha com texto: compara normalizado.
  const same = (a: any, b: any) => String(a ?? "") === String(b ?? "");
  const changed = saved ? Object.keys(form).filter((k) => !same(form[k], saved[k])) : [];

  const save = async () => {
    setSaving(true); setError(""); setOk("");
    const body = Object.fromEntries(changed.map((k) => [k, form[k] === "" ? null : k === "individualSlotCapacity" ? Number(form[k]) : form[k]]));
    try {
      const r: any = await api.patch("/classes/settings", body);
      setSaved(r.data); setForm(r.data);
      setOk(`${changed.length} regra${changed.length > 1 ? "s" : ""} salva${changed.length > 1 ? "s" : ""}. A mudança fica registrada no Log de ações.`);
    } catch (e: any) { setError(humanizeRuleError(e.message)); }
    finally { setSaving(false); }
  };

  const set = (k: string) => (v: any) => { setOk(""); setForm((f) => ({ ...f, [k]: v })); };
  const renderSection = (s: { title: string; fields: RuleField[] }) => (
    <Card key={s.title} C={C} style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 6 }}>{s.title}</div>
      {s.fields.map((f) => (
        <RuleInput key={f.key} C={C} FB={FB} field={f} value={form[f.key]} onChange={set(f.key)}
          disabled={"dependsOn" in f && !!f.dependsOn && !form[f.dependsOn]} />
      ))}
    </Card>
  );

  return (
    <div style={{ fontFamily: FB, maxWidth: 760, paddingBottom: 90 }}>
      <PageHeader {...t} title="Regras do studio"
        subtitle="Valem para todos os planos. Um plano pode ter exceções (em Planos → editar o plano)." />
      {error && <Notice C={C}>{error}</Notice>}
      {ok && <Notice C={C} kind="info">{ok}</Notice>}
      {!saved ? (!error && <Empty C={C}>Carregando...</Empty>) : (<>
        {STUDIO_ONLY_SECTIONS.slice(0, 1).map(renderSection)}
        {PLAN_RULE_SECTIONS.map(renderSection)}
        {STUDIO_ONLY_SECTIONS.slice(1).map(renderSection)}
      </>)}
      {changed.length > 0 && (
        <div style={{ position: "sticky", bottom: 12, display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap",
          background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 12, boxShadow: "0 6px 24px rgba(0,0,0,0.35)" }}>
          <span style={{ flex: 1, alignSelf: "center", fontSize: 13, color: C.textMuted }}>{changed.length} alteração(ões) não salva(s)</span>
          <Button {...t} variant="secondary" onClick={() => { setForm(saved!); setError(""); }}>Descartar</Button>
          <Button {...t} onClick={save} disabled={saving}>{saving ? "Salvando..." : "Salvar regras"}</Button>
        </div>
      )}
    </div>
  );
}
