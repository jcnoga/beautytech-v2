import { useState, useEffect } from "react";
const C = { bg:"#0f0f0f",card:"#1a1a1a",border:"rgba(255,255,255,0.08)",gold:"#c9a96e",sage:"#7eb8a0",ruby:"#e87070",text:"#f0ece4",textMuted:"rgba(255,255,255,0.4)",surface:"#141414" };
const FB = "'Outfit', sans-serif";
const FD = "'Playfair Display', serif";
export default function ResetSenhaPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [isConvite, setIsConvite] = useState(false);
  const token = new URLSearchParams(window.location.search).get("token") ?? "";
  useEffect(() => { setIsConvite(new URLSearchParams(window.location.search).get("convite") === "1"); }, []);
  const submit = async () => {
    setError("");
    if (!token) { setError("Link invalido ou expirado."); return; }
    if (password.length < 6) { setError("A senha deve ter pelo menos 6 caracteres."); return; }
    if (password !== confirm) { setError("As senhas nao coincidem."); return; }
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/reset-password`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ token, password }) });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Erro ao redefinir senha");
      setDone(true);
    } catch(e: any) { setError(e.message); }
    finally { setLoading(false); }
  };
  const inp: any = { width:"100%", padding:"10px 14px", background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, color:C.text, fontSize:13, fontFamily:FB, outline:"none", boxSizing:"border-box" };
  return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:FB, padding:20 }}>
      <div style={{ width:"100%", maxWidth:400 }}>
        <div style={{ textAlign:"center", marginBottom:40 }}>
          <div style={{ fontSize:44, fontWeight:700, color:C.text, fontFamily:FD }}>ZenSalon</div>
          <div style={{ fontSize:14, color:C.textMuted, marginTop:8 }}>{isConvite ? "Crie sua senha para acessar o sistema" : "Redefina sua senha"}</div>
        </div>
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:24, padding:36 }}>
          {done ? (
            <div style={{ textAlign:"center" }}>
              <div style={{ fontSize:48, marginBottom:16 }}>✅</div>
              <div style={{ color:C.sage, fontSize:15, marginBottom:24 }}>{isConvite ? "Senha criada! Agora faca o login." : "Senha alterada com sucesso!"}</div>
              <button onClick={() => window.location.href="/"} style={{ width:"100%", padding:"13px 0", background:`linear-gradient(135deg,${C.gold},#b8924a)`, border:"none", borderRadius:12, color:"#0f0f0f", fontWeight:700, fontSize:14, cursor:"pointer", fontFamily:FB }}>Ir para o Login</button>
            </div>
          ) : (
            <>
              <h2 style={{ fontFamily:FD, fontSize:22, color:C.text, marginBottom:24, textAlign:"center" }}>{isConvite ? "Criar senha" : "Nova senha"}</h2>
              {error && <div style={{ background:`${C.ruby}18`, border:`1px solid ${C.ruby}40`, borderRadius:10, padding:"12px 14px", color:C.ruby, fontSize:13, marginBottom:16 }}>{error}</div>}
              <div style={{ marginBottom:16 }}>
                <label style={{ fontSize:11, fontWeight:700, color:C.textMuted, display:"block", marginBottom:6, textTransform:"uppercase" as any, letterSpacing:"0.08em" }}>Nova senha</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Minimo 6 caracteres" style={inp} />
              </div>
              <div style={{ marginBottom:24 }}>
                <label style={{ fontSize:11, fontWeight:700, color:C.textMuted, display:"block", marginBottom:6, textTransform:"uppercase" as any, letterSpacing:"0.08em" }}>Confirmar senha</label>
                <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repita a senha" style={inp} />
              </div>
              <button onClick={submit} disabled={loading||!password||!confirm} style={{ width:"100%", padding:"13px 0", background:`linear-gradient(135deg,${C.gold},#b8924a)`, border:"none", borderRadius:12, color:"#0f0f0f", fontWeight:700, fontSize:14, cursor:loading?"default":"pointer", fontFamily:FB, opacity:loading?0.7:1 }}>
                {loading ? "Salvando..." : isConvite ? "Criar minha senha" : "Salvar nova senha"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}