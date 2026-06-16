content = open('frontend/src/ProfessionalScheduleModal.tsx', 'r', encoding='latin-1').read()

# Atualiza saveSchedule para incluir break
old = 'body: JSON.stringify({ days: schedule.map((d:any) => ({ dayOfWeek: d.day_of_week, isWorking: d.is_working, startTime: d.start_time, endTime: d.end_time, slotMinutes: d.slot_minutes??30 })) })'
new = 'body: JSON.stringify({ days: schedule.map((d:any) => ({ dayOfWeek: d.day_of_week, isWorking: d.is_working, startTime: d.start_time, endTime: d.end_time, slotMinutes: d.slot_minutes??30, breakStart: d.break_start??null, breakEnd: d.break_end??null })) })'
content = content.replace(old, new, 1)

# Atualiza replicar para incluir break
old2 = 'setSchedule(s => s.map((d:any) => d.day_of_week === 0 || d.day_of_week === 6 ? d : { ...d, is_working: src.is_working, start_time: src.start_time, end_time: src.end_time, slot_minutes: src.slot_minutes }));'
new2 = 'setSchedule(s => s.map((d:any) => d.day_of_week === 0 || d.day_of_week === 6 ? d : { ...d, is_working: src.is_working, start_time: src.start_time, end_time: src.end_time, slot_minutes: src.slot_minutes, break_start: src.break_start, break_end: src.break_end }));'
content = content.replace(old2, new2, 1)

# Adiciona campos de intervalo apos o campo Slot
old3 = '''                          <button onClick={()=>replicateSchedule(day.day_of_week)}
                            style={{ padding:"4px 10px", borderRadius:6, border:`1px solid ${C.gold}40`,
background:"transparent", color:C.gold, fontSize:11, cursor:"pointer", fontFamily:FB }}>
                            Replicar Seg-Sex
                          </button>'''
new3 = '''                          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                            <span style={{ fontSize:12, color:"#e05c5c" }}>Almoco</span>
                            <input type="time" value={day.break_start??""} placeholder="--:--"
                              onChange={e=>setSchedule(s=>s.map((d:any,i:number)=>i===idx?{...d,break_start:e.target.value||null}:d))}
                              style={{ padding:"4px 8px", borderRadius:6, border:"1px solid rgba(224,92,92,0.4)", background:"rgba(224,92,92,0.08)", color:"#e05c5c", fontFamily:FB, fontSize:12, width:80 }} />
                            <span style={{ fontSize:12, color:"#e05c5c" }}>-</span>
                            <input type="time" value={day.break_end??""} placeholder="--:--"
                              onChange={e=>setSchedule(s=>s.map((d:any,i:number)=>i===idx?{...d,break_end:e.target.value||null}:d))}
                              style={{ padding:"4px 8px", borderRadius:6, border:"1px solid rgba(224,92,92,0.4)", background:"rgba(224,92,92,0.08)", color:"#e05c5c", fontFamily:FB, fontSize:12, width:80 }} />
                          </div>
                          <button onClick={()=>replicateSchedule(day.day_of_week)}
                            style={{ padding:"4px 10px", borderRadius:6, border:`1px solid ${C.gold}40`,
background:"transparent", color:C.gold, fontSize:11, cursor:"pointer", fontFamily:FB }}>
                            Replicar Seg-Sex
                          </button>'''
content = content.replace(old3, new3, 1)

open('frontend/src/ProfessionalScheduleModal.tsx', 'w', encoding='latin-1').write(content)
print('OK - break fields:', content.count('break_start'))
