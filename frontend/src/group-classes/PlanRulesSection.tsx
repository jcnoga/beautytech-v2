// Aulas em turma: exceções de regra por plano (dentro do cadastro do plano). Cada regra fica "igual ao
// studio" (null) ou tem um valor próprio. O padrão exibido vem de GET /classes/settings; a regra que vale
// na hora de consumir aula é calculada no backend (effectiveRules).
import { useState } from "react";
import { type RuleField, PLAN_RULE_SECTIONS, PLAN_STUDIO_CANCEL } from "./ruleFields";
import { RuleInput } from "./RulesPage";

export const PLAN_RULE_KEYS = [...PLAN_RULE_SECTIONS.flatMap((s) => s.fields.map((f) => f.key)), PLAN_STUDIO_CANCEL.key];

function show(field: RuleField, v: any) {
  if (v === null || v === undefined) return "-";
  if (field.kind === "bool") return v ? "Sim" : "Não";
  if (field.kind === "number") return `${v} ${field.unit}`;
  return field.options.find(([k]) => k === String(v))?.[1] ?? String(v);
}

export default function PlanRulesSection({ C, FB, studio, kind, rules, setRules }: {
  C: any; FB: string; studio: Record<string, any> | null; kind: string;
  rules: Record<string, any>; setRules: (r: Record<string, any>) => void;
}) {
  const [open, setOpen] = useState(() => Object.values(rules).some((v) => v !== null && v !== undefined));
  if (!studio) return null;
  const studioValue = (k: string) => k === "studioCancelAction"
    ? studio[kind === "frequency" ? "studioCancelActionFrequency" : "studioCancelActionPackage"] : studio[k];
  const effective = (k: string) => (rules[k] ?? studioValue(k));
  const count = Object.values(rules).filter((v) => v !== null && v !== undefined).length;
  const sections = [...PLAN_RULE_SECTIONS, { title: "Cancelamento pelo studio", fields: [PLAN_STUDIO_CANCEL] }];

  const row = (f: RuleField) => {
    const own = rules[f.key] !== null && rules[f.key] !== undefined;
    const parentOff = "dependsOn" in f && !!f.dependsOn && !effective(f.dependsOn);
    return (
      <div key={f.key} style={{ borderBottom: `1px solid ${C.border}`, padding: "8px 0" }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: own ? C.gold : C.textMuted, cursor: "pointer" }}>
          <input type="checkbox" checked={own} style={{ width: 16, height: 16 }}
            onChange={(e) => setRules({ ...rules, [f.key]: e.target.checked ? studioValue(f.key) : null })} />
          {own ? "Regra própria deste plano" : `Igual ao studio: ${f.label.toLowerCase()} — ${show(f, studioValue(f.key))}`}
        </label>
        {own && (
          <RuleInput C={C} FB={FB} field={f} value={rules[f.key]} disabled={parentOff}
            onChange={(v) => setRules({ ...rules, [f.key]: f.key === "individualSlotCapacity" ? Number(v) : v })} />
        )}
      </div>
    );
  };

  return (
    <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 12, marginTop: 6, marginBottom: 12 }}>
      <button type="button" onClick={() => setOpen(!open)}
        style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: FB, fontSize: 13, fontWeight: 700, color: C.text, minHeight: 36 }}>
        {open ? "▾" : "▸"} Regras deste plano {count > 0 ? `(${count} exceção${count > 1 ? "ões" : ""})` : "(iguais ao studio)"}
      </button>
      {open && (<>
        <div style={{ fontSize: 12, color: C.textMuted, margin: "4px 0 8px" }}>
          Marque só o que for diferente do studio. O resto acompanha as Regras das aulas (em Configurações).
        </div>
        {sections.map((s) => (
          <div key={s.title} style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 10 }}>{s.title}</div>
            {s.fields.map(row)}
          </div>
        ))}
      </>)}
    </div>
  );
}
