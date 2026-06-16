content = open('backend/src/server.ts', 'r', encoding='latin-1').read()
old = 'import { billingRoutes } from "./modules/billing/billing.routes.js";'
new = 'import { billingRoutes } from "./modules/billing/billing.routes.js";\nimport { professionalScheduleRoutes } from "./modules/professionals/professional-schedule.routes.js";'
content = content.replace(old, new, 1)
old2 = '  await server.register(billingRoutes,            { prefix });'
new2 = '  await server.register(billingRoutes,            { prefix });\n  await server.register(professionalScheduleRoutes, { prefix });'
content = content.replace(old2, new2, 1)
open('backend/src/server.ts', 'w', encoding='latin-1').write(content)
print('OK')
