content = open('frontend/src/PricingPage.tsx', 'r', encoding='latin-1').read()

old = '  const [token, setToken] = useState<string | null>(null);'
new = '''  const [token, setToken] = useState<string | null>(null);
  const [planPrices, setPlanPrices] = useState<any>({
    basic: { monthly: 39.90, semiannual: 35.91, annual: 31.92 },
    pro:   { monthly: 59.90, semiannual: 53.91, annual: 47.92 },
    super: { monthly: 99.90, semiannual: 89.91, annual: 79.92 },
  });'''
content = content.replace(old, new, 1)

old2 = '  useEffect(() => {\n    const key = Object.keys(localStorage).find(k => k.includes'
new2 = '''  useEffect(() => {
    fetch(`${API}/billing/plans`)
      .then(r => r.json())
      .then(d => {
        if (d.success && d.data) {
          const p: any = {};
          Object.entries(d.data).forEach(([tier, plan]: any) => {
            if (tier === "free") return;
            p[tier] = {
              monthly:    plan.monthlyPrice,
              semiannual: parseFloat((plan.monthlyPrice * 0.9).toFixed(2)),
              annual:     parseFloat((plan.monthlyPrice * 0.8).toFixed(2)),
            };
          });
          if (Object.keys(p).length > 0) setPlanPrices(p);
        }
      }).catch(() => {});
  }, []);

  useEffect(() => {
    const key = Object.keys(localStorage).find(k => k.includes'''
content = content.replace(old2, new2, 1)

old3 = 'const price = (monthly: number) => monthly === 0 ? 0 : monthly * (1 - disc / 100);'
new3 = '''const price = (planId: string, monthly: number) => {
    if (monthly === 0) return 0;
    if (planPrices[planId]) {
      const p = planPrices[planId];
      if (period === "semiannual") return p.semiannual;
      if (period === "annual") return p.annual;
      return p.monthly;
    }
    return monthly * (1 - disc / 100);
  };'''
content = content.replace(old3, new3, 1)

old4 = "price(plan.monthly).toFixed(2).replace(\".\",\",\")"
new4 = "price(plan.id, plan.monthly).toFixed(2).replace(\".\",\",\")"
content = content.replace(old4, new4)

old5 = "const totalPrice = (monthly: number) => price(monthly) * months;"
new5 = "const totalPrice = (planId: string, monthly: number) => price(planId, monthly) * months;"
content = content.replace(old5, new5, 1)

old6 = "totalPrice(plan.monthly).toFixed(2).replace(\".\",\",\")"
new6 = "totalPrice(plan.id, plan.monthly).toFixed(2).replace(\".\",\",\")"
content = content.replace(old6, new6)

open('frontend/src/PricingPage.tsx', 'w', encoding='latin-1').write(content)
print('OK')
