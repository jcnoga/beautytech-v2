content = open('C:/projetos/beautytech-v2/backend/src/modules/asaas.module.ts', encoding='utf-8').read()
old = "    return res.json();"
new = "    const text = await res.text();\n    try { return text ? JSON.parse(text) : {}; } catch { return {}; }"
if old in content:
    open('C:/projetos/beautytech-v2/backend/src/modules/asaas.module.ts', 'w', encoding='utf-8').write(content.replace(old, new, 1))
    print('CORRIGIDO')
else:
    print('TRECHO NAO ENCONTRADO')
