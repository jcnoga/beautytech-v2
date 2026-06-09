content = open('C:/projetos/beautytech-v2/backend/src/modules/asaas.module.ts', encoding='utf-8').read()
old = "    const customerId = await getOrCreateAsaasCustomer(tenant);\n\n    const charge = await asaasFetch"
new = "    const customerId = await getOrCreateAsaasCustomer(tenant);\n    await asaasFetch(\"PUT\", `/customers/${customerId}`, { cpfCnpj: \"00000000000\" });\n\n    const charge = await asaasFetch"
if old in content:
    open('C:/projetos/beautytech-v2/backend/src/modules/asaas.module.ts', 'w', encoding='utf-8').write(content.replace(old, new, 1))
    print('CORRIGIDO')
else:
    print('TRECHO NAO ENCONTRADO')
