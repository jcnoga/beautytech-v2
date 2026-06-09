# -*- coding: utf-8 -*-
content = open('C:/projetos/beautytech-v2/backend/src/modules/all-modules.ts', encoding='utf-8').read()

old = '  fastify.post("/clients", { preHandler: [authenticate] }, async (req: any, reply) => {\n    const { tenantId, userId } = req.tenantContext;\n    const [client] = await db.insert(clients).values({ ...req.body, tenantId, createdBy: userId, updatedBy: userId }).returning();'

new = '  fastify.post("/clients", { preHandler: [authenticate] }, async (req: any, reply) => {\n    const { tenantId, userId } = req.tenantContext;\n    const plan = await getPlanInfo(tenantId);\n    if (plan.isFree) {\n      const countData = await db.execute(sql`SELECT COUNT(*) as total FROM clients WHERE tenant_id=${tenantId} AND deleted_at IS NULL`);\n      const countRows = (countData as any).rows ?? (Array.isArray(countData) ? countData : []);\n      const total = Number(countRows[0]?.total ?? countRows[0]?.count ?? 0);\n      if (total >= plan.maxClients) return reply.status(403).send({ success: false, error: `Limite de ${plan.maxClients} clientes atingido no plano gratuito. Faca upgrade para continuar.` });\n    }\n    const [client] = await db.insert(clients).values({ ...req.body, tenantId, createdBy: userId, updatedBy: userId }).returning();'

if old in content:
    open('C:/projetos/beautytech-v2/backend/src/modules/all-modules.ts', 'w', encoding='utf-8').write(content.replace(old, new, 1))
    print('CORRIGIDO')
else:
    print('TRECHO NAO ENCONTRADO')
