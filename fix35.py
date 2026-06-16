content = open('backend/src/modules/appointments/appointments.routes.ts', 'r', encoding='latin-1').read()
# Verifica se sql ja esta importado
print('sql import:', content.count('import.*sql') if 'import.*sql' in content else 0)
print('sql from drizzle:', 'sql } from "drizzle-orm"' in content or "sql," in content[:500])
print('first 300 chars:', content[:300])
