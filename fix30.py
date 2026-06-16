content = open('frontend/src/App.tsx', 'r', encoding='latin-1').read()

# Adiciona estados para slots e profissionais filtrados
old = "  const handleServiceChange = (serviceId: string) => {"
new = """  const [availableProfs, setAvailableProfs] = useState<any[]>([]);
  const [slots, setSlots] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [loadingSlots, setLoadingSlots] = useState(false);

  const fetchAvailableProfs = async (serviceId: string, date: string) => {
    if (!serviceId || !date) return;
    const lsKey = Object.keys(localStorage).find(k => k.includes("auth-token"));
    const token = lsKey ? JSON.parse(localStorage.getItem(lsKey) || "{}")?.access_token : "";
    const r = await fetch(`https://beautytech-v2-production.up.railway.app/api/v1/professionals/available?serviceId=${serviceId}&date=${date}`, { headers: { Authorization: `Bearer ${token}` } });
    const d = await r.json();
    setAvailableProfs(d.data ?? []);
  };

  const fetchSlots = async (professionalId: string, serviceId: string, date: string) => {
    if (!professionalId || !date) return;
    setLoadingSlots(true);
    const lsKey = Object.keys(localStorage).find(k => k.includes("auth-token"));
    const token = lsKey ? JSON.parse(localStorage.getItem(lsKey) || "{}")?.access_token : "";
    const r = await fetch(`https://beautytech-v2-production.up.railway.app/api/v1/professionals/${professionalId}/slots?serviceId=${serviceId}&date=${date}`, { headers: { Authorization: `Bearer ${token}` } });
    const d = await r.json();
    setSlots(d.data ?? []);
    setLoadingSlots(false);
  };

  const handleServiceChange = (serviceId: string) => {"""
content = content.replace(old, new, 1)

# Atualiza handleServiceChange para buscar profissionais
old2 = """  const handleServiceChange = (serviceId: string) => {
      const svc = svcsList.find((s: any) => s.id === serviceId);
      setForm(p => ({
        ...p,"""
new2 = """  const handleServiceChange = (serviceId: string) => {
      const svc = svcsList.find((s: any) => s.id === serviceId);
      if (serviceId && selectedDate) fetchAvailableProfs(serviceId, selectedDate);
      setSlots([]);
      setForm(p => ({
        ...p,
        professionalId: "",
        scheduledAt: "","""
content = content.replace(old2, new2, 1)

# Substitui select de profissional para usar availableProfs quando servico selecionado
old3 = """          <div style={{ marginBottom:14, gridColumn:"1/-1" }}>
            <label style={lblStyle}>Profissional</label>
            <select value={form.professionalId} onChange={e => f("professionalId")(e.target.value)} style={selStyle}>
              <option value="">Selecione (opcional)...</option>
              {profsList.map((p: any) => (
                <option key={p.id} value={p.id}>{p.fullName}</option>
              ))}
            </select>
          </div>"""
new3 = """          <div style={{ marginBottom:14, gridColumn:"1/-1" }}>
            <label style={lblStyle}>Profissional</label>
            <select value={form.professionalId} onChange={e => { f("professionalId")(e.target.value); setSlots([]); setForm(p => ({...p, scheduledAt:""})); if (e.target.value && selectedDate) fetchSlots(e.target.value, form.serviceId, selectedDate); }} style={selStyle}>
              <option value="">Selecione (opcional)...</option>
              {(form.serviceId && availableProfs.length > 0 ? availableProfs : profsList).map((p: any) => (
                <option key={p.id} value={p.id}>{p.full_name ?? p.fullName}{p.duration_minutes ? ` (${p.duration_minutes}min)` : ""}</option>
              ))}
            </select>
            {form.serviceId && availableProfs.length === 0 && <div style={{ fontSize:11, color:"#e05c5c", marginTop:4 }}>Nenhum profissional habilitado para este servico nesta data.</div>}
          </div>"""
content = content.replace(old3, new3, 1)

# Substitui data/hora por seletor de data + slots
old4 = """          <Inp label="Data e Hora *" value={form.scheduledAt} onChange={f("scheduledAt")} type="datetime-local" autoComplete="off" />
          <Inp label="Duracao (min)" value={form.durationMinutes} onChange={f("durationMinutes")} type="number" placeholder="60" />"""
new4 = """          <div style={{ marginBottom:14 }}>
            <label style={lblStyle}>Data *</label>
            <input type="date" value={selectedDate} onChange={e => { setSelectedDate(e.target.value); setSlots([]); setForm(p=>({...p,scheduledAt:""})); if (form.serviceId) fetchAvailableProfs(form.serviceId, e.target.value); if (form.professionalId) fetchSlots(form.professionalId, form.serviceId, e.target.value); }} style={{...selStyle}} />
          </div>
          <div style={{ marginBottom:14 }}>
            <label style={lblStyle}>Horario *</label>
            {loadingSlots ? <div style={{ color:"#c9a96e", fontSize:12 }}>Buscando horarios...</div> : slots.length > 0 ? (
              <select value={form.scheduledAt} onChange={e => f("scheduledAt")(selectedDate && e.target.value ? `${selectedDate}T${e.target.value}` : "")} style={selStyle}>
                <option value="">Selecione o horario...</option>
                {slots.map(s => <option key={s} value={`${selectedDate}T${s}`}>{s}</option>)}
              </select>
            ) : (
              <input type="time" value={form.scheduledAt ? form.scheduledAt.split("T")[1]?.substring(0,5) : ""} onChange={e => f("scheduledAt")(selectedDate && e.target.value ? `${selectedDate}T${e.target.value}` : "")} style={selStyle} placeholder="HH:MM" />
            )}
          </div>
          <Inp label="Duracao (min)" value={form.durationMinutes} onChange={f("durationMinutes")} type="number" placeholder="60" />"""
content = content.replace(old4, new4, 1)

open('frontend/src/App.tsx', 'w', encoding='latin-1').write(content)
print('OK')
