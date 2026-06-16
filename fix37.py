content = open('frontend/src/BookingPage.tsx', 'r', encoding='latin-1').read()

old = '''        {/* STEP 3: DATA E HORARIO */}
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
             {slots.length === 0
                  ? <p style={{color:C.textMuted,fontSize:13}}>Nenhum horário disponível nesta data.</p>
                  : <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
                      {slots.map(s => (
                        <div key={s} onClick={()=>setSelTime(s)}
                          style={{
                            padding:"10px 0",textAlign:"center",borderRadius:10,cursor:"pointer",
                            border:`2px solid ${selTime===s?accent:C.border}`,
                            background:selTime===s?`${accent}20`:C.card2,
                            color:selTime===s?accent:C.text,
                            fontWeight:selTime===s?700:400,fontSize:13,transition:"all .2s",
                          }}
                        >{s}</div>
                      ))}
                    </div>
                }
              </div>
            )}
            <div style={{display:"flex",gap:10,marginTop:20}}>
              <button onClick={() => setStep("profissional")} style={{...btnStyle(true),background:"transparent",border:`1px solid ${C.border}`,color:C.textMuted,flex:1}}>
                � Voltar
              </button>
              <button onClick={() => setStep("dados")} disabled={!selTime}
                style={{...btnStyle(!!selTime),flex:2}}>
                Continuar �'
              </button>
            </div>
          </div>
        )}'''

new = '''        {/* STEP 3: DATA E HORARIO */}
        {step === "data" && (
          <div>
            <h2 style={{fontSize:20,fontWeight:800,marginBottom:6}}>Escolha data e horario</h2>
            <p style={{color:C.textMuted,fontSize:13,marginBottom:20}}>Selecione quando voce quer ser atendido</p>
            <div style={{marginBottom:20}}>
              <label style={{fontSize:13,color:C.textMuted,fontWeight:600,display:"block",marginBottom:6}}>Data</label>
              <input type="date" min={today} value={selDate}
                onChange={e=>{setSelDate(e.target.value);setSelTime("");}}
                style={{width:"100%",background:C.card2,border:`1px solid ${C.border}`,borderRadius:10,color:C.text,padding:"12px 14px",fontSize:14,outline:"none",fontFamily:FB}}
              />
            </div>
            {selDate && (
              <div>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
                  <label style={{fontSize:13,color:C.textMuted,fontWeight:600}}>Horarios do dia</label>
                  <div style={{display:"flex",gap:12,fontSize:11}}>
                    <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:10,height:10,borderRadius:3,background:"#22C55E",display:"inline-block"}}></span>Disponivel</span>
                    <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:10,height:10,borderRadius:3,background:"#EF4444",display:"inline-block"}}></span>Ocupado</span>
                  </div>
                </div>
                {(() => {
                  const allSlots: string[] = [];
                  for (let h = 8; h < 18; h++) {
                    allSlots.push(`${String(h).padStart(2,"0")}:00`);
                    allSlots.push(`${String(h).padStart(2,"0")}:30`);
                  }
                  if (slots.length === 0 && selDate) return <p style={{color:C.textMuted,fontSize:13,textAlign:"center",padding:"20px 0"}}>Nenhum horario disponivel nesta data.</p>;
                  return (
                    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
                      {allSlots.map(s => {
                        const isAvailable = slots.includes(s);
                        const isSelected = selTime === s;
                        return (
                          <div key={s} onClick={() => isAvailable && setSelTime(s)}
                            style={{
                              padding:"10px 0",textAlign:"center",borderRadius:10,
                              cursor:isAvailable?"pointer":"not-allowed",
                              border:`2px solid ${isSelected?accent:isAvailable?"#22C55E40":"#EF444430"}`,
                              background:isSelected?`${accent}20`:isAvailable?"#22C55E10":"#EF444410",
                              color:isSelected?accent:isAvailable?"#22C55E":"#EF4444",
                              fontWeight:isSelected?700:500,fontSize:13,transition:"all .2s",
                              opacity:isAvailable?1:0.6,
                            }}
                          >
                            {s}
                            {!isAvailable && <div style={{fontSize:9,color:"#EF4444",marginTop:1}}>ocupado</div>}
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
                Voltar
              </button>
              <button onClick={() => setStep("dados")} disabled={!selTime} style={{...btnStyle(!!selTime),flex:2}}>
                Continuar
              </button>
            </div>
          </div>
        )}'''

result = content.replace(old, new, 1)
if result == content:
    print('ERRO: texto nao encontrado')
else:
    open('frontend/src/BookingPage.tsx', 'w', encoding='latin-1').write(result)
    print('OK')
