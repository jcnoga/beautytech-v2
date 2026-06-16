# -*- coding: utf-8 -*-
content = open('frontend/src/BookingPage.tsx', 'r', encoding='latin-1').read()

idx_start = content.find('             {slots.length === 0')
idx_end = content.find('                }', idx_start) + 17

print('start:', idx_start, 'end:', idx_end)
print('replacing:', repr(content[idx_start:idx_end][:100]))

new = '''                {(() => {
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
                })()}'''

result = content[:idx_start] + new + content[idx_end:]
open('frontend/src/BookingPage.tsx', 'w', encoding='latin-1').write(result)
print('OK - size:', len(result))
