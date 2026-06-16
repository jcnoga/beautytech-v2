content = open('backend/src/modules/all-modules.ts', 'r', encoding='latin-1').read()
old = '    const data = await db.select().from(services).where(and(...cond)).orderBy(services.sortOrder);\n    return reply.send({ success: true, data, total: data.length });'
new = '''    const data = await db
      .select({
        id: services.id, tenantId: services.tenantId, name: services.name,
        description: services.description, price: services.price,
        durationMinutes: services.durationMinutes, categoryId: services.categoryId,
        isActive: services.isActive, isOnlineBookable: services.isOnlineBookable,
        sortOrder: services.sortOrder, createdAt: services.createdAt,
        categoryName: serviceCategories.name,
      })
      .from(services)
      .leftJoin(serviceCategories, eq(services.categoryId, serviceCategories.id))
      .where(and(...cond))
      .orderBy(services.sortOrder);
    return reply.send({ success: true, data, total: data.length });'''
content = content.replace(old, new, 1)
open('backend/src/modules/all-modules.ts', 'w', encoding='latin-1').write(content)
print('OK - categoryName:', content.count('categoryName'))
