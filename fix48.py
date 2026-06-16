content = open('frontend/src/ProfessionalScheduleModal.tsx', 'r', encoding='latin-1').read()
content = content.replace('color:"#e05c5c", fontSize:12, width:76', 'color:"#e05c5c", fontSize:12, width:90')
open('frontend/src/ProfessionalScheduleModal.tsx', 'w', encoding='latin-1').write(content)
print('OK - count:', content.count('width:90'))
