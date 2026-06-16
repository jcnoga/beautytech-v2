content = open('frontend/src/App.tsx', 'r', encoding='latin-1').read()
# Remove o botao duplicado que foi inserido no CRM
bad = '\n              <button onClick={() => setScheduleProf(p)} style={{ padding:"8px 12px", borderRadius:8, border:"1px solid rgba(201,169,110,0.4)", background:"rgba(201,169,110,0.1)", color:"#c9a96e", fontSize:12, cursor:"pointer", fontWeight:600, marginTop:12, width:"100%" }}>Servicos &amp; Agenda</button></div>'
good = '</div>'
content = content.replace(bad, good, 1)
open('frontend/src/App.tsx', 'w', encoding='latin-1').write(content)
print('OK - remaining buttons:', content.count('Servicos e Agenda') + content.count('Servicos &amp; Agenda'))
