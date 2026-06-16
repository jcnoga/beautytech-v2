import { useEffect, useState } from "react";

const API = (import.meta as any).env?.VITE_API_URL ?? "";

const C = {
  bg: "#0B0F1A", card: "#141826", card2: "#1C2235",
  primary: "#C9847A", primaryDeep: "#A06050",
  text: "#E2E8F0", textMuted: "#94A3B8", border: "#2A3150",
  green: "#22C55E", error: "#EF4444",
};
const FB = "'Inter', sans-serif";

type Step = "servico" | "profissional" | "data" | "dados" | "confirmado";

interface Tenant { id:string; name:string; slug:string; logoUrl?:string; primaryColor?:string; phone?:string; addressCity?:string; addressState?:string; businessHours?:any; }
interface Service { id:string; name:string; durationMinutes:number; price:number; description?:string; }
interface Professional { id:string; fullName:string; displayName?:string; avatarUrl?:string; specialties?:string[]; color?:string; }
type Slot = string;

export default function BookingPage({ slug }: { slug: string }) {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [step, setStep] = useState<Step>("servico");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [selService, setSelService] = useState<Service | null>(null);
  const [selPro, setSelPro] = useState<Professional | null>(null);
  const [selDate, setSelDate] = useState("");
  const [selTime, setSelTime] = useState("");
  const [form, setForm] = useState({ name:"", email:"", phone:"", notes:"" });
  const [appointmentId, setAppointmentId] = useState("");

  const accent = tenant?.primaryColor || C.primary;

  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/v1/public/tenants/${slug}`).then(r=>r.json()),
      fetch(`${API}/api/v1/public/tenants/${slug}/services`).then(r=>r.json()),
      fetch(`${API}/api/v1/public/tenants/${slug}/professionals`).then(r=>r.json()),
    ]).then(([t, s, p]) => {
      if (t.success) setTenant(t.data);
      if (s.success) setServices(s.data);
      if (p.success) setProfessionals(p.data);
      setLoading(false);
    }).catch(() => { setError("Erro ao carregar dados."); setLoading(false); });
  }, [slug]);

  useEffect(() => {
    if (!selDate || !selPro || !selService) return;
    fetch(`${API}/api/v1/public/tenants/${slug}/availability?date=${selDate}&professionalId=${selPro.id}&serviceId=${selService.id}`)
      .then(r=>r.json()).then(d => { if (d.success) setSlots(d.data); });
  }, [selDate, selPro, selService]);

  const handleAgendar = async () => {
    setSubmitting(true); setError("");
    try {
      // 1. Registrar/buscar cliente
      const cr = await fetch(`${API}/api/v1/public/clients/register`, {
        method: "POST", headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ tenantSlug: slug, fullName: form.name, email: form.email, whatsapp: form.phone }),
      }).then(r=>r.json());
      if (!cr.success) throw new Error(cr.error || "Erro ao registrar cliente");
      const clientId = cr.data.id;

      // 2. Criar agendamento
      const ar = await fetch(`${API}/api/v1/public/appointments`, {
        method: "POST", headers: {"Content-Type":"application/json"},
        body: JSON.stringify({
          tenantSlug: slug, clientId,
          professionalId: selPro!.id, serviceId: selService!.id,
          date: selDate, time: selTime, clientNotes: form.notes,
        }),
      }).then(r=>r.json());
      if (!ar.success) throw new Error(ar.error || "Erro ao criar agendamento");
      setAppointmentId(ar.data.id);
      setStep("confirmado");
    } catch(e:any) { setError(e.message); }
    setSubmitting(false);
  };

  const today = new Date().toISOString().split("T")[0];

  const btnStyle = (active=true) => ({
    padding: "13px 28px", border: "none", borderRadius: 50, cursor: active?"pointer":"not-allowed",
    background: active ? `linear-gradient(135deg,${accent},${C.primaryDeep})` : C.border,
    color: "#fff", fontWeight: 700, fontSize: 14, fontFamily: FB,
    opacity: active ? 1 : 0.5, transition: "all .2s",
  });

  if (loading) return (
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{color:C.textMuted,fontFamily:FB}}>Carregando...</div>
    </div>
  );

  if (!tenant) return (
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{color:C.error,fontFamily:FB}}>Estabelecimento não encontrado.</div>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:FB,color:C.text}}>

      {/* HEADER */}
      <div style={{background:C.card,borderBottom:`1px solid ${C.border}`,padding:"16px 24px",display:"flex",alignItems:"center",gap:12}}>
        {tenant.logoUrl
          ? <img src={tenant.logoUrl} style={{height:36,borderRadius:8}} alt={tenant.name} />
          : <div style={{fontSize:20,fontWeight:800,color:accent}}>{tenant.name}</div>
        }
        <div style={{marginLeft:"auto",fontSize:12,color:C.textMuted}}>
          {tenant.addressCity && `${tenant.addressCity}/${tenant.addressState}`}
        </div>
      </div>

      {/* STEPS */}
      {step !== "confirmado" && (
        <div style={{display:"flex",justifyContent:"center",gap:8,padding:"20px 24px 0"}}>
          {(["servico","profissional","data","dados"] as Step[]).map((s,i) => (
            <div key={s} style={{display:"flex",alignItems:"center",gap:8}}>
              <div style={{
                width:28,height:28,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:12,fontWeight:700,
                background: step===s ? accent : ["servico","profissional","data","dados"].indexOf(step) > i ? `${C.green}30` : C.card2,
                color: step===s ? "#fff" : ["servico","profissional","data","dados"].indexOf(step) > i ? C.green : C.textMuted,
                border: `2px solid ${step===s ? accent : ["servico","profissional","data","dados"].indexOf(step) > i ? C.green : C.border}`,
              }}>{i+1}</div>
              <span style={{fontSize:11,color:step===s?accent:C.textMuted,display:"none"}}>
                {["Serviço","Profissional","Data","Dados"][i]}
              </span>
              {i<3 && <div style={{width:24,height:1,background:C.border}} />}
            </div>
          ))}
        </div>
      )}

      <div style={{maxWidth:560,margin:"0 auto",padding:"24px 16px"}}>

        {/* STEP 1: SERVICO */}
        {step === "servico" && (
          <div>
            <h2 style={{fontSize:20,fontWeight:800,marginBottom:6}}>Escolha o serviço</h2>
            <p style={{color:C.textMuted,fontSize:13,marginBottom:20}}>Selecione o serviço que deseja agendar</p>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {services.map(s => (
                <div key={s.id} onClick={() => { setSelService(s); setStep("profissional"); }}
                  style={{
                    background: C.card, border:`2px solid ${selService?.id===s.id ? accent : C.border}`,
                    borderRadius:12, padding:"16px 20px", cursor:"pointer", transition:"all .2s",
                    display:"flex", alignItems:"center", justifyContent:"space-between",
                  }}
                  onMouseOver={e=>(e.currentTarget.style.borderColor=accent)}
                  onMouseOut={e=>(e.currentTarget.style.borderColor=selService?.id===s.id?accent:C.border)}
                >
                  <div>
                    <div style={{fontWeight:700,fontSize:15}}>{s.name}</div>
                    <div style={{color:C.textMuted,fontSize:12,marginTop:3}}>{s.durationMinutes} min</div>
                  </div>
                  <div style={{fontWeight:800,color:accent,fontSize:15}}>
                    R$ {Number(s.price).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 2: PROFISSIONAL */}
        {step === "profissional" && (
          <div>
            <h2 style={{fontSize:20,fontWeight:800,marginBottom:6}}>Escolha o profissional</h2>
            <p style={{color:C.textMuted,fontSize:13,marginBottom:20}}>Com quem você prefere ser atendido?</p>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {professionals.map(p => (
                <div key={p.id} onClick={() => { setSelPro(p); setStep("data"); }}
                  style={{
                    background:C.card, border:`2px solid ${selPro?.id===p.id?accent:C.border}`,
                    borderRadius:12, padding:"16px 20px", cursor:"pointer", transition:"all .2s",
                    display:"flex", alignItems:"center", gap:14,
                  }}
                  onMouseOver={e=>(e.currentTarget.style.borderColor=accent)}
                  onMouseOut={e=>(e.currentTarget.style.borderColor=selPro?.id===p.id?accent:C.border)}
                >
                  <div style={{
                    width:44,height:44,borderRadius:"50%",background:`${accent}20`,
                    display:"flex",alignItems:"center",justifyContent:"center",
                    fontSize:18,flexShrink:0,overflow:"hidden",
                  }}>
                    {p.avatarUrl ? <img src={p.photoUrl} style={{width:"100%",height:"100%",objectFit:"cover"}} /> : "👩"}
                  </div>
                  <div>
                    <div style={{fontWeight:700,fontSize:15}}>{p.fullName}</div>
                    {p.specialties?.[0] && <div style={{color:C.textMuted,fontSize:12,marginTop:2}}>{p.specialties?.[0]}</div>}
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => setStep("servico")} style={{...btnStyle(true),background:"transparent",border:`1px solid ${C.border}`,color:C.textMuted,marginTop:16}}>
              ← Voltar
            </button>
          </div>
        )}

        {/* STEP 3: DATA E HORARIO */}
        {step === "data" && (
          <div>
            <h2 style={{fontSize:20,fontWeight:800,marginBottom:6}}>Escolha data e horário</h2>
            <p style={{color:C.textMuted,fontSize:13,marginBottom:20}}>Selecione quando você quer ser atendido</p>
            <div style={{marginBottom:20}}>
              <label style={{fontSize:13,color:C.textMuted,fontWeight:600,display:"block",marginBottom:6}}>Data</label>
              <input type="date" min={today} value={selDate}
                onChange={e=>{setSelDate(e.target.value);setSelTime("");}}
                style={{
                  width:"100%",background:C.card2,border:`1px solid ${C.border}`,
                  borderRadius:10,color:C.text,padding:"12px 14px",fontSize:14,
                  outline:"none",fontFamily:FB,
                }}
              />
            </div>
            {selDate && (
              <div>
                <label style={{fontSize:13,color:C.textMuted,fontWeight:600,display:"block",marginBottom:10}}>
                  Horários disponíveis
                </label>
                {(() => {
                  const allSlots = [];
                  for (let h = 8; h < 18; h++) {
                    allSlots.push(String(h).padStart(2,"0")+":00");
                    allSlots.push(String(h).padStart(2,"0")+":30");
                  }
                  if (slots.length === 0) return <p style={{color:C.textMuted,fontSize:13,padding:"20px 0"}}>Nenhum horario disponivel.</p>;
                  return (
                    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
                      {allSlots.map(s => {
                        const ok = slots.includes(s);
                        const sel = selTime === s;
                        return (
                          <div key={s} onClick={() => ok && setSelTime(s)}
                            style={{padding:"10px 0",textAlign:"center",borderRadius:10,cursor:ok?"pointer":"default",border:"2px solid "+(sel?accent:ok?"#22C55E40":"#EF444430"),background:sel?accent+"20":ok?"#22C55E10":"#EF444410",color:sel?accent:ok?"#22C55E":"#EF4444",fontWeight:sel?700:500,fontSize:13}}>
                            {s}
                            {!ok && <div style={{fontSize:9,marginTop:1}}>ocupado</div>}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}
            <div style={{display:"flex",gap:10,marginTop:20}}>
              <button onClick={() => setStep("profissional")} style={{...btnStyle(true),background:"transparent",border:`1px solid ${C.border}`,color:C.textMuted,flex:1}}>
                ← Voltar
              </button>
              <button onClick={() => setStep("dados")} disabled={!selTime}
                style={{...btnStyle(!!selTime),flex:2}}>
                Continuar →
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: DADOS DO CLIENTE */}
        {step === "dados" && (
          <div>
            <h2 style={{fontSize:20,fontWeight:800,marginBottom:6}}>Seus dados</h2>
            <p style={{color:C.textMuted,fontSize:13,marginBottom:20}}>Preencha para confirmar o agendamento</p>

            {/* RESUMO */}
            <div style={{background:C.card2,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 16px",marginBottom:20}}>
              <div style={{fontSize:12,color:C.textMuted,fontWeight:600,marginBottom:8}}>RESUMO</div>
              <div style={{fontSize:14,marginBottom:4}}><span style={{color:C.textMuted}}>Serviço:</span> <strong>{selService?.name}</strong></div>
              <div style={{fontSize:14,marginBottom:4}}><span style={{color:C.textMuted}}>Profissional:</span> <strong>{selPro?.displayName || selPro?.fullName}</strong></div>
              <div style={{fontSize:14,marginBottom:4}}><span style={{color:C.textMuted}}>Data:</span> <strong>{new Date(selDate+"T12:00:00").toLocaleDateString("pt-BR")}</strong></div>
              <div style={{fontSize:14,marginBottom:4}}><span style={{color:C.textMuted}}>Horário:</span> <strong>{selTime}</strong></div>
              <div style={{fontSize:14,color:accent,fontWeight:700,marginTop:6}}>R$ {Number(selService?.price).toFixed(2)}</div>
            </div>

            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              {[
                {id:"name",label:"Nome completo *",type:"text",ph:"Seu nome"},
                {id:"email",label:"E-mail *",type:"email",ph:"seu@email.com"},
                {id:"phone",label:"Telefone *",type:"tel",ph:"(00) 00000-0000"},
                {id:"notes",label:"Observações",type:"text",ph:"Alguma preferência ou observação?"},
              ].map(f => (
                <div key={f.id}>
                  <label style={{fontSize:12,color:C.textMuted,fontWeight:600,display:"block",marginBottom:4}}>{f.label}</label>
                  <input type={f.type} placeholder={f.ph}
                    value={(form as any)[f.id]}
                    onChange={e=>setForm(prev=>({...prev,[f.id]:e.target.value}))}
                    style={{
                      width:"100%",background:C.card2,border:`1px solid ${C.border}`,
                      borderRadius:10,color:C.text,padding:"12px 14px",fontSize:14,
                      outline:"none",fontFamily:FB,
                    }}
                    onFocus={e=>e.target.style.borderColor=accent}
                    onBlur={e=>e.target.style.borderColor=C.border}
                  />
                </div>
              ))}
            </div>

            {error && <div style={{background:`${C.error}15`,border:`1px solid ${C.error}40`,borderRadius:8,padding:"10px 14px",marginTop:14,fontSize:13,color:C.error}}>{error}</div>}

            <div style={{display:"flex",gap:10,marginTop:20}}>
              <button onClick={() => setStep("data")} style={{...btnStyle(true),background:"transparent",border:`1px solid ${C.border}`,color:C.textMuted,flex:1}}>
                ← Voltar
              </button>
              <button
                onClick={handleAgendar}
                disabled={submitting || !form.name || !form.email || !form.phone}
                style={{...btnStyle(!submitting && !!form.name && !!form.email && !!form.phone),flex:2}}
              >
                {submitting ? "Agendando..." : "Confirmar agendamento ✓"}
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: CONFIRMADO */}
        {step === "confirmado" && (
          <div style={{textAlign:"center",paddingTop:20}}>
            <div style={{
              width:80,height:80,borderRadius:"50%",
              background:`${C.green}20`,border:`2px solid ${C.green}50`,
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:36,margin:"0 auto 24px",
            }}>✓</div>
            <h2 style={{fontSize:24,fontWeight:800,color:C.green,marginBottom:10}}>
              Agendamento confirmado!
            </h2>
            <p style={{color:C.text,fontSize:14,marginBottom:6}}>
              Enviamos os detalhes para <strong>{form.email}</strong>
            </p>
            <div style={{
              background:C.card,border:`1px solid ${C.border}`,
              borderRadius:16,padding:"20px 24px",margin:"24px 0",textAlign:"left",
            }}>
              <div style={{fontSize:12,color:C.textMuted,fontWeight:600,marginBottom:12}}>DETALHES</div>
              <div style={{fontSize:14,marginBottom:6}}><span style={{color:C.textMuted}}>Serviço:</span> <strong>{selService?.name}</strong></div>
              <div style={{fontSize:14,marginBottom:6}}><span style={{color:C.textMuted}}>Profissional:</span> <strong>{selPro?.displayName || selPro?.fullName}</strong></div>
              <div style={{fontSize:14,marginBottom:6}}><span style={{color:C.textMuted}}>Data:</span> <strong>{new Date(selDate+"T12:00:00").toLocaleDateString("pt-BR")}</strong></div>
              <div style={{fontSize:14,marginBottom:6}}><span style={{color:C.textMuted}}>Horário:</span> <strong>{selTime}</strong></div>
              <div style={{fontSize:14,color:accent,fontWeight:700,marginTop:8}}>R$ {Number(selService?.price).toFixed(2)}</div>
            </div>
            <p style={{color:C.textMuted,fontSize:12,marginBottom:24}}>
              Você receberá um lembrete por e-mail 24h antes do horário.
            </p>
            <button onClick={() => window.location.reload()}
              style={{...btnStyle(true),width:"100%",justifyContent:"center"}}>
              Voltar ao início
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
