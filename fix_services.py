content = open('frontend/src/App.tsx', encoding='utf-8').read()

old = '''function ServicesPage() {
  const [data, setData] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name:"", categoryId:"", durationMinutes:"60", price:"", isActive:true });
  const f = (k: string) => (v: any) => setForm(p => ({ ...p, [k]:v }));

  useEffect(() => {
    Promise.all([servicesApi.list(), servicesApi.categories()])
      .then(([s, c]: any) => { setData(s.data ?? []); setCategories(c.data ?? []); })
      .catch(console.error).finally(() => setLoading(false));
  }, []);'''

new = '''function ServicesPage() {
  const [data, setData] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showCatForm, setShowCatForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingCat, setSavingCat] = useState(false);
  const [activeTab, setActiveTab] = useState("services");
  const [form, setForm] = useState({ name:"", categoryId:"", durationMinutes:"60", price:"", isActive:true });
  const [catForm, setCatForm] = useState({ name:"", description:"" });
  const f = (k: string) => (v: any) => setForm(p => ({ ...p, [k]:v }));
  const fc = (k: string) => (v: any) => setCatForm(p => ({ ...p, [k]:v }));

  const load = () => {
    setLoading(true);
    Promise.all([servicesApi.list(), servicesApi.categories()])
      .then(([s, c]: any) => { setData(s.data ?? []); setCategories(c.data ?? []); })
      .catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);'''

if old in content:
    content = content.replace(old, new)
    print("PARTE 1 OK")
else:
    print("PARTE 1 NAO ENCONTRADA")

open('frontend/src/App.tsx', 'w', encoding='utf-8').write(content)
