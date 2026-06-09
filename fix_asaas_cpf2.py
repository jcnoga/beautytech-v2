content = open('C:/projetos/beautytech-v2/backend/src/modules/asaas.module.ts', encoding='utf-8').read()
old = '    await asaasFetch("PUT", `/customers/${customerId}`, { cpfCnpj: "00000000000" });'
new = '    await asaasFetch("PUT", `/customers/${customerId}`, { cpfCnpj: "24971563792" });'
if old in content:
    open('C:/projetos/beautytech-v2/backend/src/modules/asaas.module.ts', 'w', encoding='utf-8').write(content.replace(old, new, 1))
    print('CORRIGIDO')
else:
    print('TRECHO NAO ENCONTRADO')
