content = open('frontend/src/App.tsx', 'r', encoding='latin-1').read()
old = 'function ProfessionalsPage() {\n  const [data, setData] = useState<any[]>([]);'
new = 'function ProfessionalsPage() {\n  const [data, setData] = useState<any[]>([]);\n  const [scheduleProf, setScheduleProf] = useState<any>(null);'
content = content.replace(old, new, 1)
open('frontend/src/App.tsx', 'w', encoding='latin-1').write(content)
print('OK - count:', content.count('scheduleProf'))
