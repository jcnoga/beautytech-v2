content = open('frontend/src/PricingPage.tsx', 'r', encoding='latin-1').read()

old = "  useEffect(() => {\n    fetch(`${API}/billing/plans`)\n      .then(r => r.json())\n      .then(d => {\n        if (d.success && d.data) {\n          const p: any = {};\n          Object.entries(d.data).forEach(([tier, plan]: any) => {\n            if (tier === \"free\") return;\n            p[tier] = {\n              monthly:    plan.monthlyPrice,\n              semiannual: parseFloat((plan.monthlyPrice * 0.9).toFixed(2)),\n              annual:     parseFloat((plan.monthlyPrice * 0.8).toFixed(2)),\n            };\n          });\n          if (Object.keys(p).length > 0) setPlanPrices(p);\n        }\n      }).catch(() => {});\n  }, []);"
new = "  const [dynamicPlans, setDynamicPlans] = useState<any>(null);\n\n  useEffect(() => {\n    fetch(`${API}/billing/plans`)\n      .then(r => r.json())\n      .then(d => {\n        if (d.success && d.data) {\n          const p: any = {};\n          Object.entries(d.data).forEach(([tier, plan]: any) => {\n            if (tier === \"free\") return;\n            p[tier] = {\n              monthly:    plan.monthlyPrice,\n              semiannual: parseFloat((plan.monthlyPrice * 0.9).toFixed(2)),\n              annual:     parseFloat((plan.monthlyPrice * 0.8).toFixed(2)),\n              professionals: plan.professionals,\n            };\n          });\n          if (Object.keys(p).length > 0) { setPlanPrices(p); setDynamicPlans(d.data); }\n        }\n      }).catch(() => {});\n  }, []);"
content = content.replace(old, new, 1)

old2 = "                <div style={{ fontSize:13, color:plan.color, marginTop:8, fontWeight:600 }}>{plan.professionals}</div>"
new2 = "                <div style={{ fontSize:13, color:plan.color, marginTop:8, fontWeight:600 }}>{dynamicPlans?.[plan.id]?.professionals ? `Ate ${dynamicPlans[plan.id].professionals} profissional${dynamicPlans[plan.id].professionals > 1 ? \"is\" : \"\"}` : plan.professionals}</div>"
content = content.replace(old2, new2, 1)

open('frontend/src/PricingPage.tsx', 'w', encoding='latin-1').write(content)
print('OK')
