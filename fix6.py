content = open('frontend/src/PricingPage.tsx', 'r', encoding='latin-1').read()
old = 'const API = (import.meta as any).env?.VITE_API_URL ||\n"https://beautytech-v2-production.up.railway.app/api/v1";'
new = 'const API = "https://beautytech-v2-production.up.railway.app/api/v1";'
content = content.replace(old, new)
open('frontend/src/PricingPage.tsx', 'w', encoding='latin-1').write(content)
print('OK - API lines:', content.count('railway.app/api/v1'))
