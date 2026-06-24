// frontend/src/pages/CheckoutPage.tsx
// Versão adaptada para o sistema de navegação do App.tsx (sem React Router)

import { useState, useEffect, useCallback } from "react";
import {
  CheckCircle, Clock, Copy, CreditCard,
  QrCode, AlertCircle, Loader2, ArrowLeft,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL;

const PLAN_INFO: Record<string, { name: string; features: string[] }> = {
  basic: {
    name: "Básico",
    features: ["1 profissional", "Clientes ilimitados", "Agendamentos", "WhatsApp básico"],
  },
  pro: {
    name: "Pro",
    features: ["Até 5 profissionais", "CRM completo", "Relatórios", "WhatsApp automático"],
  },
  super: {
    name: "Super",
    features: ["Até 12 profissionais", "Tudo do Pro", "Comissões", "Suporte prioritário"],
  },
};

const PERIOD_LABELS: Record<string, string> = {
  monthly:    "mensal",
  semiannual: "semestral",
  annual:     "anual",
};

function getAuthHeaders(): Record<string, string> {
  const key = Object.keys(localStorage).find((k) => k.includes("auth-token"));
  const raw = key ? localStorage.getItem(key) : null;
  const token = raw ? JSON.parse(raw)?.access_token : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
      ...(options.headers ?? {}),
    },
  });
  return res.json();
}

type PaymentMethod = "PIX" | "CREDIT_CARD";
type Step = "select_method" | "pix" | "card_redirect" | "success" | "error";

// Props recebidas do App.tsx via checkoutParams
interface CheckoutPageProps {
  setPage?: (page: string) => void;
  checkoutParams?: { tier: string; period: string };
}

export default function CheckoutPage({ setPage, checkoutParams }: CheckoutPageProps) {
  // Lê parâmetros do sessionStorage (definido pela PricingPage)
  const tier   = checkoutParams?.tier   ?? sessionStorage.getItem("checkout_tier")   ?? "pro";
  const period = checkoutParams?.period ?? sessionStorage.getItem("checkout_period") ?? "monthly";
  const plan   = PLAN_INFO[tier];

  const [step,       setStep]      = useState<Step>("select_method");
  const [loading,    setLoading]   = useState(false);
  const [paymentId,  setPaymentId] = useState<string | null>(null);
  const [pixData,    setPixData]   = useState<{ encodedImage: string; payload: string } | null>(null);
  const [invoiceUrl, setInvoiceUrl]= useState<string | null>(null);
  const [planPrice,  setPlanPrice] = useState<number | null>(null);
  const [planName,   setPlanName]  = useState("");
  const [copied,     setCopied]    = useState(false);
  const [polling,    setPolling]   = useState(false);
  const [errorMsg,   setErrorMsg]  = useState("");

  const handleSelectMethod = async (method: PaymentMethod) => {
    setLoading(true);
    setErrorMsg("");
    try {
      const endpoint = method === "PIX" ? "/billing/checkout-pix" : "/billing/checkout-card";
      const json = await apiFetch(endpoint, {
        method: "POST",
        body: JSON.stringify({ tier, period }),
      });
      if (!json.success) throw new Error(json.error ?? "Erro ao iniciar pagamento");

      setPaymentId(json.data.paymentId);
      setPlanPrice(json.data.value);
      setPlanName(json.data.planName);

      if (method === "PIX") {
        setPixData({ encodedImage: json.data.pix.encodedImage, payload: json.data.pix.payload });
        setStep("pix");
        setPolling(true);
      } else {
        setInvoiceUrl(json.data.invoiceUrl);
        window.open(json.data.invoiceUrl, "_blank");
        setStep("card_redirect");
        setPolling(true);
      }
    } catch (err: any) {
      setErrorMsg(err.message);
      setStep("error");
    } finally {
      setLoading(false);
    }
  };

  const checkStatus = useCallback(async () => {
    if (!paymentId) return;
    try {
      const json = await apiFetch(`/billing/payment-status/${paymentId}`);
      if (json.data?.status === "CONFIRMED" || json.data?.status === "RECEIVED") {
        setPolling(false);
        setStep("success");
      }
    } catch (_) {}
  }, [paymentId]);

  useEffect(() => {
    if (!polling) return;
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, [polling, checkStatus]);

  const copyPix = () => {
    if (!pixData?.payload) return;
    navigator.clipboard.writeText(pixData.payload);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const goBack = () => {
    if (setPage) setPage("pricing");
    else window.history.back();
  };

  const goDashboard = () => {
    if (setPage) setPage("dashboard");
    else window.location.href = "/";
  };

  if (!plan) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "#e05c5c" }}>Plano inválido. Volte e tente novamente.</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 16 }}>

      {/* Header */}
      <div style={{ width: "100%", maxWidth: 448, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
        <button onClick={goBack} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", display: "flex" }}>
          <ArrowLeft size={20} />
        </button>
        <span style={{ fontSize: 17, fontWeight: 700, color: "#374151" }}>Assinar ZenSalon</span>
      </div>

      <div style={{ width: "100%", maxWidth: 448, background: "#fff", borderRadius: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.08)", border: "1px solid #f3f4f6", overflow: "hidden" }}>

        {/* Cabeçalho roxo */}
        <div style={{ background: "#7c3aed", color: "#fff", padding: 24 }}>
          <p style={{ fontSize: 11, opacity: 0.7, textTransform: "uppercase", letterSpacing: "0.1em", margin: 0 }}>Você está assinando</p>
          <h2 style={{ fontSize: 24, fontWeight: 700, margin: "4px 0 0" }}>Plano {planName || plan.name}</h2>
          <p style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>
            Cobrança {PERIOD_LABELS[period]}
            {planPrice && <strong style={{ marginLeft: 6 }}>· R$ {planPrice.toFixed(2)}</strong>}
          </p>
          <ul style={{ marginTop: 12, padding: 0, listStyle: "none" }}>
            {plan.features.map((f) => (
              <li key={f} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, opacity: 0.9, marginBottom: 4 }}>
                <CheckCircle size={14} style={{ flexShrink: 0 }} />{f}
              </li>
            ))}
          </ul>
        </div>

        <div style={{ padding: 24 }}>

          {/* STEP 1: Escolha */}
          {step === "select_method" && (
            <div>
              <p style={{ fontWeight: 600, color: "#374151", marginBottom: 16 }}>Como deseja pagar?</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

                <button onClick={() => handleSelectMethod("PIX")} disabled={loading}
                  style={{ display: "flex", alignItems: "center", gap: 16, border: "2px solid #e5e7eb", borderRadius: 12, padding: 16, background: "#fff", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.5 : 1, width: "100%" }}>
                  <div style={{ width: 40, height: 40, background: "#dcfce7", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <QrCode size={20} color="#16a34a" />
                  </div>
                  <div style={{ textAlign: "left", flex: 1 }}>
                    <p style={{ fontWeight: 600, color: "#111827", margin: 0 }}>Pix</p>
                    <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>Aprovação instantânea</p>
                  </div>
                  {loading && <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />}
                </button>

                <button onClick={() => handleSelectMethod("CREDIT_CARD")} disabled={loading}
                  style={{ display: "flex", alignItems: "center", gap: 16, border: "2px solid #e5e7eb", borderRadius: 12, padding: 16, background: "#fff", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.5 : 1, width: "100%" }}>
                  <div style={{ width: 40, height: 40, background: "#dbeafe", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <CreditCard size={20} color="#2563eb" />
                  </div>
                  <div style={{ textAlign: "left", flex: 1 }}>
                    <p style={{ fontWeight: 600, color: "#111827", margin: 0 }}>Cartão de Crédito</p>
                    <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>Visa, Mastercard, Elo, Amex</p>
                  </div>
                  {loading && <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />}
                </button>
              </div>
            </div>
          )}

          {/* STEP 2a: Pix */}
          {step === "pix" && pixData && (
            <div style={{ textAlign: "center" }}>
              <p style={{ fontWeight: 600, color: "#374151", marginBottom: 16 }}>Escaneie o QR Code para pagar</p>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
                <img src={`data:image/png;base64,${pixData.encodedImage}`} alt="QR Code Pix"
                  style={{ width: 200, height: 200, border: "4px solid #ede9fe", borderRadius: 12 }} />
              </div>
              <div style={{ background: "#f9fafb", borderRadius: 12, padding: 12, marginBottom: 20, textAlign: "left" }}>
                <p style={{ fontSize: 11, color: "#9ca3af", margin: "0 0 4px" }}>Pix Copia e Cola</p>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <p style={{ fontSize: 11, color: "#4b5563", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "monospace", margin: 0 }}>{pixData.payload}</p>
                  <button onClick={copyPix} style={{ background: "none", border: "none", cursor: "pointer", color: "#7c3aed", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                    <Copy size={14} />{copied ? "Copiado!" : "Copiar"}
                  </button>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 13, color: "#9ca3af" }}>
                <Clock size={14} color="#7c3aed" />Aguardando confirmação...
              </div>
              <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 8 }}>Esta página atualiza automaticamente após o pagamento.</p>
            </div>
          )}

          {/* STEP 2b: Cartão */}
          {step === "card_redirect" && (
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              <div style={{ width: 56, height: 56, background: "#dbeafe", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <CreditCard size={28} color="#2563eb" />
              </div>
              <p style={{ fontWeight: 600, color: "#374151" }}>Página de pagamento aberta!</p>
              <p style={{ fontSize: 13, color: "#6b7280", marginTop: 8, lineHeight: 1.6 }}>
                Complete o pagamento na aba que abrimos.<br />Esta página será atualizada automaticamente.
              </p>
              {invoiceUrl && (
                <a href={invoiceUrl} target="_blank" rel="noopener noreferrer"
                  style={{ display: "inline-block", marginTop: 16, color: "#7c3aed", fontSize: 13 }}>
                  Reabrir página de pagamento →
                </a>
              )}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 13, color: "#9ca3af", marginTop: 20 }}>
                <Loader2 size={16} />Aguardando confirmação...
              </div>
            </div>
          )}

          {/* STEP 3: Sucesso */}
          {step === "success" && (
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              <div style={{ width: 64, height: 64, background: "#dcfce7", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <CheckCircle size={32} color="#16a34a" />
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 700, color: "#111827" }}>Pagamento confirmado!</h3>
              <p style={{ color: "#6b7280", marginTop: 8, lineHeight: 1.6 }}>
                Seu plano <strong style={{ color: "#7c3aed" }}>{planName || plan.name}</strong> está ativo.<br />
                Você receberá um e-mail de confirmação em breve.
              </p>
              <button onClick={goDashboard}
                style={{ marginTop: 24, width: "100%", background: "#7c3aed", color: "#fff", border: "none", borderRadius: 12, padding: "13px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                Ir para meu painel →
              </button>
            </div>
          )}

          {/* Erro */}
          {step === "error" && (
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              <div style={{ width: 56, height: 56, background: "#fee2e2", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <AlertCircle size={28} color="#ef4444" />
              </div>
              <p style={{ fontWeight: 600, color: "#374151" }}>Erro ao processar pagamento</p>
              <p style={{ fontSize: 13, color: "#ef4444", marginTop: 8 }}>{errorMsg}</p>
              <button onClick={() => setStep("select_method")}
                style={{ marginTop: 16, background: "none", border: "none", cursor: "pointer", color: "#7c3aed", fontSize: 13, textDecoration: "underline" }}>
                Tentar novamente
              </button>
            </div>
          )}

        </div>
      </div>

      <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 16 }}>
        Pagamento processado com segurança via Asaas · ZenSalon
      </p>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
