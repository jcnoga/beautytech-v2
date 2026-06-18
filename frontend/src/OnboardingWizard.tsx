import { useState } from "react";

const C = {
  bg: "#0B0F1A", card: "#141826", card2: "#1C2235",
  border: "rgba(255,255,255,0.08)", borderHi: "rgba(255,255,255,0.15)",
  rose: "#C9847A", gold: "#C9A96E", sage: "#7EB8A0",
  text: "#E2E8F0", textMuted: "#94A3B8", surface: "#0F1320",
  ruby: "#E05C5C",
};
const FB = "'Outfit', sans-serif";
const FD = "'Playfair Display', serif";
const API = (import.meta as any).env?.VITE_API_URL ?? "";

function getToken() {
  const k = Object.keys(localStorage).find(k => k.includes("auth-token") || k.includes("sb-"));
  if (k) {
    try { return JSON.parse(localStorage.getItem(k) || "{}").access_token; } catch { return null; }
  }
  return null;
}

async function apiPost(endpoint: string, body: any) {
  const token = getToken();
  const res = await fetch(`${API}/api/v1${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function apiPatch(endpoint: string, body: any) {
  const token = getToken();
  const res = await fetch(`${API}/api/v1${endpoint}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  return res.json();
}

interface OnboardingProps {
  tenantName: string;
  onComplete: () => void;
}

export default function OnboardingWizard({ tenantName, onComplete }: OnboardingProps) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Step 1 - Perfil do salao
  const [nome, setNome] = useState(tenantName ?? "");
  const [whatsapp, setWhatsapp] = useState("");
  const [cidade, setCidade] = useState("");
  const [rua, setRua] = useState("");

  // Step 2 - Primeiro profissional
  const [profNome, setProfNome] = useState("");
  const [profWhatsapp, setProfWhatsapp] = useState("");

  // Step 3 - Primeiro servico
  const [svcNome, setSvcNome] = useState("");
  const [svcPreco, setSvcPreco] = useState("");
  const [svcDuracao, setSvcDuracao] = useState("60");

  const steps = [
    { n: 1, label: "Perfil" },
    { n: 2, label: "Profissional" },
    { n: 3, label: "Servico" },
    { n: 4, label: "Pronto!" },
  ];

  const inp = (label: string, value: string, onChange: (v: string) => void, placeholder = "", type = "text") => (
    <div style={{ marginBottom: 16 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, display: "block", marginBottom: 6, textTransform: "uppercase" as const, letterSpacing: ".08em" }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: "100%", padding: "10px 14px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, fontSize: 13, fontFamily: FB, outline: "none", boxSizing: "border-box" as const }} />
    </div>
  );

  const saveStep1 = async () => {
    if (!nome.trim()) { setError("Informe o nome do estabelecimento."); return; }
    setSaving(true); setError("");
    try {
      await apiPatch("/auth/me/profile", { name: nome, whatsapp, addressCity: cidade, addressStreet: rua });
      setStep(2);
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  const saveStep2 = async () => {
    if (!profNome.trim()) { setError("Informe o nome do profissional."); return; }
    setSaving(true); setError("");
    try {
      await apiPost("/professionals", { fullName: profNome, whatsapp: profWhatsapp, commissionPct: "50" });
      setStep(3);
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  const saveStep3 = async () => {
    if (!svcNome.trim()) { setError("Informe o nome do servico."); return; }
    if (!svcPreco) { setError("Informe o preco do servico."); return; }
    setSaving(true); setError("");
    try {
      await apiPost("/services", { name: svcNome, price: svcPreco, durationMinutes: svcDuracao, isActive: true });
      setStep(4);
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FB, padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 520 }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: C.text, fontFamily: FD, marginBottom: 8 }}>
            Bem-vindo ao ZenSalon! 
          </div>
          <div style={{ fontSize: 14, color: C.textMuted }}>Vamos configurar seu estabelecimento em 3 passos rapidos.</div>
        </div>

        {/* Steps indicator */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 36, gap: 0 }}>
          {steps.map((s, i) => (
            <div key={s.n} style={{ display: "flex", alignItems: "center" }}>
              <div style={{ display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 6 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: "50%",
                  background: step > s.n ? C.sage : step === s.n ? C.rose : C.card,
                  border: `2px solid ${step > s.n ? C.sage : step === s.n ? C.rose : C.border}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 14, fontWeight: 700,
                  color: step >= s.n ? "#fff" : C.textMuted,
                }}>
                  {step > s.n ? "+" : s.n}
                </div>
                <div style={{ fontSize: 10, color: step === s.n ? C.rose : C.textMuted, fontWeight: step === s.n ? 700 : 400 }}>{s.label}</div>
              </div>
              {i < steps.length - 1 && (
                <div style={{ width: 60, height: 2, background: step > s.n ? C.sage : C.border, margin: "0 4px", marginBottom: 20 }} />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div style={{ background: C.card, border: `1px solid ${C.borderHi}`, borderRadius: 20, padding: 32 }}>

          {step === 1 && (
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 4 }}>Perfil do estabelecimento</div>
              <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 24 }}>Como seus clientes vao te encontrar.</div>
              {inp("Nome do estabelecimento *", nome, setNome, "Ex: Salao Beleza Total")}
              {inp("WhatsApp", whatsapp, setWhatsapp, "34999999999")}
              {inp("Cidade", cidade, setCidade, "Uberaba")}
              {inp("Endereco", rua, setRua, "Rua das Flores, 123")}
            </div>
          )}

          {step === 2 && (
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 4 }}>Seu primeiro profissional</div>
              <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 24 }}>Pode ser voce mesmo ou alguem da sua equipe.</div>
              {inp("Nome completo *", profNome, setProfNome, "Ex: Ana Silva")}
              {inp("WhatsApp (opcional)", profWhatsapp, setProfWhatsapp, "34999999999")}
              <div style={{ background: `${C.gold}12`, border: `1px solid ${C.gold}25`, borderRadius: 10, padding: "10px 14px", fontSize: 12, color: C.textMuted, marginBottom: 8 }}>
                Voce podera configurar os horarios de atendimento depois.
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 4 }}>Seu primeiro servico</div>
              <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 24 }}>Adicione mais servicos quando quiser.</div>
              {inp("Nome do servico *", svcNome, setSvcNome, "Ex: Corte Feminino")}
              {inp("Preco (R$) *", svcPreco, setSvcPreco, "80.00", "number")}
              {inp("Duracao (minutos)", svcDuracao, setSvcDuracao, "60", "number")}
            </div>
          )}

          {step === 4 && (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>OK</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: C.sage, fontFamily: FD, marginBottom: 8 }}>Tudo pronto!</div>
              <div style={{ fontSize: 14, color: C.textMuted, marginBottom: 24, lineHeight: 1.7 }}>
                Seu salao esta configurado. Agora voce pode compartilhar seu link de agendamento com seus clientes.
              </div>
              <div style={{ background: C.surface, borderRadius: 12, padding: "14px 16px", marginBottom: 24, fontSize: 13, color: C.gold, fontFamily: "monospace", wordBreak: "break-all" as const }}>
                zensalon.com.br/agendar/...
              </div>
              <div style={{ fontSize: 12, color: C.textMuted }}>
                Dica: Configure os horarios de atendimento do profissional em Profissionais para que seus clientes possam agendar online.
              </div>
            </div>
          )}

          {error && (
            <div style={{ background: `${C.ruby}15`, border: `1px solid ${C.ruby}30`, borderRadius: 10, padding: "10px 14px", color: C.ruby, fontSize: 12, marginBottom: 16, marginTop: 8 }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
            {step > 1 && step < 4 && (
              <button onClick={() => { setStep(s => s - 1); setError(""); }}
                style={{ padding: "12px 20px", background: "transparent", border: `1px solid ${C.border}`, borderRadius: 12, color: C.textMuted, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: FB }}>
                Voltar
              </button>
            )}
            {step === 1 && (
              <button onClick={saveStep1} disabled={saving}
                style={{ flex: 1, padding: "12px 0", background: C.rose, border: "none", borderRadius: 12, color: "#fff", fontSize: 14, fontWeight: 700, cursor: saving ? "default" : "pointer", fontFamily: FB, opacity: saving ? 0.7 : 1 }}>
                {saving ? "Salvando..." : "Continuar"}
              </button>
            )}
            {step === 2 && (
              <>
                <button onClick={() => { setStep(3); setError(""); }}
                  style={{ padding: "12px 20px", background: "transparent", border: `1px solid ${C.border}`, borderRadius: 12, color: C.textMuted, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: FB }}>
                  Pular
                </button>
                <button onClick={saveStep2} disabled={saving}
                  style={{ flex: 1, padding: "12px 0", background: C.rose, border: "none", borderRadius: 12, color: "#fff", fontSize: 14, fontWeight: 700, cursor: saving ? "default" : "pointer", fontFamily: FB, opacity: saving ? 0.7 : 1 }}>
                  {saving ? "Salvando..." : "Continuar"}
                </button>
              </>
            )}
            {step === 3 && (
              <>
                <button onClick={() => { setStep(4); setError(""); }}
                  style={{ padding: "12px 20px", background: "transparent", border: `1px solid ${C.border}`, borderRadius: 12, color: C.textMuted, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: FB }}>
                  Pular
                </button>
                <button onClick={saveStep3} disabled={saving}
                  style={{ flex: 1, padding: "12px 0", background: C.rose, border: "none", borderRadius: 12, color: "#fff", fontSize: 14, fontWeight: 700, cursor: saving ? "default" : "pointer", fontFamily: FB, opacity: saving ? 0.7 : 1 }}>
                  {saving ? "Salvando..." : "Finalizar"}
                </button>
              </>
            )}
            {step === 4 && (
              <button onClick={onComplete}
                style={{ flex: 1, padding: "12px 0", background: C.sage, border: "none", borderRadius: 12, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: FB }}>
                Ir para o Dashboard
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
