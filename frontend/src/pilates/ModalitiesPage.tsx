// Pilates: Modalidades (configuração do studio, item 27). Reaproveita a tabela de serviços.
// API: /pilates/modalities.
import { useEffect, useState } from "react";
import { api } from "../api/client";
import { type Theme, brl, PageHeader, Button, Field, inputStyle, Badge, Card, Modal, Grid, Notice, Empty } from "./ui";

const EMPTY = { name: "", description: "", durationMinutes: "50", price: "", isActive: true };

export default function PilatesModalitiesPage({ C, FD, FB }: Theme) {
  const t = { C, FD, FB };
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<any>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const load = async () => {
    setLoading(true); setError("");
    try { const r: any = await api.get("/pilates/modalities"); setList(r.data ?? []); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const open = (m: any | null) => {
    setFormError("");
    setEditing(m ?? {});
    setForm(m ? { name: m.name ?? "", description: m.description ?? "", durationMinutes: String(m.durationMinutes ?? 50), price: String(m.price ?? ""), isActive: !!m.isActive } : EMPTY);
  };
  const set = (k: string) => (e: any) => setForm((f: any) => ({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));
  const save = async () => {
    if (!form.name.trim()) { setFormError("Informe o nome da modalidade."); return; }
    setSaving(true); setFormError("");
    const body = { ...form, durationMinutes: Number(form.durationMinutes || 50), price: form.price === "" ? 0 : Number(form.price) };
    try {
      editing?.id ? await api.patch(`/pilates/modalities/${editing.id}`, body) : await api.post("/pilates/modalities", body);
      await load(); setEditing(null);
    } catch (e: any) { setFormError(e.message); }
    finally { setSaving(false); }
  };

  const inp = inputStyle(C, FB);
  return (
    <div style={{ fontFamily: FB }}>
      <PageHeader {...t} title="Modalidades" subtitle="Tipos de aula do studio (ex.: Mat Pilates, Reformer), com duração padrão"
        action={<Button {...t} onClick={() => open(null)}>+ Nova modalidade</Button>} />
      {error && <Notice C={C}>{error}</Notice>}
      {loading ? <Empty C={C}>Carregando...</Empty> : list.length === 0 ? <Empty C={C}>Nenhuma modalidade. Ex.: “Mat Pilates”, “Pilates Reformer”.</Empty> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
          {list.map((m) => (
            <Card key={m.id} C={C} onClick={() => open(m)} style={{ opacity: m.isActive ? 1 : 0.55 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <div style={{ fontWeight: 700, color: C.text }}>{m.name}</div>
                {!m.isActive && <Badge label="Inativa" color={C.textMuted} />}
              </div>
              <div style={{ fontSize: 12, color: C.textMuted, marginTop: 6 }}>{m.durationMinutes} min{Number(m.price) > 0 ? ` · aula avulsa ${brl(m.price)}` : ""}</div>
            </Card>
          ))}
        </div>
      )}
      <Modal {...t} open={editing !== null} onClose={() => setEditing(null)} title={editing?.id ? `Modalidade: ${editing.name}` : "Nova modalidade"} width={520}>
        {formError && <Notice C={C}>{formError}</Notice>}
        <Field C={C} label="Nome"><input value={form.name} onChange={set("name")} style={inp} autoFocus /></Field>
        <Grid>
          <Field C={C} label="Duração padrão (min)"><input type="number" min={5} max={600} value={form.durationMinutes} onChange={set("durationMinutes")} style={inp} /></Field>
          <Field C={C} label="Preço de referência (R$)"><input type="number" min={0} step="0.01" value={form.price} onChange={set("price")} style={inp} /></Field>
        </Grid>
        <Field C={C} label="Descrição"><textarea value={form.description} onChange={set("description")} style={{ ...inp, minHeight: 60 }} /></Field>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: C.text, marginBottom: 14 }}>
          <input type="checkbox" checked={!!form.isActive} onChange={set("isActive")} style={{ width: 18, height: 18 }} /> Modalidade ativa
        </label>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <Button {...t} variant="secondary" onClick={() => setEditing(null)}>Cancelar</Button>
          <Button {...t} onClick={save} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
        </div>
      </Modal>
    </div>
  );
}
