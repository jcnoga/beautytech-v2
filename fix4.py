content = open('frontend/src/PricingPage.tsx', 'r', encoding='latin-1').read()
old = "  const handleSubscribe = async (planId: string) => {\n    if (!token) { setMsg({ type: \"err\", text: \"Voce precisa estar logado para assinar.\" }); return; }"
new = "  const handleSubscribe = async (planId: string) => {\n    const lsKey = Object.keys(localStorage).find(k => k.includes('auth-token'));\n    const lsToken = lsKey ? JSON.parse(localStorage.getItem(lsKey) || '{}')?.access_token : null;\n    const activeToken = lsToken || token;\n    if (!activeToken) { setMsg({ type: \"err\", text: \"Voce precisa estar logado para assinar.\" }); return; }"
content = content.replace(old, new)

old2 = "      const res = await fetch(`${API}/billing/subscribe`, {\n        method: \"POST\",\n        headers: { \"Content-Type\": \"application/json\", Authorization: `Bearer ${token}` },"
new2 = "      const res = await fetch(`${API}/billing/subscribe`, {\n        method: \"POST\",\n        headers: { \"Content-Type\": \"application/json\", Authorization: `Bearer ${activeToken}` },"
content = content.replace(old2, new2)

old3 = "      const s = await fetch(`${API}/billing/status`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json());"
new3 = "      const s = await fetch(`${API}/billing/status`, { headers: { Authorization: `Bearer ${activeToken}` } }).then(r => r.json());"
content = content.replace(old3, new3)

open('frontend/src/PricingPage.tsx', 'w', encoding='latin-1').write(content)
print('OK')
