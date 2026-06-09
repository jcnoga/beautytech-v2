content = open('C:/projetos/beautytech-v2/backend/src/modules/asaas.module.ts', encoding='utf-8').read()
old = """    const existing = await asaasFetch("GET", `/customers?email=${encodeURIComponent(tenant.email)}`);
    if (existing?.data?.length > 0) {
      const id = existing.data[0].id;
      await db.update(tenants).set({ settings: { ...tenant.settings, asaasCustomerId: id }, updatedAt: new Date() }).where(eq(tenants.id, tenant.id));
      return id;
    }"""
new = """    const existing = await asaasFetch("GET", `/customers?email=${encodeURIComponent(tenant.email)}`);
    if (existing?.data?.length > 0) {
      const id = existing.data[0].id;
      await asaasFetch("PUT", `/customers/${id}`, { cpfCnpj: tenant.settings?.cpfCnpj ?? "00000000000" });
      await db.update(tenants).set({ settings: { ...tenant.settings, asaasCustomerId: id }, updatedAt: new Date() }).where(eq(tenants.id, tenant.id));
      return id;
    }"""
if old in content:
    open('C:/projetos/beautytech-v2/backend/src/modules/asaas.module.ts', 'w', encoding='utf-8').write(content.replace(old, new, 1))
    print('CORRIGIDO')
else:
    print('TRECHO NAO ENCONTRADO')
