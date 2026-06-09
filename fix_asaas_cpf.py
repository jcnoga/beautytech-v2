content = open('C:/projetos/beautytech-v2/backend/src/modules/asaas.module.ts', encoding='utf-8').read()
old = """    const created = await asaasFetch("POST", "/customers", {
      name: tenant.name,
      email: tenant.email,
      phone: tenant.phone ?? undefined,
      notificationDisabled: false,
    });"""
new = """    const created = await asaasFetch("POST", "/customers", {
      name: tenant.name,
      email: tenant.email,
      phone: tenant.phone ?? undefined,
      cpfCnpj: tenant.settings?.cpfCnpj ?? "00000000000",
      notificationDisabled: false,
    });"""
if old in content:
    open('C:/projetos/beautytech-v2/backend/src/modules/asaas.module.ts', 'w', encoding='utf-8').write(content.replace(old, new, 1))
    print('CORRIGIDO')
else:
    print('TRECHO NAO ENCONTRADO')
