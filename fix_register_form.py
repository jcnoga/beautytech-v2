content = open('C:/projetos/beautytech-v2/frontend/src/App.tsx', encoding='utf-8').read()

old = """  const [salonName, setSalonName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [businessType, setBusinessType] = useState("beauty_salon");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const submit = async () => {
    setLoading(true); setError(""); setSuccess("");
    try {
      const res = await fetch(`${import.meta.env["VITE_API_URL"]}/api/v1/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ salonName, ownerName, email, password, whatsapp, businessType, cpfCnpj: cpfCnpj.replace(/\\D/g,"") || undefined }),
      });"""

new = """  const [salonName, setSalonName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [businessType, setBusinessType] = useState("beauty_salon");
  const [addressStreet, setAddressStreet] = useState("");
  const [addressCity, setAddressCity] = useState("");
  const [addressState, setAddressState] = useState("");
  const [addressZip, setAddressZip] = useState("");
  const [hasWifi, setHasWifi] = useState(false);
  const [hasParking, setHasParking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const submit = async () => {
    setLoading(true); setError(""); setSuccess("");
    try {
      const res = await fetch(`${import.meta.env["VITE_API_URL"]}/api/v1/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ salonName, ownerName, email, password, whatsapp, businessType, cpfCnpj: cpfCnpj.replace(/\\D/g,"") || undefined, addressStreet: addressStreet || undefined, addressCity: addressCity || undefined, addressState: addressState || undefined, addressZip: addressZip || undefined, hasWifi, hasParking }),
      });"""

if old in content:
    content = content.replace(old, new, 1)
    print("OK - states adicionados")
else:
    print("NAO ENCONTRADO nos states")

old_form = """              <Inp label="CPF ou CNPJ" value={cpfCnpj} onChange={setCpfCnpj} placeholder="000.000.000-00 ou 00.000.000/0001-00" />
              {error && <div style={{ background:`${C.ruby}15`, border:`1px solid ${C.ruby}30`, borderRadius:10, padding:"10px 14px", color: C.ruby, fontSize:12, marginBottom:16 }}>{error}</div>}"""

new_form = """              <Inp label="CPF ou CNPJ" value={cpfCnpj} onChange={setCpfCnpj} placeholder="000.000.000-00 ou 00.000.000/0001-00" />
              <div style={{ fontSize:11, fontWeight:600, color:C.textMuted, textTransform:"uppercase", letterSpacing:".08em", margin:"16px 0 8px" }}>Endereco do Estabelecimento</div>
              <Inp label="Rua / Logradouro" value={addressStreet} onChange={setAddressStreet} placeholder="Rua das Flores, 123" />
              <Inp label="CEP" value={addressZip} onChange={setAddressZip} placeholder="38000-000" />
              <div style={{ display:"grid", gridTemplateColumns:"1fr 80px", gap:8 }}>
                <Inp label="Cidade" value={addressCity} onChange={setAddressCity} placeholder="Uberaba" />
                <Inp label="UF" value={addressState} onChange={v => setAddressState(v.toUpperCase().slice(0,2))} placeholder="MG" />
              </div>
              <div style={{ fontSize:11, fontWeight:600, color:C.textMuted, textTransform:"uppercase", letterSpacing:".08em", margin:"16px 0 8px" }}>Comodidades</div>
              <div style={{ display:"flex", gap:12, marginBottom:16 }}>
                <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", fontSize:13, color:C.textSec }}>
                  <input type="checkbox" checked={hasWifi} onChange={e => setHasWifi(e.target.checked)} style={{ accentColor:C.rose, width:16, height:16 }} />
                  Wi-Fi gratuito
                </label>
                <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", fontSize:13, color:C.textSec }}>
                  <input type="checkbox" checked={hasParking} onChange={e => setHasParking(e.target.checked)} style={{ accentColor:C.rose, width:16, height:16 }} />
                  Estacionamento
                </label>
              </div>
              {error && <div style={{ background:`${C.ruby}15`, border:`1px solid ${C.ruby}30`, borderRadius:10, padding:"10px 14px", color: C.ruby, fontSize:12, marginBottom:16 }}>{error}</div>}"""

if old_form in content:
    content = content.replace(old_form, new_form, 1)
    print("OK - formulario atualizado")
else:
    print("NAO ENCONTRADO no formulario")

open('C:/projetos/beautytech-v2/frontend/src/App.tsx', 'w', encoding='utf-8').write(content)
print("CONCLUIDO")
