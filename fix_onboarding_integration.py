# -*- coding: utf-8 -*-
path = r"C:\projetos\beautytech-v2\frontend\src\App.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Adiciona import do OnboardingWizard
content = content.replace(
    "import BookingPage from './BookingPage';",
    "import BookingPage from './BookingPage';\nimport OnboardingWizard from './OnboardingWizard';"
)

# 2. Adiciona estado de onboarding no DashboardPage
old_dashboard = "function DashboardPage() {\n  const [kpis, setKpis] = useState<any>(null);\n  const [agenda, setAgenda] = useState<any[]>([]);\n  const [birthdays, setBirthdays] = useState<any[]>([]);\n  const [atRisk, setAtRisk] = useState<any[]>([]);\n  const [performance, setPerformance] = useState<any[]>([]);\n  const [loading, setLoading] = useState(true);"

new_dashboard = "function DashboardPage() {\n  const [kpis, setKpis] = useState<any>(null);\n  const [agenda, setAgenda] = useState<any[]>([]);\n  const [birthdays, setBirthdays] = useState<any[]>([]);\n  const [atRisk, setAtRisk] = useState<any[]>([]);\n  const [performance, setPerformance] = useState<any[]>([]);\n  const [loading, setLoading] = useState(true);\n  const [showOnboarding, setShowOnboarding] = useState(false);\n  const [tenantName, setTenantName] = useState('');"

content = content.replace(old_dashboard, new_dashboard)

# 3. Adiciona verificacao de onboarding apos carregar KPIs
old_load = "        setKpis(k.data);\n        setAgenda(a.data ?? []);\n        setBirthdays(b.data ?? []);\n        setAtRisk(r.data ?? []);\n        setPerformance(p.data ?? []);"

new_load = "        setKpis(k.data);\n        setAgenda(a.data ?? []);\n        setBirthdays(b.data ?? []);\n        setAtRisk(r.data ?? []);\n        setPerformance(p.data ?? []);\n        // Verifica se precisa de onboarding\n        if (k.data && (k.data.totalProfessionals === 0 || k.data.totalServices === 0)) {\n          try {\n            const me = await fetch((import.meta as any).env?.VITE_API_URL + '/api/v1/auth/me', { headers: { Authorization: 'Bearer ' + (() => { const k2 = Object.keys(localStorage).find(x => x.includes('auth-token') || x.includes('sb-')); return k2 ? JSON.parse(localStorage.getItem(k2)||'{}').access_token : ''; })() } }).then(r2 => r2.json());\n            setTenantName(me.data?.name ?? me.name ?? '');\n          } catch {}\n          setShowOnboarding(true);\n        }"

content = content.replace(old_load, new_load)

# 4. Adiciona renderizacao do wizard antes do return principal
old_if_loading = "  if (loading) return (\n    <div style={{ display:\"flex\", alignItems:\"center\", justifyContent:\"center\", height:400 }}>\n      <div style={{ color: C.textMuted, fontFamily: FB }}>Carregando...</div>\n    </div>\n  );\n\n  const k = kpis ?? MOCK_KPIS;"

new_if_loading = "  if (loading) return (\n    <div style={{ display:\"flex\", alignItems:\"center\", justifyContent:\"center\", height:400 }}>\n      <div style={{ color: C.textMuted, fontFamily: FB }}>Carregando...</div>\n    </div>\n  );\n\n  if (showOnboarding) return <OnboardingWizard tenantName={tenantName} onComplete={() => setShowOnboarding(false)} />;\n\n  const k = kpis ?? MOCK_KPIS;"

content = content.replace(old_if_loading, new_if_loading)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("OK")
