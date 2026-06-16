content = open('frontend/src/PricingPage.tsx', 'r', encoding='latin-1').read()
old = "    supabase.auth.getSession().then(({ data: { session } }) => {\n      setToken(session?.access_token ?? null);\n    });"
new = "    const key = Object.keys(localStorage).find(k => k.includes('auth-token'));\n    if (key) {\n      try {\n        const parsed = JSON.parse(localStorage.getItem(key) || '{}');\n        setToken(parsed?.access_token ?? null);\n      } catch {}\n    }"
content = content.replace(old, new)
open('frontend/src/PricingPage.tsx', 'w', encoding='latin-1').write(content)
print('OK - token lines:', content.count('access_token'))
