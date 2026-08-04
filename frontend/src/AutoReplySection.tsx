import { useState, useEffect } from "react";
import { api } from "./api/client";

interface AutoReplyMessage {
  id: string;
  audience: "existing_client" | "new_contact";
  message: string;
  sortOrder: number;
  isActive: boolean;
}

interface AutoReplySettings {
  tenantId?: string;
  isEnabled: boolean;
  linkTarget: string;
  cooldownHours: number;
}

export function AutoReplySection({ C, FD, FB }: any) {
  const [settings, setSettings] = useState<AutoReplySettings | null>(null);
  const [existingMsgs, setExistingMsgs] = useState<AutoReplyMessage[]>([]);
  const [newContactMsgs, setNewContactMsgs] = useState<AutoReplyMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingToggle, setSavingToggle] = useState(false);
  const [newDraft, setNewDraft] = useState<{ existing_client: string; new_contact: string }>({
    existing_client: "",
    new_contact: "",
  });

  async function loadAll() {
    setLoading(true);
    try {
      const [settingsRes, existingRes, newRes] = await Promise.all([
        api.get<any>("/auto-reply/settings"),
        api.get<any>("/auto-reply/messages", { audience: "existing_client" }),
        api.get<any>("/auto-reply/messages", { audience: "new_contact" }),
      ]);
      setSettings(settingsRes.data);
      setExistingMsgs(existingRes.data);
      setNewContactMsgs(newRes.data);
    } catch (e) {
      console.error("Erro ao carregar Recepcao Automatica:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, []);

  async function toggleEnabled() {
    if (!settings) return;
    setSavingToggle(true);
    try {
      const res = await api.patch<any>("/auto-reply/settings", { isEnabled: !settings.isEnabled });
      setSettings(res.data);
    } catch (e: any) {
      alert("Erro ao salvar: " + e.message);
    } finally {
      setSavingToggle(false);
    }
  }

  async function addMessage(audience: "existing_client" | "new_contact") {
    const text = newDraft[audience].trim();
    if (!text) return;
    try {
      const res = await api.post<any>("/auto-reply/messages", { audience, message: text });
      if (audience === "existing_client") setExistingMsgs((m) => [...m, res.data]);
      else setNewContactMsgs((m) => [...m, res.data]);
      setNewDraft((d) => ({ ...d, [audience]: "" }));
    } catch (e: any) {
      alert("Erro ao adicionar: " + e.message);
    }
  }

  async function seedDefaults() {
    try {
      await api.post<any>("/auto-reply/messages/seed", {});
      await loadAll();
    } catch (e: any) {
      alert("Erro ao inicializar mensagens: " + e.message);
    }
  }

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");

  function startEdit(msg: AutoReplyMessage) {
    setEditingId(msg.id);
    setEditDraft(msg.message);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditDraft("");
  }

  async function saveEdit(id: string, audience: "existing_client" | "new_contact") {
    try {
      const res = await api.patch<any>(`/auto-reply/messages/${id}`, { message: editDraft });
      const updater = (list: AutoReplyMessage[]) => list.map((m) => (m.id === id ? res.data : m));
      if (audience === "existing_client") setExistingMsgs(updater);
      else setNewContactMsgs(updater);
      cancelEdit();
    } catch (e: any) {
      alert("Erro ao salvar edicao: " + e.message);
    }
  }

  async function toggleMessageActive(msg: AutoReplyMessage, audience: "existing_client" | "new_contact") {
    try {
      const res = await api.patch<any>(`/auto-reply/messages/${msg.id}`, { isActive: !msg.isActive });
      const updater = (list: AutoReplyMessage[]) => list.map((m) => (m.id === msg.id ? res.data : m));
      if (audience === "existing_client") setExistingMsgs(updater);
      else setNewContactMsgs(updater);
    } catch (e: any) {
      alert("Erro ao atualizar: " + e.message);
    }
  }

  async function removeMessage(id: string, audience: "existing_client" | "new_contact") {
    if (!confirm("Remover esta mensagem?")) return;
    try {
      await api.delete(`/auto-reply/messages/${id}`);
      if (audience === "existing_client") setExistingMsgs((m) => m.filter((x) => x.id !== id));
      else setNewContactMsgs((m) => m.filter((x) => x.id !== id));
    } catch (e: any) {
      alert("Erro ao remover: " + e.message);
    }
  }

  if (loading) {
    return (
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24, marginTop: 20 }}>
        <div style={{ fontSize: 13, color: C.textMuted, fontFamily: FB }}>Carregando Recepcao Automatica...</div>
      </div>
    );
  }

  const renderMessageList = (
    list: AutoReplyMessage[],
    audience: "existing_client" | "new_contact",
    placeholder: string
  ) => (
    <div style={{ flex: 1, minWidth: 280 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: C.text, fontFamily: FB, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {audience === "existing_client" ? "Mensagens para clientes ({nome} disponivel)" : "Mensagens para contatos novos"}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
        {list.length === 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-start" }}>
            <div style={{ fontSize: 12, color: C.textMuted, fontFamily: FB, fontStyle: "italic" }}>Nenhuma mensagem cadastrada ainda.</div>
            <button
              onClick={seedDefaults}
              style={{ fontSize: 11, padding: "6px 14px", borderRadius: 8, border: `1px solid ${C.gold}40`, background: `${C.gold}15`, color: C.gold, cursor: "pointer", fontFamily: FB, fontWeight: 600 }}
            >
              Inicializar 10 mensagens padrao
            </button>
          </div>
        )}
        {list.map((msg) =>
          editingId === msg.id ? (
            <div key={msg.id} style={{ background: C.surface, border: `1px solid ${C.borderHi}`, borderRadius: 10, padding: "10px 12px" }}>
              <textarea
                value={editDraft}
                onChange={(e) => setEditDraft(e.target.value)}
                rows={2}
                style={{ width: "100%", background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 10px", color: C.text, fontFamily: FB, fontSize: 12, outline: "none", resize: "vertical", marginBottom: 8, boxSizing: "border-box" }}
              />
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => saveEdit(msg.id, audience)}
                  style={{ fontSize: 10, padding: "3px 10px", borderRadius: 6, border: "none", background: C.sage, color: "#fff", cursor: "pointer", fontFamily: FB, fontWeight: 700 }}
                >
                  Salvar
                </button>
                <button
                  onClick={cancelEdit}
                  style={{ fontSize: 10, padding: "3px 10px", borderRadius: 6, border: `1px solid ${C.border}`, background: "transparent", color: C.textMuted, cursor: "pointer", fontFamily: FB }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div
              key={msg.id}
              style={{
                background: C.surface,
                border: `1px solid ${msg.isActive ? C.borderHi : C.border}`,
                borderRadius: 10,
                padding: "10px 12px",
                opacity: msg.isActive ? 1 : 0.5,
              }}
            >
              <div style={{ fontSize: 12, color: C.textSec, fontFamily: FB, lineHeight: 1.5, marginBottom: 8 }}>{msg.message}</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => startEdit(msg)}
                  style={{ fontSize: 10, padding: "3px 10px", borderRadius: 6, border: `1px solid ${C.border}`, background: "transparent", color: C.text, cursor: "pointer", fontFamily: FB }}
                >
                  Editar
                </button>
                <button
                  onClick={() => toggleMessageActive(msg, audience)}
                  style={{ fontSize: 10, padding: "3px 10px", borderRadius: 6, border: `1px solid ${C.border}`, background: "transparent", color: C.textMuted, cursor: "pointer", fontFamily: FB }}
                >
                  {msg.isActive ? "Desativar" : "Ativar"}
                </button>
                <button
                  onClick={() => removeMessage(msg.id, audience)}
                  style={{ fontSize: 10, padding: "3px 10px", borderRadius: 6, border: `1px solid ${C.ruby}40`, background: `${C.ruby}15`, color: C.ruby, cursor: "pointer", fontFamily: FB }}
                >
                  Remover
                </button>
              </div>
            </div>
          )
        )}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <textarea
          value={newDraft[audience]}
          onChange={(e) => setNewDraft((d) => ({ ...d, [audience]: e.target.value }))}
          placeholder={placeholder}
          rows={2}
          style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "8px 12px", color: C.text, fontFamily: FB, fontSize: 12, outline: "none", resize: "vertical" }}
        />
        <button
          onClick={() => addMessage(audience)}
          style={{ padding: "8px 16px", background: C.sage, color: "#fff", border: "none", borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: FB, alignSelf: "flex-start" }}
        >
          + Add
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24, marginTop: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.text, fontFamily: FD }}>Recepcao Automatica</div>
          <div style={{ fontSize: 12, color: C.textMuted, fontFamily: FB, marginTop: 2 }}>
            Responde automaticamente quem manda mensagem pela primeira vez, com um link de agendamento.
          </div>
        </div>
        <button
          onClick={toggleEnabled}
          disabled={savingToggle}
          style={{
            width: 48, height: 26, borderRadius: 13, border: "none", cursor: "pointer",
            background: settings?.isEnabled ? C.sage : C.border,
            position: "relative", transition: "background .2s", opacity: savingToggle ? 0.6 : 1,
            flexShrink: 0,
          }}
        >
          <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: settings?.isEnabled ? 25 : 3, transition: "left .2s" }} />
        </button>
      </div>

      {settings?.isEnabled && (
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginTop: 20, paddingTop: 20, borderTop: `1px solid ${C.border}` }}>
          {renderMessageList(existingMsgs, "existing_client", "Ex: Ola {nome}! Bom te ver por aqui de novo. Quer agendar? {link}")}
          {renderMessageList(newContactMsgs, "new_contact", "Ex: Ola! Que bom que voce chegou ate aqui. Conheca nossos horarios: {link}")}
        </div>
      )}
    </div>
  );
}
