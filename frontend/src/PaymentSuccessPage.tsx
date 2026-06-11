import { useEffect, useState } from "react";

const C = {
  bg: "#0f0f0f",
  card: "#1a1a1a",
  rose: "#c9a96e",
  roseDeep: "#a07840",
  sage: "#7aab8a",
  text: "#f5f0eb",
  textMuted: "#8a8078",
  border: "#2a2a2a",
};

const FB = "'Outfit', sans-serif";
const FH = "'Playfair Display', serif";

export default function PaymentSuccessPage({ onGoHome }: { onGoHome: () => void }) {
  const [status, setStatus] = useState<"loading" | "success" | "pending">("loading");

  useEffect(() => {
    // Verifica status do plano via API
    const apiUrl = (import.meta as any).env?.VITE_API_URL ?? "";
    const token = (() => {
      try {
        const key = Object.keys(localStorage).find(k => k.includes("auth-token"));
        if (!key) return null;
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        return JSON.parse(raw)?.access_token ?? null;
      } catch { return null; }
    })();

    if (!token) { setStatus("pending"); return; }

    fetch(`${apiUrl}/api/v1/billing/status`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(json => {
        const s = json?.data?.status;
        if (s === "CONFIRMED" || s === "RECEIVED") setStatus("success");
        else setStatus("pending");
      })
      .catch(() => setStatus("pending"));
  }, []);

  return (
    <div style={{
      minHeight: "100vh",
      background: C.bg,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: FB,
      padding: 24,
    }}>
      <div style={{
        background: C.card,
        border: `1px solid ${C.rose}40`,
        borderRadius: 24,
        padding: "48px 40px",
        maxWidth: 480,
        width: "100%",
        textAlign: "center",
      }}>

        {status === "loading" && (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
            <h2 style={{ fontFamily: FH, color: C.rose, fontSize: 24, marginBottom: 8 }}>
              Verificando pagamento...
            </h2>
            <p style={{ color: C.textMuted, fontSize: 14 }}>Aguarde um momento.</p>
          </>
        )}

        {status === "success" && (
          <>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
            <h2 style={{ fontFamily: FH, color: C.rose, fontSize: 28, marginBottom: 12 }}>
              Plano Pro Ativado!
            </h2>
            <p style={{ color: C.text, fontSize: 15, marginBottom: 8 }}>
              Bem-vindo ao BeautyTech Pro.
            </p>
            <p style={{ color: C.textMuted, fontSize: 13, marginBottom: 32 }}>
              Todos os recursos premium estão liberados para o seu negócio.
            </p>
            <div style={{
              background: `${C.sage}15`,
              border: `1px solid ${C.sage}30`,
              borderRadius: 12,
              padding: "16px 20px",
              marginBottom: 32,
              textAlign: "left",
            }}>
              {["Agendamentos ilimitados", "WhatsApp Marketing", "Relatórios completos", "Suporte prioritário"].map(item => (
                <div key={item} style={{ color: C.sage, fontSize: 13, marginBottom: 6 }}>
                  ✓ {item}
                </div>
              ))}
            </div>
            <button
              onClick={onGoHome}
              style={{
                width: "100%",
                padding: "14px 0",
                background: `linear-gradient(135deg, ${C.rose}, ${C.roseDeep})`,
                border: "none",
                borderRadius: 12,
                color: "#fff",
                fontWeight: 700,
                fontSize: 15,
                cursor: "pointer",
                fontFamily: FB,
              }}
            >
              Acessar o Sistema →
            </button>
          </>
        )}

        {status === "pending" && (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⏰</div>
            <h2 style={{ fontFamily: FH, color: C.rose, fontSize: 24, marginBottom: 12 }}>
              Pagamento em processamento
            </h2>
            <p style={{ color: C.text, fontSize: 14, marginBottom: 8 }}>
              Seu pagamento está sendo processado.
            </p>
            <p style={{ color: C.textMuted, fontSize: 13, marginBottom: 32 }}>
              Isso pode levar alguns minutos. Você receberá um e-mail de confirmação assim que for aprovado.
            </p>
            <button
              onClick={onGoHome}
              style={{
                width: "100%",
                padding: "14px 0",
                background: `linear-gradient(135deg, ${C.rose}, ${C.roseDeep})`,
                border: "none",
                borderRadius: 12,
                color: "#fff",
                fontWeight: 700,
                fontSize: 15,
                cursor: "pointer",
                fontFamily: FB,
              }}
            >
              Voltar ao Sistema
            </button>
          </>
        )}

      </div>
    </div>
  );
}
