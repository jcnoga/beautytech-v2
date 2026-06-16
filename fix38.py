# -*- coding: utf-8 -*-
content = open('frontend/src/BookingPage.tsx', 'r', encoding='latin-1').read()

old = '             {slots.length === 0\n                  ? <p style={{color:C.textMuted,fontSize:13}}>Nenhum hor\xe3rio dispon\xedvel nesta data.</p>\n                  : <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>\n                      {slots.map(s => (\n                        <div key={s} onClick={()=>setSelTime(s)}\n                          style={{\n                            padding:"10px 0",textAlign:"center",borderRadius:10,cursor:"pointer",\n                            border:`2px solid ${selTime===s?accent:C.border}`,\n                            background:selTime===s?`${accent}20`:C.card2,\n                            color:selTime===s?accent:C.text,\n                            fontWeight:selTime===s?700:400,fontSize:13,transition:"all .2s",\n                          }}\n                        >{s}</div>\n                      ))}\n                    </div>\n                }'

new = '''                {(() => {
                  const allSlots: string[] = [];
                  for (let h = 8; h < 18; h++) {
                    allSlots.push(String(h).padStart(2,"0")+":00");
                    allSlots.push(String(h).padStart(2,"0")+":30");
                  }
                  if (slots.length === 0) return <p style={{color:C.textMuted,fontSize:13,padding:"20px 0"}}>Nenhum horario disponivel nesta data.</p>;
                  return (
                    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
                      {allSlots.map(s => {
                        const ok = slots.includes(s);
                        const sel = selTime === s;
                        return (
                          <div key={s} onClick={() => ok && setSelTime(s)}
                            style={{padding:"10px 0",textAlign:"center",borderRadius:10,cursor:ok?"pointer":"not-allowed",border:`2px solid ${sel?accent:ok?"#22C55E40":"#EF444430"}`,background:sel?`${accent}20`:ok?"#22C55E10":"#EF444410",color:sel?accent:ok?"#22C55E":"#EF4444",fontWeight:sel?700:500,fontSize:13}}>
                            {s}
                            {!ok && <div style={{fontSize:9,marginTop:1}}>ocupado</div>}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}'''

if old in content:
    content = content.replace(old, new, 1)
    open('frontend/src/BookingPage.tsx', 'w', encoding='latin-1').write(content)
    print('OK')
else:
    print('nao encontrado - tentando fallback')
    idx = content.find('slots.length === 0')
    print('slots.length found at:', idx)
    if idx > 0:
        print('context:', repr(content[idx-5:idx+50]))
