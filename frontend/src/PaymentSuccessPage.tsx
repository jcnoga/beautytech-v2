import { useEffect, useState } from "react";

const C = {
  bg: "#0B0F1A",
  card: "#141826",
  primary: "#C9847A",
  primaryDeep: "#A06050",
  green: "#22C55E",
  text: "#E2E8F0",
  textMuted: "#94A3B8",
  border: "#2A3150",
};

const FB = "'Inter', sans-serif";
const FH = "'Poppins', sans-serif";

export default function PaymentSuccessPage({ onGoHome }: { onGoHome: () => void }) {
  const [status, setStatus] = useState<"loading" | "success" | "pending">("loading");

  useEffect(() => {
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
        border: `1px solid ${C.primary}40`,
        borderRadius: 24,
        padding: "48px 40px",
        maxWidth: 480,
        width: "100%",
        textAlign: "center",
        boxShadow: `0 24px 48px rgba(0,0,0,0.4)`,
      }}>

        {/* LOGO */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: C.primary, fontFamily: FH }}>
            ZenSalon
          </div>
          <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>
            Gestao inteligente para saloes
          </div>
        </div>

        {status === "loading" && (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
            <h2 style={{ fontFamily: FH, color: C.primary, fontSize: 22, marginBottom: 8 }}>
              Verificando pagamento...
            </h2>
            <p style={{ color: C.textMuted, fontSize: 14 }}>Aguarde um momento.</p>
          </>
        )}

        {status === "success" && (
          <>
            <div style={{
              width: 80, height: 80, borderRadius: "50%",
              background: `${C.green}20`, border: `2px solid ${C.green}50`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 36, margin: "0 auto 24px",
            }}>
              🎉
            </div>
            <h2 style={{ fontFamily: FH, color: C.primary, fontSize: 26, marginBottom: 10 }}>
              Plano Pro Ativado!
            </h2>
            <p style={{ color: C.text, fontSize: 14, marginBottom: 6 }}>
              Bem-vindo ao ZenSalon Pro.
            </p>
            <p style={{ color: C.textMuted, fontSize: 13, marginBottom: 28 }}>
              Todos os recursos premium estao liberados para o seu negocio.
            </p>
            <div style={{
              background: `${C.green}10`,
              border: `1px solid ${C.green}25`,
              borderRadius: 12,
              padding: "16px 20px",
              marginBottom: 28,
              textAlign: "left",
            }}>
              {[
                "Agendamentos ilimitados",
                "WhatsApp Marketing",
                "Relatorios completos",
                "CRM e fidelidade",
                "Suporte prioritario",
              ].map(item => (
                <div key={item} style={{
                  color: C.green, fontSize: 13, marginBottom: 6,
                  display: "flex", alignItems: "center", gap: 8,
                }}>
                  <span>✓</span> <span style={{ color: C.text }}>{item}</span>
                </div>
              ))}
            </div>
            <button
              onClick={onGoHome}
              style={{
                width: "100%", padding: "14px 0",
                background: `linear-gradient(135deg, ${C.primary}, ${C.primaryDeep})`,
                border: "none", borderRadius: 12, color: "#fff",
                fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: FB,
                transition: "opacity .2s",
              }}
              onMouseOver={e => (e.currentTarget.style.opacity = "0.9")}
              onMouseOut={e => (e.currentTarget.style.opacity = "1")}
            >
              Acessar o Sistema →
            </button>
          </>
        )}

        {status === "pending" && (
          <>
            <div style={{
              width: 80, height: 80, borderRadius: "50%",
              background: `${C.primary}15`, border: `2px solid ${C.primary}40`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 36, margin: "0 auto 24px",
            }}>
              ⏰
            </div>
            <h2 style={{ fontFamily: FH, color: C.primary, fontSize: 22, marginBottom: 10 }}>
              Pagamento em processamento
            </h2>
            <p style={{ color: C.text, fontSize: 14, marginBottom: 6 }}>
              Seu pagamento esta sendo processado.
            </p>
            <p style={{ color: C.textMuted, fontSize: 13, marginBottom: 28 }}>
              Isso pode levar alguns minutos. Voce recebera um e-mail de confirmacao assim que for aprovado.
            </p>
            <div style={{
              background: `${C.primary}10`,
              border: `1px solid ${C.primary}25`,
              borderRadius: 12, padding: "14px 18px", marginBottom: 28,
            }}>
              <p style={{ color: C.textMuted, fontSize: 13, margin: 0 }}>
                Duvidas? Entre em contato via WhatsApp ou e-mail.
              </p>
            </div>
            <button
              onClick={onGoHome}
              style={{
                width: "100%", padding: "14px 0",
                background: `linear-gradient(135deg, ${C.primary}, ${C.primaryDeep})`,
                border: "none", borderRadius: 12, color: "#fff",
                fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: FB,
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