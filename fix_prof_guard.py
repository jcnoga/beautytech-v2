path = r'C:\projetos\beautytech-v2\backend\src\modules\all-modules.ts'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old_prof = '  fastify.post("/professionals", { preHandler: [authenticate, requireManager] }, async (req: any, reply) => {\n    const { tenantId, userId } = req.tenantContext;'
new_prof = '  fastify.post("/professionals", { preHandler: [authenticate, requireManager] }, async (req: any, reply) => {\n    const { tenantId, userId } = req.tenantContext;\n    const chkP = await checkProfessionalLimit(tenantId);\n    if (!chkP.allowed) return reply.status(403).send({ success: false, error: `Limite do plano: ${chkP.current}/${chkP.limit} profissionais. Faca upgrade.`, code: "PLAN_LIMIT_PROFESSIONALS" });'

if old_prof in content:
    content = content.replace(old_prof, new_prof)
    print('OK - guard profissionais inserido')
else:
    print('ATENCAO - nao encontrado')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
