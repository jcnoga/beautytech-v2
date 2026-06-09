content = open('C:/projetos/beautytech-v2/backend/src/modules/asaas.module.ts', encoding='utf-8').read()
old = "  const ASAAS_KEY = process.env.ASAAS_API_KEY!;"
new = "  const ASAAS_KEY = process.env.ASAAS_API_KEY ? (process.env.ASAAS_API_KEY.startsWith('$') ? process.env.ASAAS_API_KEY : '$' + process.env.ASAAS_API_KEY) : '';"
if old in content:
    open('C:/projetos/beautytech-v2/backend/src/modules/asaas.module.ts', 'w', encoding='utf-8').write(content.replace(old, new, 1))
    print('CORRIGIDO')
else:
    print('TRECHO NAO ENCONTRADO')
