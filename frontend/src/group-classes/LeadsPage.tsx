// Aulas em turma: Interessados (funil interessado → experimental → matriculado, + perdido).
// As etapas vêm do backend (GET /class-leads/stages): a tela não fixa nenhuma, então etapa nova aparece sozinha.
// Regras (etapa válida, "Matriculado" só pela conversão, alerta de próximo contato) ficam no backend.
// API: /class-leads.
import { useEffect, useState } from "react";
import { api } from "../api/client";
import { type Theme, fmtDay, useIsMobile, PageHeader, Button, Field, inputStyle, Badge, Card, Modal, Grid, Notice, Empty } from "./ui";

type Stage = { key: string; label: string; final?: boolean; onlyByConversion?: boolean; hidden?: boolean };
const EMPTY = { name: "", whatsapp: "", source: "", followUpAt: "", notes: "", status: "" };
const SOURCES = ["Instagram", "Indicação", "Google", "WhatsApp", "Passou na frente", "Facebook"];
// Textos do "?" de cada campo (só explicação; as regras continuam no backend).
const HELP = {
  name: <>Nome da pessoa interessada. Quando ela virar aluna, este nome vai para a ficha do aluno.</>,
  whatsapp: <>Número para falar com a pessoa, com DDD, ex.: (34) 99999-0000. Também é usado para avisar se ela já é cliente do studio.</>,
  source: <>Como a pessoa conheceu o studio, ex.: Instagram, indicação de uma aluna, Google. Ajuda a saber de onde vêm os alunos.</>,
  followUpAt: <>O dia em que você combinou de falar de novo com a pessoa. Se passar desse dia sem contato, o cartão fica em <b>vermelho</b>.</>,
  status: <>Em que ponto do funil a pessoa está. <b>Interessado:</b> pediu informação. <b>Experimental:</b> marcou ou fez a aula experimental. <b>Perdido:</b> desistiu. <b>Matriculado</b> só pelo botão "Converter em aluno".</>,
  notes: <>Qualquer informação útil, ex.: "quer aulas de manhã", "tem dor nas costas", "experimental sexta 8h".</>,
};

export default function ClassLeadsPage({ C, FD, FB }: Theme) {
  const t = { C, FD, FB };
  const mobile = useIsMobile();
  const [stages, setStages] = useState<Stage[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [showHidden, setShowHidden] = useState<string | null>(null); // etapa escondida em exibição (ex.: lost)
  const [mobileStage, setMobileStage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<any | null>(null); // null = fechado; {} = novo
  const [form, setForm] = useState<any>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const visible = stages.filter((s) => !s.hidden);
  const hidden = stages.filter((s) => s.hidden);
  const movable = stages.filter((s) => !s.onlyByConversion);
  const label = (key: string) => stages.find((s) => s.key === key)?.label ?? key;

  const load = async (hiddenStage = showHidden) => {
    setLoading(true); setError("");
    try {
      if (!stages.length) {
        const st: any = await api.get("/class-leads/stages");
        setStages(st.data ?? []);
        if (!mobileStage) setMobileStage((st.data ?? [])[0]?.key ?? "");
      }
      const r: any = await api.get("/class-leads", hiddenStage ? { status: hiddenStage } : undefined);
      setLeads(r.data ?? []);
      setCounts(r.counts ?? {});
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [showHidden]);

  const open = (l: any | null) => {
    setFormError("");
    setEditing(l ?? {});
    setForm(l ? { name: l.name ?? "", whatsapp: l.whatsapp ?? "", source: l.source ?? "", followUpAt: l.followUpDate ?? "", notes: l.notes ?? "", status: l.status } : EMPTY);
  };
  const set = (k: string) => (e: any) => setForm((f: any) => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    if (!form.name.trim()) { setFormError("Informe o nome."); return; }
    setSaving(true); setFormError("");
    const { status, ...rest } = form;
    const body = editing?.id && status !== editing.status ? form : rest;
    try {
      editing?.id ? await api.patch(`/class-leads/${editing.id}`, body) : await api.post("/class-leads", body);
      await load(); setEditing(null);
    } catch (e: any) { setFormError(e.message); }
    finally { setSaving(false); }
  };

  const moveTo = async (lead: any, status: string) => {
    setError("");
    try { await api.patch(`/class-leads/${lead.id}`, { status }); await load(); }
    catch (e: any) { setError(e.message); }
  };

  const inp = inputStyle(C, FB);

  const leadCard = (l: any) => (
    <Card key={l.id} C={C} style={{ padding: 14, borderColor: l.followUpOverdue ? C.ruby : C.border }}>
      <div onClick={() => open(l)} role="button" style={{ cursor: "pointer" }}>
        <div style={{ fontWeight: 700, fontSize: 16, color: C.text }}>{l.name}</div>
        {l.whatsapp && <div style={{ fontSize: 14, color: C.textSec, marginTop: 4 }}>{l.whatsapp}</div>}
        {l.followUpDate && (
          <div style={{ fontSize: 14, marginTop: 6, color: l.followUpOverdue ? C.ruby : C.textSec, fontWeight: l.followUpOverdue ? 700 : 400 }}>
            Próximo contato: {fmtDay(l.followUpDate)}{l.followUpOverdue ? " (atrasado)" : ""}
          </div>
        )}
        {l.source && <div style={{ fontSize: 13, color: C.textMuted, marginTop: 4 }}>Origem: {l.source}</div>}
      </div>
      {stages.find((s) => s.key === l.status)?.onlyByConversion ? (
        <div style={{ marginTop: 10 }}><Badge label={label(l.status)} color={C.sage} /></div>
      ) : (
        <select aria-label="Mudar etapa" value="" onChange={(e) => e.target.value && moveTo(l, e.target.value)}
          style={{ ...inp, marginTop: 10, minHeight: 40, fontSize: 14 }}>
          <option value="">Mudar etapa…</option>
          {movable.filter((s) => s.key !== l.status).map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
      )}
    </Card>
  );

  const column = (s: Stage) => {
    const items = leads.filter((l) => l.status === s.key);
    return (
      <div key={s.key} style={{ minWidth: 0 }}>
        {!mobile && <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 10 }}>{s.label} ({items.length})</div>}
        <div style={{ display: "grid", gap: 10 }}>
          {items.length === 0 ? <div style={{ fontSize: 14, color: C.textMuted, padding: "12px 0" }}>Ninguém aqui.</div> : items.map(leadCard)}
        </div>
      </div>
    );
  };

  const hiddenStage = hidden.find((s) => s.key === showHidden);
  return (
    <div style={{ fontFamily: FB }}>
      <PageHeader {...t} title="Interessados" subtitle="Quem pediu informação, fez aula experimental ou já virou aluno"
        action={<Button {...t} onClick={() => open(null)}>+ Novo interessado</Button>} />
      {error && <Notice C={C}>{error}</Notice>}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        {hiddenStage ? (
          <Button {...t} small variant="secondary" onClick={() => setShowHidden(null)}>← Voltar ao funil</Button>
        ) : (
          <>
            {mobile && visible.map((s) => (
              <Button key={s.key} {...t} small variant={mobileStage === s.key ? "primary" : "secondary"} onClick={() => setMobileStage(s.key)}>
                {s.label} ({counts[s.key] ?? 0})
              </Button>
            ))}
            {hidden.map((s) => (
              <Button key={s.key} {...t} small variant="secondary" onClick={() => setShowHidden(s.key)}>Ver {s.label.toLowerCase()}s ({counts[s.key] ?? 0})</Button>
            ))}
          </>
        )}
      </div>

      {loading ? <Empty C={C}>Carregando...</Empty> : hiddenStage ? (
        <>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 10 }}>{hiddenStage.label}s ({leads.length})</div>
          {leads.length === 0 ? <Empty C={C}>Ninguém nesta etapa.</Empty> : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 10 }}>{leads.map(leadCard)}</div>}
        </>
      ) : mobile ? (
        visible.filter((s) => s.key === mobileStage).map(column)
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.max(visible.length, 1)}, minmax(0, 1fr))`, gap: 16 }}>{visible.map(column)}</div>
      )}

      <Modal {...t} open={editing !== null} onClose={() => setEditing(null)} title={editing?.id ? `Interessado: ${editing.name}` : "Novo interessado"} width={560}>
        {formError && <Notice C={C}>{formError}</Notice>}
        <Field C={C} label="Nome" help={HELP.name}><input value={form.name} onChange={set("name")} style={inp} autoFocus /></Field>
        <Grid>
          <Field C={C} label="WhatsApp" help={HELP.whatsapp}><input value={form.whatsapp} onChange={set("whatsapp")} style={inp} inputMode="tel" placeholder="(34) 99999-0000" /></Field>
          <Field C={C} label="Origem" help={HELP.source}>
            <input value={form.source} onChange={set("source")} style={inp} list="lead-sources" placeholder="Ex.: Instagram" />
            <datalist id="lead-sources">{SOURCES.map((s) => <option key={s} value={s} />)}</datalist>
          </Field>
          <Field C={C} label="Próximo contato" help={HELP.followUpAt}><input type="date" value={form.followUpAt} onChange={set("followUpAt")} style={inp} /></Field>
          {editing?.id && !stages.find((s) => s.key === editing.status)?.onlyByConversion && (
            <Field C={C} label="Etapa" help={HELP.status}>
              <select value={form.status} onChange={set("status")} style={inp}>
                {movable.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </Field>
          )}
        </Grid>
        <Field C={C} label="Observações" help={HELP.notes}><textarea value={form.notes} onChange={set("notes")} style={{ ...inp, minHeight: 70 }} /></Field>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
          <Button {...t} variant="secondary" onClick={() => setEditing(null)}>Cancelar</Button>
          <Button {...t} onClick={save} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
        </div>
      </Modal>
    </div>
  );
}
