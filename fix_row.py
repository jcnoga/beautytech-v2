content = open('C:/projetos/beautytech-v2/backend/src/modules/all-modules.ts', encoding='utf-8').read()
old = "return reply.status(201).send({ success: true, data: ((data as any).rows??[])[0] });"
new = "const row = ((data as any).rows ?? (data as any) ?? [])[0] ?? (Array.isArray(data) ? (data as any)[0] : data);\n    return reply.status(201).send({ success: true, data: row });"
if old in content:
    open('C:/projetos/beautytech-v2/backend/src/modules/all-modules.ts', 'w', encoding='utf-8').write(content.replace(old, new, 1))
    print('CORRIGIDO')
else:
    print('TRECHO NAO ENCONTRADO')
