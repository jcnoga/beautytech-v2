import re

with open("frontend/src/App.tsx", "r", encoding="utf-8") as f:
    content = f.read()

old = '''function LoginPage({ onLogin }: any) {
  const [email, setEmail] = useState("admin@beautytech.com.br");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showRegister, setShowRegister] = useState(() => new URLSearchPa'''

new = '''function ForgotPasswordPage({ onBack }: any) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const submit = async () => {
    setLoading(true); setError(""); setMsg("");
    const { error: e } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/?reset=1"
    });
    if (e) setError(e.message);
    else setMsg("E-mail enviado! Verifique sua caixa de entrada.");
    setLoading(false);
  };

  return (
    <div style={{ minHeight:"100vh", background: C.bg, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
      <div style={{ width:"100%", maxWidth:420 }}>
        <div style={{ textAlign:"center", marginBottom:48 }}>
          <div style={{ fontSize:44, fontWeight:700, color: C.text, fontFamily:"Playfair Display, serif" }}>ZenSalon</div>
          <div style={{ fontSize:13, color: C.textMuted, marginTop:8 }}>Recuperar senha</div>
        </div>
        <div style={{ background: C.card, border:`1px solid ${C.borderHighlight}`, borderRadius:16, padding:32 }}>
          <Inp label="E-mail cadastrado" value={email} onChange={setEmail} type="email" />
          {error && <div style={{ background:`${C.ruby}15`, border:`1px solid ${C.ruby}40`, borderRadius:8, padding:"10px 14px", color: C.ruby, fontSize:13, marginBottom:16 }}>{error}</div>}
          {msg && <div style={{ background:`#10b98115`, border:`1px solid #10b98140`, borderRadius:8, padding:"10px 14px", color:"#10b981", fontSize:13, marginBottom:16 }}>{msg}</div>}
          <button onClick={submit} disabled={loading} style={{ width:"100%", padding:"14px", background: C.rosaBase, color:"#fff", border:"none", borderRadius:10, fontSize:15, fontWeight:600, cursor:"pointer", marginBottom:12 }}>
            {loading ? "Enviando..." : "Enviar e-mail de recuperacao"}
          </button>
          <div style={{ textAlign:"center" }}>
            <button onClick={onBack} style={{ background:"none", border:"none", color: C.textMuted, fontSize:13, cursor:"pointer" }}>
              Voltar ao login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoginPage({ onLogin }: any) {
  const [email, setEmail] = useState("admin@beautytech.com.br");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showForgot, setShowForgot] = useState(false);
  const [showRegister, setShowRegister] = useState(() => new URLSearchPa'''

content = content.replace(old, new, 1)

with open("frontend/src/App.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("OK" if "ForgotPasswordPage" in content else "ERRO")
