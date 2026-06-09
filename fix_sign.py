content = open('C:/projetos/beautytech-v2/backend/src/modules/all-modules.ts', encoding='utf-8').read()

old = '''  fastify.delete("/consent-forms/:id", { preHandler: [authenticate] }, async (req: any, reply: any) => {'''

new = '''  fastify.post("/consent-forms/:id/sign", { preHandler: [authenticate] }, async (req: any, reply: any) => {
    const { tenantId } = req.tenantContext;
    const b = req.body as any;
    await db.execute(sql`UPDATE consent_forms SET is_signed=true, signed_at=NOW(), signed_by_name=${b.signedByName??null} WHERE id=${req.params.id} AND tenant_id=${tenantId}`);
    return reply.status(200).send({ success: true });
  });
  fastify.delete("/consent-forms/:id", { preHandler: [authenticate] }, async (req: any, reply: any) => {'''

if old in content:
    open('C:/projetos/beautytech-v2/backend/src/modules/all-modules.ts', 'w', encoding='utf-8').write(content.replace(old, new, 1))
    print('CORRIGIDO')
else:
    print('TRECHO NAO ENCONTRADO')
