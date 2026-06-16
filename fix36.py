content = open('backend/src/modules/appointments/appointments.routes.ts', 'r', encoding='latin-1').read()
old = 'import { eq, and, isNull, gte, lte } from "drizzle-orm";'
new = 'import { eq, and, isNull, gte, lte, sql } from "drizzle-orm";'
content = content.replace(old, new, 1)
open('backend/src/modules/appointments/appointments.routes.ts', 'w', encoding='latin-1').write(content)
print('OK - sql:', content.count('sql }'))
