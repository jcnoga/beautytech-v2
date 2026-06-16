content = open('backend/src/server.ts', 'r', encoding='latin-1').read()
old = "import { billingRoutes } from \"./modules/billing/billing.routes.js\";"
new = "import { billingRoutes } from \"./modules/billing/billing.routes.js\";\nimport { loadPlansFromDb } from \"./modules/billing/billing.service.js\";"
content = content.replace(old, new)
old2 = "  await server.listen({ port: env.PORT, host: env.HOST });"
new2 = "  await loadPlansFromDb();\n  await server.listen({ port: env.PORT, host: env.HOST });"
content = content.replace(old2, new2)
open('backend/src/server.ts', 'w', encoding='latin-1').write(content)
print('OK')
