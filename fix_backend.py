content = open('backend/src/modules/all-modules.ts', encoding='utf-8').read()

old = '''  fastify.get("/service-categories", { preHandler: [authenticate] }, async (req: any, reply) => {
    const { tenantId } = req.tenantContext;
    const data = await db.select().from(serviceCategories)
      .where(and(eq(serviceCategories.tenantId, tenantId), eq(serviceCategories.isActive, true)))
      .orderBy(serviceCategories.sortOrder);
    return reply.send({ success: true, data });
  });
}'''

new = '''  fastify.get("/service-categories", { preHandler: [authenticate] }, async (req: any, reply) => {
    const { tenantId } = req.tenantContext;
    const data = await db.select().from(serviceCategories)
      .where(and(eq(serviceCategories.tenantId, tenantId), eq(serviceCategories.isActive, true)))
      .orderBy(serviceCategories.sortOrder);
    return reply.send({ success: true, data });
  });

  fastify.post("/service-categories", { preHandler: [authenticate] }, async (req: any, reply) => {
    const { tenantId } = req.tenantContext;
    const { name, description } = req.body as any;
    if (!name) return reply.status(400).send({ success: false, error: "Nome obrigatorio" });
    const [data] = await db.insert(serviceCategories).values({
      tenantId,
      name,
      description: description ?? null,
      isActive: true,
      sortOrder: 0,
    }).returning();
    return reply.status(201).send({ success: true, data });
  });

  fastify.delete("/service-categories/:id", { preHandler: [authenticate] }, async (req: any, reply) => {
    const { tenantId } = req.tenantContext;
    const { id } = req.params as any;
    await db.delete(serviceCategories)
      .where(and(eq(serviceCategories.id, id), eq(serviceCategories.tenantId, tenantId)));
    return reply.status(204).send();
  });
}'''

if old in content:
    content = content.replace(old, new)
    print("OK")
else:
    print("NAO ENCONTRADO")

open('backend/src/modules/all-modules.ts', 'w', encoding='utf-8').write(content)
