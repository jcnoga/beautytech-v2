// Aulas em turma: Planos (C1). Dois tipos: por frequência (mensalidade, aulas/semana, vigência em meses)
// e pacote de aulas (créditos com validade). Aula experimental = pacote marcado como experimental.
// Cada plano pode ter exceções às Regras das aulas (PlanRulesSection).
// API: /memberships/plans, /classes/modalities e /classes/settings (padrões exibidos).
import { useEffect, useState } from "react";
import { api } from "../api/client";
import { type Theme, brl, PageHeader, Button, Field, CheckField, inputStyle, Badge, Card, Modal, Grid, Notice, Empty } from "./ui";
import PlanRulesSection, { PLAN_RULE_KEYS } from "./PlanRulesSection";
import { humanizeRuleError } from "./ruleFields";

const EMPTY = { name: "", description: "", kind: "frequency", price: "", classesPerWeek: "2", durationMonths: "1",
  totalClasses: "10", validityDays: "60", modalityId: "", isTrial: false, status: "active" };
const DURATIONS: Record<string, string> = { "1": "Mensal", "3": "Trimestral", "6": "Semestral", "12": "Anual" };

// Textos do "?" de cada campo (só explicação; as regras continuam no backend).
const HELP = {
  kind: <>Escolha como o aluno paga e usa as aulas.<br /><b>Por frequência (mensalidade):</b> o aluno tem dias e horários fixos toda semana (ex.: segunda e quarta às 8h) e paga por mês. É o plano mais comum.<br /><b>Pacote de aulas:</b> o aluno compra uma quantidade de aulas (ex.: 10) e marca cada uma quando quiser, até a validade acabar. Bom para quem não tem horário fixo, aula avulsa ou experimental.</>,
  name: <>Como o plano aparece para você e na ficha do aluno. Use um nome que já diga o que é, ex.: "Pilates 2x por semana" ou "Pacote de 10 aulas".</>,
  priceFrequency: <>Valor cobrado por <b>mês</b> neste plano, ex.: 250,00. Pode ser ajustado na hora de matricular um aluno (desconto, por exemplo). Deixe 0 se não houver cobrança.</>,
  pricePackage: <>Valor do pacote <b>inteiro</b>, ex.: 10 aulas por 500,00. Pode ser ajustado na hora de matricular. Para aula experimental gratuita, deixe 0.</>,
  modality: <>Para qual tipo de aula o plano é vendido (ex.: Pilates Solo, Aparelhos). Serve para organizar e identificar o plano. Hoje é informativo: o sistema não impede o aluno de usar o plano em aula de outra modalidade. "Qualquer" = vale para todas.</>,
  classesPerWeek: <>Quantas aulas por semana o aluno tem direito. É o número de horários fixos que ele pode ter na matrícula, ex.: 2x por semana = segunda e quarta. O sistema não deixa cadastrar mais horários fixos do que isso.</>,
  duration: <>Por quanto tempo a matrícula vale, contando da data de início. Mensal = 1 mês, trimestral = 3, semestral = 6, anual = 12. A data final aparece na matrícula do aluno; para continuar depois dela, faça uma nova matrícula.</>,
  totalClasses: <>Quantas aulas o aluno recebe no pacote, ex.: 10. Quando você inscreve o aluno numa aula, 1 aula fica reservada; com a presença lançada, ela é descontada. Faltas e cancelamentos seguem as Regras do studio (podem ou não descontar).</>,
  validityDays: <>Quantos dias o aluno tem para usar as aulas, contando da data de início da matrícula. Ex.: 60 dias. Depois disso, o sistema não deixa inscrever o aluno em aulas com esse pacote: as aulas que sobraram vencem.</>,
  description: <>Texto livre para você ou a recepção lembrarem detalhes do plano, ex.: "inclui avaliação postural" ou "válido só de manhã". Não muda nenhuma regra do sistema.</>,
  isTrial: <>Marque se este pacote é a <b>aula experimental</b>, aquela primeira aula para conhecer o studio (normalmente 1 aula, grátis ou com valor simbólico). Assim ela aparece identificada como "Experimental" nos planos e nas matrículas.</>,
  status: <>Desmarque para parar de vender este plano. Ele some da lista de novas matrículas, mas os alunos que já estão nele continuam normalmente até o fim.</>,
};

export function describePlan(p: any) {
  if (p.kind === "frequency") return `${p.classesPerWeek}x por semana · ${DURATIONS[String(p.durationMonths)] ?? `${p.durationMonths} meses`}`;
  return `${p.totalClasses} aula${p.totalClasses > 1 ? "s" : ""} · validade de ${p.validityDays} dias`;
}

export default function MembershipsPage({ C, FD, FB }: Theme) {
  const t = { C, FD, FB };
  const [plans, setPlans] = useState<any[]>([]);
  const [modalities, setModalities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<any>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [studio, setStudio] = useState<any>(null);
  const [rules, setRules] = useState<Record<string, any>>({});

  const load = async () => {
    setLoading(true); setError("");
    try { const r: any = await api.get("/memberships/plans"); setPlans(r.data ?? []); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => {
    load();
    api.get<any>("/classes/modalities").then((r) => setModalities((r.data ?? []).filter((m: any) => m.isActive))).catch(() => {});
    api.get<any>("/classes/settings").then((r) => setStudio(r.data)).catch(() => {});
  }, []);

  const open = (p: any | null, preset?: any) => {
    setFormError("");
    setEditing(p ?? {});
    setForm(p ? Object.fromEntries(Object.keys(EMPTY).map((k) => [k, p[k] === null || p[k] === undefined ? (EMPTY as any)[k] : typeof p[k] === "boolean" ? p[k] : String(p[k])]))
      : { ...EMPTY, ...preset });
    setRules(Object.fromEntries(PLAN_RULE_KEYS.map((k) => [k, p?.[k] ?? null])));
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
    // Exceções: manda só o que mudou (null = volta ao padrão do studio).
    for (const k of PLAN_RULE_KEYS) {
      const v = rules[k] === "" ? null : rules[k];
      if (editing?.id ? String(v ?? "") !== String(editing[k] ?? "") : v !== null) body[k] = v;
    }
    try {
      editing?.id ? await api.patch(`/memberships/plans/${editing.id}`, body) : await api.post("/memberships/plans", body);
      await load();
      setEditing(null);
    } catch (e: any) { setFormError(humanizeRuleError(e.message)); }
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
        <Field C={C} label="Tipo de plano" help={HELP.kind}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[["frequency", "Por frequência (mensalidade)"], ["package", "Pacote de aulas"]].map(([v, l]) => (
              <Button key={v} {...t} small variant={form.kind === v ? "primary" : "secondary"} onClick={() => setForm((f: any) => ({ ...f, kind: v }))}>{l}</Button>
            ))}
          </div>
        </Field>
        <Field C={C} label="Nome" help={HELP.name}><input value={form.name} onChange={set("name")} style={inp} placeholder={form.kind === "frequency" ? "Ex.: Pilates 2x por semana" : "Ex.: Pacote de 10 aulas"} /></Field>
        <Grid>
          <Field C={C} label="Preço (R$)" help={form.kind === "frequency" ? HELP.priceFrequency : HELP.pricePackage}><input type="number" min={0} step="0.01" value={form.price} onChange={set("price")} style={inp} /></Field>
          <Field C={C} label="Modalidade" help={HELP.modality}>
            <select value={form.modalityId} onChange={set("modalityId")} style={inp}>
              <option value="">— qualquer —</option>
              {modalities.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </Field>
          {form.kind === "frequency" ? (<>
            <Field C={C} label="Aulas por semana" help={HELP.classesPerWeek}>
              <select value={form.classesPerWeek} onChange={set("classesPerWeek")} style={inp}>
                {[1, 2, 3, 4, 5, 6, 7].map((n) => <option key={n} value={n}>{n}x por semana</option>)}
              </select>
            </Field>
            <Field C={C} label="Vigência" help={HELP.duration}>
              <select value={form.durationMonths} onChange={set("durationMonths")} style={inp}>
                {Object.entries(DURATIONS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Field>
          </>) : (<>
            <Field C={C} label="Quantidade de aulas" help={HELP.totalClasses}><input type="number" min={1} value={form.totalClasses} onChange={set("totalClasses")} style={inp} /></Field>
            <Field C={C} label="Validade (dias)" help={HELP.validityDays}><input type="number" min={1} value={form.validityDays} onChange={set("validityDays")} style={inp} /></Field>
          </>)}
        </Grid>
        <Field C={C} label="Descrição" help={HELP.description}><textarea value={form.description} onChange={set("description")} style={{ ...inp, minHeight: 60 }} /></Field>
        {form.kind === "package" && (
          <CheckField C={C} label="É aula experimental" checked={!!form.isTrial} onChange={set("isTrial")} help={HELP.isTrial} />
        )}
        {editing !== null && <PlanRulesSection key={editing?.id ?? "new"} C={C} FB={FB} studio={studio} kind={form.kind} rules={rules} setRules={setRules} />}
        <CheckField C={C} label="Plano ativo (disponível para novas matrículas)" checked={form.status === "active"} style={{ marginBottom: 14 }}
          onChange={(e) => setForm((f: any) => ({ ...f, status: e.target.checked ? "active" : "inactive" }))} help={HELP.status} />
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <Button {...t} variant="secondary" onClick={() => setEditing(null)}>Cancelar</Button>
          <Button {...t} onClick={save} disabled={saving}>{saving ? "Salvando..." : editing?.id ? "Salvar alterações" : "Criar plano"}</Button>
        </div>
      </Modal>
    </div>
  );
}
