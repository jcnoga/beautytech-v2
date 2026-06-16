content = open('frontend/src/App.tsx', 'r', encoding='latin-1').read()
old = '                <Badge label={p.isActive ? "Ativo" : "Inativo"} color={p.isActive ? C.sage : C.textMuted} />\n                <Badge label={p.acceptsOnlineBooking ? "Agendamento Online" : "Presencial"} color={p.acceptsOnlineBooking ? C.sapphire : C.textMuted} />'
new = '                <Badge label={p.isActive ? "Ativo" : "Inativo"} color={p.isActive ? C.sage : C.textMuted} />\n                <Badge label={p.acceptsOnlineBooking ? "Agendamento Online" : "Presencial"} color={p.acceptsOnlineBooking ? C.sapphire : C.textMuted} />\n                <button onClick={() => setScheduleProf(p)} style={{ padding:"6px 12px", borderRadius:8, border:`1px solid ${C.gold}40`, background:`${C.gold}10`, color:C.gold, fontSize:11, cursor:"pointer", fontFamily:FB, fontWeight:600, marginTop:8, width:"100%" }}>? Servicos & Agenda</button>'
content = content.replace(old, new, 1)
open('frontend/src/App.tsx', 'w', encoding='latin-1').write(content)
print('OK')
