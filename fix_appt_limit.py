content = open('C:/projetos/beautytech-v2/backend/src/modules/all-modules.ts', encoding='utf-8').read()

old = "  fastify.post(\"/appointments\", { preHandler: [authenticate] }, async (req: any, reply) => {\n    const { tenantId, userId } = req.tenantContext;\n  const { services: svcs, ...body } = req.body as any;"

new = "  fastify.post(\"/appointments\", { preHandler: [authenticate] }, async (req: any, reply) => {\n    const { tenantId, userId } = req.tenantContext;\n    const planAppt = await getPlanInfo(tenantId);\n    if (planAppt.isFree) {\n      const now = new Date();\n      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);\n      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);\n      const countData = await db.execute(sql`SELECT COUNT(*) as total FROM appointments WHERE tenant_id=${tenantId} AND scheduled_at >= ${firstDay.toISOString()} AND scheduled_at <= ${lastDay.toISOString()}`);\n      const countRows = (countData as any).rows ?? (Array.isArray(countData) ? countData : []);\n      const total = Number(countRows[0]?.total ?? countRows[0]?.count ?? 0);\n      if (total >= planAppt.maxAppointmentsMonth) return reply.status(403).send({ success: false, error: `Limite de ${planAppt.maxAppointmentsMonth} agendamentos/mes atingido no plano gratuito. Faca upgrade para continuar.` });\n    }\n  const { services: svcs, ...body } = req.body as any;"

if old in content:
    open('C:/projetos/beautytech-v2/backend/src/modules/all-modules.ts', 'w', encoding='utf-8').write(content.replace(old, new, 1))
    print('CORRIGIDO')
else:
    print('TRECHO NAO ENCONTRADO')
