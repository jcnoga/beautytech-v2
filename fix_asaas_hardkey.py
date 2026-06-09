content = open('C:/projetos/beautytech-v2/backend/src/modules/asaas.module.ts', encoding='utf-8').read()
old = "  const ASAAS_KEY = process.env.ASAAS_API_KEY ? (process.env.ASAAS_API_KEY.startsWith('$') ? process.env.ASAAS_API_KEY : '$' + process.env.ASAAS_API_KEY) : '';"
new = "  const ASAAS_KEY = process.env.ASAAS_API_KEY || '$aact_hmlg_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OjE1MGM3NTEzLWRmMDQtNDhmZS1hZWQxLWJkYjMxODIyYWJlYzo6JGFhY2hfOTI2ZjBjZDQtNzM3MC00M2EwLWI5YzEtNTMzYTJkYzI0MGI5';"
if old in content:
    open('C:/projetos/beautytech-v2/backend/src/modules/asaas.module.ts', 'w', encoding='utf-8').write(content.replace(old, new, 1))
    print('CORRIGIDO')
else:
    print('TRECHO NAO ENCONTRADO')
