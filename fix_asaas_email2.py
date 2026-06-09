content = open('C:/projetos/beautytech-v2/backend/src/modules/asaas.module.ts', encoding='utf-8').read()
old = "    const created = await asaasFetch(\"POST\", \"/customers\", {\n      name: tenant.name,\n      email: tenant.email,"
new = "    const created = await asaasFetch(\"POST\", \"/customers\", {\n      name: tenant.name,\n      email: asaasEmail,"
if old in content:
    open('C:/projetos/beautytech-v2/backend/src/modules/asaas.module.ts', 'w', encoding='utf-8').write(content.replace(old, new, 1))
    print('CORRIGIDO')
else:
    print('TRECHO NAO ENCONTRADO')
