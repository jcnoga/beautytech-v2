content = open('frontend/src/App.tsx', 'r', encoding='latin-1').read()

# Adiciona import
old = "import PricingPage from './PricingPage';"
new = "import PricingPage from './PricingPage';\nimport ProfessionalScheduleModal from './ProfessionalScheduleModal';"
content = content.replace(old, new, 1)

# Adiciona estado e botao na ProfessionalsPage
old2 = "function ProfessionalsPage() {\n    const [data, setData] = useState<any[]>([]);"
new2 = "function ProfessionalsPage() {\n    const [data, setData] = useState<any[]>([]);\n    const [scheduleProf, setScheduleProf] = useState<any>(null);"
content = content.replace(old2, new2, 1)

# Adiciona botao na coluna de acoes
old3 = "<PageHeader title=\"Profissionais\" sub={`${data.length} profissionais ativos`} action={<Btn onClick={() => setShowForm(true)}>+ Nova Profissional</Btn>} />"
new3 = "<PageHeader title=\"Profissionais\" sub={`${data.length} profissionais ativos`} action={<Btn onClick={() => setShowForm(true)}>+ Nova Profissional</Btn>} />\n        {scheduleProf && <ProfessionalScheduleModal professional={scheduleProf} token={(() => { const k = Object.keys(localStorage).find(k=>k.includes('auth-token')); return k ? JSON.parse(localStorage.getItem(k)||'{}')?.access_token : ''; })()} onClose={() => setScheduleProf(null)} />}"
content = content.replace(old3, new3, 1)

open('frontend/src/App.tsx', 'w', encoding='latin-1').write(content)
print('OK')
