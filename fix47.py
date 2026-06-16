content = open('frontend/src/ProfessionalScheduleModal.tsx', 'r', encoding='latin-1').read()
idx = content.find('<button onClick={()=>replicateSchedule(day.day_of_week)}')
print('found at:', idx)
insert = '''<div style={{ display:"flex", alignItems:"center", gap:6 }}>
                        <span style={{ fontSize:12, color:"#e05c5c" }}>Almoco</span>
                        <input type="time" value={day.break_start??""} onChange={e=>setSchedule(s=>s.map((d,i)=>i===idx?{...d,break_start:e.target.value||null}:d))} style={{ padding:"4px 8px", borderRadius:6, border:"1px solid rgba(224,92,92,0.4)", background:"rgba(224,92,92,0.08)", color:"#e05c5c", fontSize:12, width:76 }} />
                        <span style={{ fontSize:11, color:"#e05c5c" }}>-</span>
                        <input type="time" value={day.break_end??""} onChange={e=>setSchedule(s=>s.map((d,i)=>i===idx?{...d,break_end:e.target.value||null}:d))} style={{ padding:"4px 8px", borderRadius:6, border:"1px solid rgba(224,92,92,0.4)", background:"rgba(224,92,92,0.08)", color:"#e05c5c", fontSize:12, width:76 }} />
                      </div>
                        '''
result = content[:idx] + insert + content[idx:]
open('frontend/src/ProfessionalScheduleModal.tsx', 'w', encoding='latin-1').write(result)
print('OK - almoco:', result.count('Almoco'))
