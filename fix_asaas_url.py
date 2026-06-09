content = open('C:/projetos/beautytech-v2/backend/src/modules/asaas.module.ts', encoding='utf-8').read()
old = '  const ASAAS_URL = process.env.ASAAS_ENV === "sandbox"\n    ? "https://sandbox.asaas.com/api/v3"\n    : "https://api.asaas.com/api/v3";'
new = '  const ASAAS_URL = process.env.ASAAS_ENV === "sandbox"\n    ? "https://sandbox.asaas.com/api/v3"\n    : "https://api.asaas.com/api/v3";\n  console.log("[ASAAS] ENV:", process.env.ASAAS_ENV, "URL:", ASAAS_URL);'
if old in content:
    open('C:/projetos/beautytech-v2/backend/src/modules/asaas.module.ts', 'w', encoding='utf-8').write(content.replace(old, new, 1))
    print('CORRIGIDO')
else:
    print('TRECHO NAO ENCONTRADO')
