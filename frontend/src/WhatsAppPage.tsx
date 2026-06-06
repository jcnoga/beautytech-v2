import { useState, useEffect, useRef } from "react";
import { api } from "./api/client";

export function WhatsAppPage({ C, FD, FB }: any) {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<any>(null);

  function getToken() {
    const s = JSON.parse(localStorage.getItem("sb-wthhegdhdkhffjbzhvtt-auth-token") || "{}");
    return s?.access_token || "";
  }

  async function callApi(path: string, method: string = "GET") {
    const token = getToken();
    const res = await fetch("http://localhost:3000/api/v1" + path, {
      method,
      headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" },
      body: method === "POST" ? "{}" : undefined,
    });
    return res.json();
  }

  async function loadStatus() {
    try {
      const d = await callApi("/whatsapp/status");
      setStatus(d.data);
      if (d.data?.base64) { setQrCode(d.data.base64); stopPolling(); }
      else if (d.data?.state === "open") { setQrCode(null); stopPolling(); }
      return d.data;
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function startPolling() {
    stopPolling();
    pollRef.current = setInterval(async () => {
      const d = await loadStatus();
      if (d?.base64 || d?.state === "open") stopPolling();
    }, 3000);
  }

  function stopPolling() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }

  async function handleConnect() {
    setConnecting(true);
    setQrCode(null);
    setError(null);
    try {
      await callApi("/whatsapp/connect", "POST");
      startPolling();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    if (!confirm("Deseja desconectar o WhatsApp?")) return;
    try {
      setLoading(true);
      stopPolling();
      await callApi("/whatsapp/disconnect", "POST");
      setQrCode(null);
      await loadStatus();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadStatus(); return () => stopPolling(); }, []);

  const connected = status?.state === "open";

  return (
    <div style={{ padding: "32px 40px", maxWidth: 700, margin: "0 auto" }}>
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 11, letterSpacing: "0.25em", color: C.rose, textTransform: "uppercase", marginBottom: 8, fontFamily: FB }}>Integracao</div>
        <div style={{ fontSize: 28, fontWeight: 700, color: C.text, fontFamily: FD }}>WhatsApp</div>
        <div style={{ fontSize: 13, color: C.textMuted, marginTop: 4, fontFamily: FB }}>Conecte o WhatsApp do seu salao para enviar mensagens automaticas</div>
      </div>
      {error && (
        <div style={{ background: C.ruby + "15", border: "1px solid " + C.ruby + "40", borderRadius: 12, padding: "12px 16px", marginBottom: 20, color: C.ruby, fontSize: 13, fontFamily: FB }}>
          {error}
        </div>
      )}
      <div style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 16, padding: 32, marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: qrCode ? 28 : 0 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: connected ? C.sage + "20" : C.textMuted + "15", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>W</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.text, fontFamily: FD }}>Status da Conexao</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: connected ? C.sage : connecting ? C.gold : C.ruby }} />
              <span style={{ fontSize: 13, color: connected ? C.sage : connecting ? C.gold : C.ruby, fontFamily: FB, fontWeight: 600 }}>
                {loading ? "Verificando..." : connected ? "Conectado" : connecting ? "Aguardando QR Code..." : "Desconectado"}
              </span>
            </div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
            {!connected && (
              <button onClick={handleConnect} disabled={connecting || loading}
                style={{ padding: "10px 22px", background: "linear-gradient(135deg, " + C.sage + ", #5a8f55)", color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: FB, opacity: connecting ? 0.7 : 1 }}>
                {connecting ? "Conectando..." : "Conectar"}
              </button>
            )}
            {connected && (
              <button onClick={handleDisconnect} disabled={loading}
                style={{ padding: "10px 22px", background: C.ruby + "15", color: C.ruby, border: "1px solid " + C.ruby + "40", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: FB }}>
                Desconectar
              </button>
            )}
            <button onClick={() => { setLoading(true); loadStatus(); }} disabled={loading}
              style={{ padding: "10px 16px", background: C.surface, color: C.textMuted, border: "1px solid " + C.border, borderRadius: 10, fontSize: 13, cursor: "pointer", fontFamily: FB }}>
              Atualizar
            </button>
          </div>
        </div>
        {qrCode && !connected && (
          <div style={{ borderTop: "1px solid " + C.border, paddingTop: 24, marginTop: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.text, fontFamily: FB, marginBottom: 4 }}>Escaneie o QR Code com o WhatsApp</div>
            <div style={{ fontSize: 12, color: C.textMuted, fontFamily: FB, marginBottom: 16 }}>Abra o WhatsApp - Aparelhos conectados - Conectar aparelho</div>
            <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
              <img src={qrCode} alt="QR Code WhatsApp" style={{ width: 220, height: 220, borderRadius: 12, border: "1px solid " + C.border }} />
              <div style={{ fontSize: 12, color: C.textMuted, fontFamily: FB, lineHeight: 1.8 }}>
                <div>1. Abra o WhatsApp no celular</div>
                <div>2. Toque em Configuracoes</div>
                <div>3. Toque em Aparelhos conectados</div>
                <div>4. Toque em Conectar aparelho</div>
                <div>5. Aponte para este QR Code</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
