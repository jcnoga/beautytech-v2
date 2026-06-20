import sys

path = r"C:\projetos\beautytech-v2\frontend\src\BookingPage.tsx"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

edits = []

# 1) Tipo Step
old = """type Step = "servico" | "profissional" | "data" | "dados" | "confirmado";"""
new = """type Step = "data" | "servico" | "profissional" | "horario" | "dados" | "confirmado";"""
edits.append(("tipo Step", old, new))

# 2) Estado inicial
old = """  const [step, setStep] = useState<Step>("servico");"""
new = """  const [step, setStep] = useState<Step>("data");"""
edits.append(("estado inicial", old, new))

# 3) Indicador de passos (topo da pagina)
old = """          {(["servico","profissional","data","dados"] as Step[]).map((s,i) => (
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
          ))}"""
new = """          {(["data","servico","profissional","horario","dados"] as Step[]).map((s,i) => (
            <div key={s} style={{display:"flex",alignItems:"center",gap:8}}>
              <div style={{
                width:28,height:28,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:12,fontWeight:700,
                background: step===s ? accent : ["data","servico","profissional","horario","dados"].indexOf(step) > i ? `${C.green}30` : C.card2,
                color: step===s ? "#fff" : ["data","servico","profissional","horario","dados"].indexOf(step) > i ? C.green : C.textMuted,
                border: `2px solid ${step===s ? accent : ["data","servico","profissional","horario","dados"].indexOf(step) > i ? C.green : C.border}`,
              }}>{i+1}</div>
              <span style={{fontSize:11,color:step===s?accent:C.textMuted,display:"none"}}>
                {["Data","Serviço","Profissional","Horário","Dados"][i]}
              </span>
              {i<4 && <div style={{width:24,height:1,background:C.border}} />}
            </div>
          ))}"""
edits.append(("indicador de passos", old, new))

# 4) Inserir novo STEP DATA antes do STEP SERVICO
old = """        {/* STEP 1: SERVICO */}
        {step === "servico" && (
          <div>
            <h2 style={{fontSize:20,fontWeight:800,marginBottom:6}}>Escolha o serviço</h2>"""
new = """        {/* STEP DATA (novo - primeiro passo) */}
        {step === "data" && (
          <div>
            <h2 style={{fontSize:20,fontWeight:800,marginBottom:6}}>Escolha a data</h2>
            <p style={{color:C.textMuted,fontSize:13,marginBottom:20}}>Quando você quer ser atendido?</p>
            <div style={{marginBottom:20}}>
              <label style={{fontSize:13,color:C.textMuted,fontWeight:600,display:"block",marginBottom:6}}>Data</label>
              <input type="date" min={today} value={selDate}
                onChange={e=>setSelDate(e.target.value)}
                style={{
                  width:"100%",background:C.card2,border:`1px solid ${C.border}`,
                  borderRadius:10,color:C.text,padding:"12px 14px",fontSize:14,
                  outline:"none",fontFamily:FB,
                }}
              />
            </div>
            <button onClick={() => { if (selDate) setStep("servico"); }} disabled={!selDate}
              style={{...btnStyle(!!selDate), width:"100%"}}>
              Continuar →
            </button>
          </div>
        )}

        {/* STEP 1: SERVICO */}
        {step === "servico" && (
          <div>
            <h2 style={{fontSize:20,fontWeight:800,marginBottom:6}}>Escolha o serviço</h2>"""
edits.append(("inserir step data", old, new))

# 5) Botao Voltar no final do STEP SERVICO
old = """              ))}
            </div>
          </div>
        )}

        {/* STEP 2: PROFISSIONAL */}"""
new = """              ))}
            </div>
            <button onClick={() => setStep("data")} style={{...btnStyle(true),background:"transparent",border:`1px solid ${C.border}`,color:C.textMuted,marginTop:16}}>
              ← Voltar
            </button>
          </div>
        )}

        {/* STEP 2: PROFISSIONAL */}"""
edits.append(("voltar no step servico", old, new))

# 6) Profissional agora avanca para "horario" em vez de "data"
old = """                <div key={p.id} onClick={() => { setSelPro(p); setStep("data"); }}"""
new = """                <div key={p.id} onClick={() => { setSelPro(p); setStep("horario"); }}"""
edits.append(("profissional avanca para horario", old, new))

# 7) Substituir o STEP combinado DATA+HORARIO pelo novo STEP so de HORARIO
old = """        {/* STEP 3: DATA E HORARIO */}
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
              <button onClick={() => { if (selTime) setStep("dados"); }} disabled={!selTime}
                style={{...btnStyle(!!selTime),flex:2}}>
                Continuar →
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: DADOS DO CLIENTE */}"""
new = """        {/* STEP HORARIO (novo) */}
        {step === "horario" && (
          <div>
            <h2 style={{fontSize:20,fontWeight:800,marginBottom:6}}>Escolha o horário</h2>
            <p style={{color:C.textMuted,fontSize:13,marginBottom:20}}>Horários disponíveis em {selDate}</p>
            <div>
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
            <div style={{display:"flex",gap:10,marginTop:20}}>
              <button onClick={() => setStep("profissional")} style={{...btnStyle(true),background:"transparent",border:`1px solid ${C.border}`,color:C.textMuted,flex:1}}>
                ← Voltar
              </button>
              <button onClick={() => { if (selTime) setStep("dados"); }} disabled={!selTime}
                style={{...btnStyle(!!selTime),flex:2}}>
                Continuar →
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: DADOS DO CLIENTE */}"""
edits.append(("substituir step data+horario por horario", old, new))

# 8) Botao Voltar do STEP DADOS agora aponta para "horario" em vez de "data"
old = """              <button onClick={() => setStep("data")} style={{...btnStyle(true),background:"transparent",border:`1px solid ${C.border}`,color:C.textMuted,flex:1}}>
                ← Voltar
              </button>
              <button
                onClick={handleAgendar}"""
new = """              <button onClick={() => setStep("horario")} style={{...btnStyle(true),background:"transparent",border:`1px solid ${C.border}`,color:C.textMuted,flex:1}}>
                ← Voltar
              </button>
              <button
                onClick={handleAgendar}"""
edits.append(("voltar do step dados aponta pra horario", old, new))

for nome, old, new in edits:
    if old not in content:
        sys.exit(f"ERRO: trecho nao encontrado -> {nome}")
    content = content.replace(old, new, 1)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("OK: BookingPage.tsx reordenado (8 edicoes aplicadas)")
