content = open('C:/projetos/beautytech-v2/backend/src/modules/asaas.module.ts', encoding='utf-8').read()
old = '  const ASAAS_URL = process.env.ASAAS_ENV === "sandbox"\n    ? "https://sandbox.asaas.com/api/v3"\n    : "https://api.asaas.com/api/v3";\n  console.log("[ASAAS] ENV:", process.env.ASAAS_ENV, "URL:", ASAAS_URL);'
new = '  const ASAAS_URL = "https://sandbox.asaas.com/api/v3";\n  console.log("[ASAAS] URL:", ASAAS_URL, "KEY:", ASAAS_KEY?.substring(0,20));'
if old in content:
    open('C:/projetos/beautytech-v2/backend/src/modules/asaas.module.ts', 'w', encoding='utf-8').write(content.replace(old, new, 1))
    print('CORRIGIDO')
else:
    print('TRECHO NAO ENCONTRADO')
