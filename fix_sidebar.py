content = open('C:/projetos/beautytech-v2/frontend/src/App.tsx', encoding='utf-8').read()

old = "function Sidebar({ page, setPage, user, tenantInfo, onLogout }: any) {\n  const themeId = useTheme();\n  const [showThemes, setShowThemes] = useState(false);\n  return ("

new = """function Sidebar({ page, setPage, user, tenantInfo, onLogout }: any) {
  const themeId = useTheme();
  const [showThemes, setShowThemes] = useState(false);
  const [planInfo, setPlanInfo] = useState<any>(null);
  useEffect(() => {
    api.get<any>("/plan-info").then((r: any) => setPlanInfo(r.data)).catch(() => {});
  }, []);
  const isFree = planInfo?.effectivePlan === "basic";
  return ("""

if old in content:
    open('C:/projetos/beautytech-v2/frontend/src/App.tsx', 'w', encoding='utf-8').write(content.replace(old, new, 1))
    print('CORRIGIDO')
else:
    print('TRECHO NAO ENCONTRADO')
