content = open('backend/src/modules/billing/billing.routes.ts', 'r', encoding='latin-1').read()
old = 'const ASAAS_URL = process.env.ASAAS_ENV === "production" ? "https://api.asaas.com/v3" : "https://sandbox.asaas.com/api/v3";'
new = 'const ASAAS_URL = "https://sandbox.asaas.com/api/v3";'
content = content.replace(old, new)
open('backend/src/modules/billing/billing.routes.ts', 'w', encoding='latin-1').write(content)
print('OK')
