// Aulas em turma: Pagamentos do aluno (aba da ficha). Parcelas de todas as matrículas, geradas no Financeiro.
// Em aberto primeiro (atrasadas em destaque), com "Receber"; pagas e canceladas ficam em "Ver pagas e canceladas".
// Só quem tem acesso ao Financeiro vê (o backend responde 403 para os outros).
// API: GET /memberships/enrollments/installments?studentId=, POST /memberships/enrollments/installments/:id/receive.
import { useEffect, useState } from "react";
import { api } from "../api/client";
import { type Theme, Badge, Button, Modal, Notice, brl, fmtDay } from "./ui";

const METHODS: [string, string][] = [
  ["pix", "Pix"], ["cash", "Dinheiro"], ["debit_card", "Cartão de débito"], ["credit_card", "Cartão de crédito"],
  ["bank_transfer", "Transferência"], ["other", "Outra"],
];
const METHOD_LABEL = Object.fromEntries(METHODS);

export default function StudentPayments({ C, FD, FB, studentId }: Theme & { studentId: string }) {
  const t = { C, FD, FB };
  const [items, setItems] = useState<any[] | null>(null);
  const [error, setError] = useState("");
  const [forbidden, setForbidden] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const [receiving, setReceiving] = useState<any | null>(null); // parcela com a janela "Receber" aberta
  const [method, setMethod] = useState("pix");
  const [saving, setSaving] = useState(false);
  const [receiveError, setReceiveError] = useState("");

  const load = () => {
    setError("");
    api.get<any>("/memberships/enrollments/installments", { studentId })
      .then((r) => setItems(r.data ?? []))
      .catch((e: any) => { if (e.status === 403) setForbidden(true); else setError(e.message); setItems([]); });
  };
  useEffect(() => { setItems(null); setForbidden(false); setShowDone(false); load(); }, [studentId]);

  const receive = async () => {
    setSaving(true); setReceiveError("");
    try {
      await api.post(`/memberships/enrollments/installments/${receiving.id}/receive`, { paymentMethod: method });
      setReceiving(null);
      load();
    } catch (e: any) { setReceiveError(e.message); }
    finally { setSaving(false); }
  };

  if (forbidden) return <div style={{ fontSize: 15, color: C.textMuted }}>Só quem tem acesso ao Financeiro vê os pagamentos do aluno.</div>;
  if (items === null) return <div style={{ fontSize: 14, color: C.textMuted }}>Carregando...</div>;

  const open = items.filter((i) => i.status === "pending");
  const done = items.filter((i) => i.status !== "pending").reverse(); // mais recentes primeiro
  const overdue = open.filter((i) => i.overdue);
  const sum = (l: any[]) => l.reduce((s, i) => s + Number(i.amount), 0);

  const row = (i: any) => {
    const [label, color] = i.status === "confirmed" ? ["Pago", C.sage] : i.status === "cancelled" ? ["Cancelado", C.textMuted]
      : i.overdue ? ["Atrasado", C.ruby] : ["Em aberto", C.gold];
    return (
      <div key={i.id} style={{ border: `1px solid ${i.overdue ? C.ruby + "66" : C.border}`, borderRadius: 14, padding: "12px 14px", background: C.card,
        display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.text }}>{brl(i.amount)} <span style={{ fontSize: 15, fontWeight: 400, color: C.textSec }}>· vence {fmtDay(i.dueDate)}</span></div>
          <div style={{ fontSize: 14, color: C.textMuted, marginTop: 4 }}>
            {i.planName} · parcela {i.installmentNo}
            {i.status === "confirmed" && i.paidAt ? ` · pago em ${new Date(i.paidAt).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}${i.paymentMethod ? ` (${METHOD_LABEL[i.paymentMethod] ?? i.paymentMethod})` : ""}` : ""}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Badge label={label} color={color} />
          {i.status === "pending" && <Button {...t} small onClick={() => { setMethod("pix"); setReceiveError(""); setReceiving(i); }}>Receber</Button>}
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {error && <Notice C={C}>{error}</Notice>}
      {items.length === 0 && !error && <div style={{ fontSize: 15, color: C.textMuted }}>Nenhuma mensalidade ainda. Elas aparecem ao matricular o aluno.</div>}
      {open.length > 0 && (
        <div style={{ fontSize: 16, color: C.text }}>
          Em aberto: <b>{brl(sum(open))}</b>
          {overdue.length > 0 && <span style={{ color: C.ruby, fontWeight: 700 }}> · atrasado: {brl(sum(overdue))}</span>}
        </div>
      )}
      {open.map(row)}
      {done.length > 0 && (
        <div>
          <Button {...t} small variant="secondary" onClick={() => setShowDone((v) => !v)}>{showDone ? "Esconder pagas e canceladas" : `Ver pagas e canceladas (${done.length})`}</Button>
          {showDone && <div style={{ display: "grid", gap: 10, marginTop: 10 }}>{done.map(row)}</div>}
        </div>
      )}

      <Modal {...t} open={!!receiving} onClose={() => setReceiving(null)} title="Receber mensalidade" width={460}>
        {receiving && (<>
          {receiveError && <Notice C={C}>{receiveError}</Notice>}
          <div style={{ fontSize: 22, fontWeight: 800, color: C.text }}>{brl(receiving.amount)}</div>
          <div style={{ fontSize: 15, color: C.textSec, margin: "4px 0 14px" }}>{receiving.planName} · vence {fmtDay(receiving.dueDate)}</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 8 }}>Como o aluno pagou?</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 8 }}>
            {METHODS.map(([v, l]) => (
              <Button key={v} {...t} variant={method === v ? "primary" : "secondary"} onClick={() => setMethod(v)}>{l}</Button>
            ))}
          </div>
          <div style={{ fontSize: 13, color: C.textMuted, marginTop: 12 }}>Fica registrado como pago hoje, no Financeiro.</div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 14 }}>
            <Button {...t} variant="secondary" onClick={() => setReceiving(null)}>Voltar</Button>
            <Button {...t} onClick={receive} disabled={saving}>{saving ? "Registrando..." : "Confirmar recebimento"}</Button>
          </div>
        </>)}
      </Modal>
    </div>
  );
}
