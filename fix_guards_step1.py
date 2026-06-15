path = r'C:\projetos\beautytech-v2\backend\src\modules\all-modules.ts'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

import_line = 'import { PLAN_LIMITS } from "../config/plan-limits.js";'
if import_line not in content:
    content = content.replace(
        'export async function packagesModule',
        import_line + '\n\nexport async function packagesModule'
    )

helpers = '''
async function checkProfessionalLimit(tenantId: string) {
  const [t] = await db.select({ plan: tenants.planTier, max: tenants.maxProfessionals }).from(tenants).where(eq(tenants.id, tenantId));
  const limit = t?.max ?? PLAN_LIMITS[t?.plan ?? "free"]?.professionals ?? 1;
  const [{ count }] = await db.select({ count: sql`count(*)` }).from(professionals).where(and(eq(professionals.tenantId, tenantId), eq(professionals.isActive, true)));
  return { allowed: Number(count) < limit, limit, current: Number(count) };
}

async function checkClientLimit(tenantId: string) {
  const [t] = await db.select({ plan: tenants.planTier, max: tenants.maxClients }).from(tenants).where(eq(tenants.id, tenantId));
  const limit = t?.max ?? PLAN_LIMITS[t?.plan ?? "free"]?.clients ?? 100;
  const [{ count }] = await db.select({ count: sql`count(*)` }).from(clients).where(and(eq(clients.tenantId, tenantId), isNull(clients.deletedAt)));
  return { allowed: Number(count) < limit, limit, current: Number(count) };
}

'''

if 'checkProfessionalLimit' not in content:
    content = content.replace(
        import_line + '\n\nexport async function packagesModule',
        import_line + helpers + 'export async function packagesModule'
    )

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print('OK - imports e helpers inseridos')
