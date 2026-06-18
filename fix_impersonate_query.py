with open("backend/src/modules/all-modules.ts", "r", encoding="utf-8") as f:
    content = f.read()

old_block = '''    const tenantResult = await db.execute(sql`SELECT id, name, email FROM tenants WHERE id::text = ${tenantId}::text LIMIT 1`);
    const tenant = ((tenantResult as any).rows ?? [])[0];
    if (!tenant) return reply.status(404).send({ success: false, error: "Tenant not found" });

    const userResult = await db.execute(sql`SELECT id, email, role FROM users WHERE tenant_id = ${tenantId} AND role = 'admin' LIMIT 1`);
    const adminUser = ((userResult as any).rows ?? [])[0];
    if (!adminUser) return reply.status(404).send({ success: false, error: "Admin user not found for this tenant" });'''

new_block = '''    const tenantResult = await db.execute(sql`SELECT id::text, name, email FROM tenants WHERE id::text = ${tenantId} LIMIT 1`);
    const tenant = ((tenantResult as any).rows ?? [])[0];
    if (!tenant) return reply.status(404).send({ success: false, error: "Tenant not found", debug: tenantId });

    const userResult = await db.execute(sql`SELECT id::text, email, role FROM users WHERE tenant_id::text = ${tenantId} AND role = 'admin' LIMIT 1`);
    const adminUser = ((userResult as any).rows ?? [])[0];
    if (!adminUser) return reply.status(404).send({ success: false, error: "Admin user not found for this tenant", debug: tenantId });'''

if old_block in content:
    content = content.replace(old_block, new_block, 1)
    with open("backend/src/modules/all-modules.ts", "w", encoding="utf-8") as f:
        f.write(content)
    print("OK: query corrigida")
else:
    print("ERRO: bloco nao encontrado")
