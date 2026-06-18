# -*- coding: utf-8 -*-
path = r"C:\projetos\beautytech-v2\backend\src\modules\all-modules.ts"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Adiciona endpoint super-admin/audit-logs antes do super-admin/stats
old = '  fastify.get("/super-admin/stats"'
new = '''  fastify.get("/super-admin/audit-logs", { preHandler: [requireSuperAdmin] }, async (_req: any, reply: any) => {
    const data = await db.select({
      id: auditLogs.id,
      tenantId: auditLogs.tenantId,
      tenantName: tenants.name,
      userId: auditLogs.userId,
      action: auditLogs.action,
      tableName: auditLogs.tableName,
      recordId: auditLogs.recordId,
      newData: auditLogs.newData,
      createdAt: auditLogs.createdAt,
    })
    .from(auditLogs)
    .leftJoin(tenants, eq(auditLogs.tenantId, tenants.id))
    .orderBy(desc(auditLogs.createdAt))
    .limit(200);
    return reply.send({ success: true, data });
  });

  fastify.get("/super-admin/stats"'''

content = content.replace(old, new)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("OK")
