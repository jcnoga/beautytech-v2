import { useState, useEffect } from "react";

const API = "https://beautytech-v2-production.up.railway.app/api/v1";
const DAYS = ["Dom","Seg","Ter","Qua","Qui","Sex","Sab"];

function ProfessionalScheduleModal({ professional, token, onClose }: any) {
  const C = {
    bg:"#0f0f0f", card:"#1a1a1a", border:"rgba(255,255,255,0.08)",
    gold:"#c9a96e", rose:"#e8a598", sage:"#7eb8a0",
    text:"#f0ece4", textMuted:"rgba(255,255,255,0.45)", ruby:"#e05c5c",
  };
  const FB = "'Outfit', sans-serif";
  const [tab, setTab] = useState<"services"|"schedule"|"blocks">("services");
  const [services, setServices] = useState<any[]>([]);
  const [allServices, setAllServices] = useState<any[]>([]);
  const [schedule, setSchedule] = useState<any[]>([]);
  const [blocks, setBlocks] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [newBlock, setNewBlock] = useState({ startsAt:"", endsAt:"", reason:"" });
  const h = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetch(`${API}/professionals/${professional.id}/services`, { headers: h }).then(r=>r.json()).then(d=>setServices(d.data??[]));
    fetch(`${API}/services`, { headers: h }).then(r=>r.json()).then(d=>setAllServices(d.data??[]));
    fetch(`${API}/professionals/${professional.id}/schedules`, { headers: h }).then(r=>r.json()).then(d=>setSchedule(d.data??[]));
    fetch(`${API}/professionals/${professional.id}/blocks`, { headers: h }).then(r=>r.json()).then(d=>setBlocks(d.data??[]));
  }, [professional.id]);

  const toggleService = async (svc: any, enabled: boolean) => {
    const existing = services.find((s:any) => s.service_id === svc.id);
    if (enabled) {
      await fetch(`${API}/professionals/${professional.id}/services`, {
        method:"POST", headers:{...h,"Content-Type":"application/json"},
        body: JSON.stringify({ serviceId: svc.id, commissionType: existing?.commission_type??"percent", commissionValue: existing?.commission_value??0, durationMinutes: existing?.duration_minutes??svc.duration_minutes??60, isEnabled: true })
      });
    } else {
      await fetch(`${API}/professionals/${professional.id}/services/${svc.id}`, { method:"DELETE", headers: h });
    }
    fetch(`${API}/professionals/${professional.id}/services`, { headers: h }).then(r=>r.json()).then(d=>setServices(d.data??[]));
  };

  const updateServiceConfig = async (serviceId: string, field: string, value: any) => {
    setServices(s => s.map((x:any) => x.service_id === serviceId ? {...x, [field]: value} : x));
  };

  const saveServiceConfig = async (ps: any) => {
    await fetch(`${API}/professionals/${professional.id}/services`, {
      method:"POST", headers:{...h,"Content-Type":"application/json"},
      body: JSON.stringify({ serviceId: ps.service_id, commissionType: ps.commission_type, commissionValue: Number(ps.commission_value), durationMinutes: Number(ps.duration_minutes), isEnabled: true })
    });
  };

  const saveSchedule = async () => {
    setSaving(true);
    await fetch(`${API}/professionals/${professional.id}/schedules`, {
      method:"POST", headers:{...h,"Content-Type":"application/json"},
      body: JSON.stringify({ days: schedule.map((d:any) => ({ dayOfWeek: d.day_of_week, isWorking: d.is_working, startTime: d.start_time, endTime: d.end_time, slotMinutes: d.slot_minutes??30, breakStart: d.break_start??null, breakEnd: d.break_end??null })) })
    });
    setSaving(false);
    alert("Jornada salva!");
  };

  const replicateSchedule = (fromDay: number) => {
    const src = schedule.find((d:any) => d.day_of_week === fromDay);
    if (!src) return;
    setSchedule(s => s.map((d:any) => d.day_of_week === 0 || d.day_of_week === 6 ? d : { ...d, is_working: src.is_working, start_time: src.start_time, end_time: src.end_time, slot_minutes: src.slot_minutes, break_start: src.break_start, break_end: src.break_end }));
  };

  const addBlock = async () => {
    if (!newBlock.startsAt || !newBlock.endsAt) return alert("Informe inicio e fim do bloqueio.");
    await fetch(`${API}/professionals/${professional.id}/blocks`, {
      method:"POST", headers:{...h,"Content-Type":"application/json"},
      body: JSON.stringify(newBlock)
    });
    setNewBlock({ startsAt:"", endsAt:"", reason:"" });
    fetch(`${API}/professionals/${professional.id}/blocks`, { headers: h }).then(r=>r.json()).then(d=>setBlocks(d.data??[]));
  };

  const removeBlock = async (blockId: string) => {
    await fetch(`${API}/professionals/${professional.id}/blocks/${blockId}`, { method:"DELETE", headers: h });
    setBlocks(b => b.filter((x:any) => x.id !== blockId));
  };

  const inp = (val: string, onChange: (v:string)=>void, type="text", placeholder="") => (
    <input type={type} value={val} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
      style={{ padding:"8px 12px", borderRadius:8, border:`1px solid ${C.border}`, background:C.bg, color:C.text, fontFamily:FB, fontSize:13, outline:"none", width:"100%" }} />
  );

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div style={{ background:C.card, borderRadius:20, width:"100%", maxWidth:700, maxHeight:"90vh", overflow:"auto", border:`1px solid ${C.border}` }}>
        <div style={{ padding:"24px 28px", borderBottom:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div style={{ fontSize:16, fontWeight:700, color:C.text, fontFamily:FB }}>{professional.fullName}</div>
            <div style={{ fontSize:12, color:C.textMuted }}>Gestao de servicos e agenda</div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", color:C.textMuted, fontSize:20, cursor:"pointer" }}>?</button>
        </div>

        {/* Tabs */}
        <div style={{ display:"flex", gap:4, padding:"0 28px", borderBottom:`1px solid ${C.border}`, background:C.card }}>
          {[["services","Servicos"],["schedule","Jornada"],["blocks","Bloqueios"]].map(([id,label]) => (
            <button key={id} onClick={()=>setTab(id as any)}
              style={{ padding:"12px 18px", background:"none", border:"none", borderBottom:`2px solid ${tab===id?C.gold:"transparent"}`, color:tab===id?C.gold:C.textMuted, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:FB }}>
              {label}
            </button>
          ))}
        </div>

        <div style={{ padding:28 }}>

          {/* ABA SERVICOS */}
          {tab === "services" && (
            <div>
              <div style={{ fontSize:13, color:C.textMuted, marginBottom:16 }}>Selecione os servicos que este profissional pode executar e configure comissao e duracao.</div>
              {allServices.map((svc:any) => {
                const ps = services.find((s:any) => s.service_id === svc.id);
                const enabled = !!ps;
                return (
                  <div key={svc.id} style={{ background:enabled?`${C.gold}08`:C.bg, border:`1px solid ${enabled?C.gold+"30":C.border}`, borderRadius:12, padding:16, marginBottom:12 }}>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom: enabled?12:0 }}>
                      <div>
                        <div style={{ fontSize:14, fontWeight:600, color:C.text }}>{svc.name}</div>
                        <div style={{ fontSize:11, color:C.textMuted }}>Preco padrao: R${Number(svc.price??0).toFixed(2)} · {svc.durationMinutes??60}min</div>
                      </div>
                      <button onClick={()=>toggleService(svc, !enabled)}
                        style={{ padding:"6px 14px", borderRadius:8, border:`1px solid ${enabled?C.ruby:C.sage}`, background:"transparent", color:enabled?C.ruby:C.sage, fontSize:12, cursor:"pointer", fontFamily:FB, fontWeight:600 }}>
                        {enabled ? "Remover" : "Habilitar"}
                      </button>
                    </div>
                    {enabled && ps && (
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
                        <div>
                          <div style={{ fontSize:11, color:C.textMuted, marginBottom:4 }}>Duracao (min)</div>
                          <input type="number" value={ps.duration_minutes} onChange={e=>updateServiceConfig(svc.id,"duration_minutes",e.target.value)}
                            onBlur={()=>saveServiceConfig(ps)}
                            style={{ padding:"6px 10px", borderRadius:8, border:`1px solid ${C.border}`, background:C.bg, color:C.text, fontFamily:FB, fontSize:13, width:"100%" }} />
                        </div>
                        <div>
                          <div style={{ fontSize:11, color:C.textMuted, marginBottom:4 }}>Comissao</div>
                          <input type="number" value={ps.commission_value} onChange={e=>updateServiceConfig(svc.id,"commission_value",e.target.value)}
                            onBlur={()=>saveServiceConfig(ps)}
                            style={{ padding:"6px 10px", borderRadius:8, border:`1px solid ${C.border}`, background:C.bg, color:C.text, fontFamily:FB, fontSize:13, width:"100%" }} />
                        </div>
                        <div>
                          <div style={{ fontSize:11, color:C.textMuted, marginBottom:4 }}>Tipo</div>
                          <select value={ps.commission_type} onChange={e=>{updateServiceConfig(svc.id,"commission_type",e.target.value); saveServiceConfig({...ps,commission_type:e.target.value});}}
                            style={{ padding:"6px 10px", borderRadius:8, border:`1px solid ${C.border}`, background:C.bg, color:C.text, fontFamily:FB, fontSize:13, width:"100%" }}>
                            <option value="percent">% Percentual</option>
                            <option value="fixed">R$ Fixo</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ABA JORNADA */}
          {tab === "schedule" && (
            <div>
              <div style={{ fontSize:13, color:C.textMuted, marginBottom:16 }}>Configure os dias e horarios de trabalho do profissional.</div>
              {schedule.map((day:any, idx:number) => (
                <div key={day.day_of_week} style={{ background:C.bg, border:`1px solid ${C.border}`, borderRadius:12, padding:16, marginBottom:10 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:16, flexWrap:"wrap" }}>
                    <div style={{ width:40, fontSize:13, fontWeight:700, color:day.is_working?C.gold:C.textMuted }}>{DAYS[day.day_of_week]}</div>
                    <button onClick={()=>setSchedule(s=>s.map((d:any,i:number)=>i===idx?{...d,is_working:!d.is_working}:d))}
                      style={{ padding:"4px 12px", borderRadius:6, border:`1px solid ${day.is_working?C.sage:C.border}`, background:day.is_working?`${C.sage}20`:"transparent", color:day.is_working?C.sage:C.textMuted, fontSize:12, cursor:"pointer", fontFamily:FB }}>
                      {day.is_working ? "Trabalhando" : "Folga"}
                    </button>
                    {day.is_working && (
                      <>
                        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                          <span style={{ fontSize:12, color:C.textMuted }}>De</span>
                          <input type="time" value={day.start_time} onChange={e=>setSchedule(s=>s.map((d:any,i:number)=>i===idx?{...d,start_time:e.target.value}:d))}
                            style={{ padding:"4px 8px", borderRadius:6, border:`1px solid ${C.border}`, background:C.bg, color:C.text, fontFamily:FB, fontSize:12 }} />
                          <span style={{ fontSize:12, color:C.textMuted }}>ate</span>
                          <input type="time" value={day.end_time} onChange={e=>setSchedule(s=>s.map((d:any,i:number)=>i===idx?{...d,end_time:e.target.value}:d))}
                            style={{ padding:"4px 8px", borderRadius:6, border:`1px solid ${C.border}`, background:C.bg, color:C.text, fontFamily:FB, fontSize:12 }} />
                        </div>
                        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                          <span style={{ fontSize:12, color:C.textMuted }}>Slot</span>
                          <select value={day.slot_minutes??30} onChange={e=>setSchedule(s=>s.map((d:any,i:number)=>i===idx?{...d,slot_minutes:Number(e.target.value)}:d))}
                            style={{ padding:"4px 8px", borderRadius:6, border:`1px solid ${C.border}`, background:C.bg, color:C.text, fontFamily:FB, fontSize:12 }}>
                            <option value={15}>15min</option>
                            <option value={30}>30min</option>
                            <option value={60}>60min</option>
                          </select>
                        </div>
                        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                        <span style={{ fontSize:12, color:"#e05c5c" }}>Almoco</span>
                        <input type="time" value={day.break_start??""} onChange={e=>setSchedule(s=>s.map((d,i)=>i===idx?{...d,break_start:e.target.value||null}:d))} style={{ padding:"4px 8px", borderRadius:6, border:"1px solid rgba(224,92,92,0.4)", background:"rgba(224,92,92,0.08)", color:"#e05c5c", fontSize:12, width:90 }} />
                        <span style={{ fontSize:11, color:"#e05c5c" }}>-</span>
                        <input type="time" value={day.break_end??""} onChange={e=>setSchedule(s=>s.map((d,i)=>i===idx?{...d,break_end:e.target.value||null}:d))} style={{ padding:"4px 8px", borderRadius:6, border:"1px solid rgba(224,92,92,0.4)", background:"rgba(224,92,92,0.08)", color:"#e05c5c", fontSize:12, width:90 }} />
                      </div>
                        <button onClick={()=>replicateSchedule(day.day_of_week)}
                          style={{ padding:"4px 10px", borderRadius:6, border:`1px solid ${C.gold}40`, background:"transparent", color:C.gold, fontSize:11, cursor:"pointer", fontFamily:FB }}>
                          Replicar Seg-Sex
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
              <button onClick={saveSchedule} disabled={saving}
                style={{ width:"100%", padding:"12px", borderRadius:10, background:C.gold, border:"none", color:"#0a0a0a", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:FB, marginTop:8 }}>
                {saving ? "Salvando..." : "Salvar Jornada"}
              </button>
            </div>
          )}

          {/* ABA BLOQUEIOS */}
          {tab === "blocks" && (
            <div>
              <div style={{ fontSize:13, color:C.textMuted, marginBottom:16 }}>Bloqueie horarios especificos para ferias, folgas ou compromissos.</div>
              <div style={{ background:C.bg, border:`1px solid ${C.border}`, borderRadius:12, padding:16, marginBottom:20 }}>
                <div style={{ fontSize:13, fontWeight:600, color:C.text, marginBottom:12 }}>Novo bloqueio</div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
                  <div>
                    <div style={{ fontSize:11, color:C.textMuted, marginBottom:4 }}>Inicio</div>
                    {inp(newBlock.startsAt, v=>setNewBlock(b=>({...b,startsAt:v})), "datetime-local")}
                  </div>
                  <div>
                    <div style={{ fontSize:11, color:C.textMuted, marginBottom:4 }}>Fim</div>
                    {inp(newBlock.endsAt, v=>setNewBlock(b=>({...b,endsAt:v})), "datetime-local")}
                  </div>
                </div>
                <div style={{ marginBottom:10 }}>
                  <div style={{ fontSize:11, color:C.textMuted, marginBottom:4 }}>Motivo (opcional)</div>
                  {inp(newBlock.reason, v=>setNewBlock(b=>({...b,reason:v})), "text", "Ex: Ferias, consulta medica...")}
                </div>
                <button onClick={addBlock}
                  style={{ width:"100%", padding:"10px", borderRadius:8, background:C.ruby, border:"none", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:FB }}>
                  Adicionar Bloqueio
                </button>
              </div>
              {blocks.length === 0 && <div style={{ textAlign:"center", color:C.textMuted, fontSize:13, padding:20 }}>Nenhum bloqueio ativo.</div>}
              {blocks.map((b:any) => (
                <div key={b.id} style={{ background:C.bg, border:`1px solid ${C.ruby}30`, borderRadius:10, padding:"12px 16px", marginBottom:10, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:600, color:C.text }}>{new Date(b.starts_at).toLocaleString("pt-BR")}  {new Date(b.ends_at).toLocaleString("pt-BR")}</div>
                    {b.reason && <div style={{ fontSize:12, color:C.textMuted }}>{b.reason}</div>}
                  </div>
                  <button onClick={()=>removeBlock(b.id)}
                    style={{ padding:"6px 12px", borderRadius:8, border:`1px solid ${C.ruby}40`, background:"transparent", color:C.ruby, fontSize:12, cursor:"pointer", fontFamily:FB }}>
                    Remover
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProfessionalScheduleModal;
