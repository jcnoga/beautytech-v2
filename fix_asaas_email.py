content = open('C:/projetos/beautytech-v2/backend/src/modules/asaas.module.ts', encoding='utf-8').read()
old = "    const existing = await asaasFetch(\"GET\", `/customers?email=${encodeURIComponent(tenant.email)}`);"
new = "    const asaasEmail = process.env.ASAAS_ENV === 'production' ? tenant.email : (process.env.ASAAS_TEST_EMAIL ?? tenant.email);\n    const existing = await asaasFetch(\"GET\", `/customers?email=${encodeURIComponent(asaasEmail)}`);"
if old in content:
    open('C:/projetos/beautytech-v2/backend/src/modules/asaas.module.ts', 'w', encoding='utf-8').write(content.replace(old, new, 1))
    print('CORRIGIDO')
else:
    print('TRECHO NAO ENCONTRADO')
