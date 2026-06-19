path = r'C:\projetos\beautytech-v2\backend\src\modules\all-modules.ts'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

wh = '{"0":{"enabled":false,"start":null,"end":null},"1":{"enabled":true,"start":"08:00","end":"18:00","breakStart":"12:00","breakEnd":"13:30"},"2":{"enabled":true,"start":"08:00","end":"18:00","breakStart":"12:00","breakEnd":"13:30"},"3":{"enabled":true,"start":"08:00","end":"18:00","breakStart":"12:00","breakEnd":"13:30"},"4":{"enabled":true,"start":"08:00","end":"18:00","breakStart":"12:00","breakEnd":"13:30"},"5":{"enabled":true,"start":"08:00","end":"18:00","breakStart":"12:00","breakEnd":"13:30"},"6":{"enabled":true,"start":"08:00","end":"12:00","breakStart":null,"breakEnd":null}}'

old = '    const profData = isClinic ? ['
new = f'    const defaultWH = {wh};\n    const profData = isClinic ? ['

fixes = [
    ('specialization: "Esteticista", commissionPct: "50", monthlyGoal: "8000", isActive: true }', 'specialization: "Esteticista", commissionPct: "50", monthlyGoal: "8000", isActive: true, workingHours: defaultWH }'),
    ('specialization: "Auxiliar de Estetica", commissionPct: "45", monthlyGoal: "6000", isActive: true }', 'specialization: "Auxiliar de Estetica", commissionPct: "45", monthlyGoal: "6000", isActive: true, workingHours: defaultWH }'),
    ('specialization: "Barbeiro", commissionPct: "50", monthlyGoal: "5000", isActive: true }', 'specialization: "Barbeiro", commissionPct: "50", monthlyGoal: "5000", isActive: true, workingHours: defaultWH }'),
    ('specialization: "Barbeiro Senior", commissionPct: "45", monthlyGoal: "4000", isActive: true }', 'specialization: "Barbeiro Senior", commissionPct: "45", monthlyGoal: "4000", isActive: true, workingHours: defaultWH }'),
    ('specialization: "Cabeleireira", commissionPct: "50", monthlyGoal: "5000", isActive: true }', 'specialization: "Cabeleireira", commissionPct: "50", monthlyGoal: "5000", isActive: true, workingHours: defaultWH }'),
    ('specialization: "Manicure", commissionPct: "45", monthlyGoal: "4000", isActive: true }', 'specialization: "Manicure", commissionPct: "45", monthlyGoal: "4000", isActive: true, workingHours: defaultWH }'),
]

if old in content:
    content = content.replace(old, new)
    for o, n in fixes:
        content = content.replace(o, n)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("OK: seed corrigido")
else:
    print("ERRO: trecho nao encontrado")
