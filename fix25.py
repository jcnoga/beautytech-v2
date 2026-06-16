content = open('frontend/src/App.tsx', 'r', encoding='latin-1').read()
old = '              </div>\n            </div>'
new = '              </div>\n              <button onClick={() => setScheduleProf(p)} style={{ padding:"8px 12px", borderRadius:8, border:"1px solid rgba(201,169,110,0.4)", background:"rgba(201,169,110,0.1)", color:"#c9a96e", fontSize:12, cursor:"pointer", fontWeight:600, marginTop:12, width:"100%" }}>Servicos & Agenda</button>\n            </div>'
# Substitui apenas a primeira ocorrencia dentro do card de profissional
idx = content.find('<Badge label={p.acceptsOnlineBooking')
if idx > 0:
    end = content.find('</div>\n            </div>', idx)
    if end > 0:
        content = content[:end] + '\n              <button onClick={() => setScheduleProf(p)} style={{ padding:"8px 12px", borderRadius:8, border:"1px solid rgba(201,169,110,0.4)", background:"rgba(201,169,110,0.1)", color:"#c9a96e", fontSize:12, cursor:"pointer", fontWeight:600, marginTop:12, width:"100%" }}>Servicos &amp; Agenda</button>' + content[end:]
        print('OK - button added')
    else:
        print('end not found')
else:
    print('badge not found')
open('frontend/src/App.tsx', 'w', encoding='latin-1').write(content)
