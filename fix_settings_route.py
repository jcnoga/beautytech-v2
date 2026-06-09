content = open('C:/projetos/beautytech-v2/backend/src/modules/all-modules.ts', encoding='utf-8').read()

old = "  fastify.get(\"/auth/me\","
new = """  fastify.patch("/auth/me/settings", { preHandler: [authenticate] }, async (req: any, reply: any) => {
    const { tenantId } = req.tenantContext;
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId));
    const newSettings = { ...(tenant.settings ?? {}), ...(req.body as any) };
    const [updated] = await db.update(tenants).set({ settings: newSettings, updatedAt: new Date() }).where(eq(tenants.id, tenantId)).returning();
    return reply.send({ success: true, data: updated });
  });

  fastify.get("/auth/me","""

if old in content:
    open('C:/projetos/beautytech-v2/backend/src/modules/all-modules.ts', 'w', encoding='utf-8').write(content.replace(old, new, 1))
    print('CORRIGIDO')
else:
    print('TRECHO NAO ENCONTRADO')
