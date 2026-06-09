content = open('C:/projetos/beautytech-v2/backend/src/modules/all-modules.ts', encoding='utf-8').read()
old = "    return reply.send({ success: true, data: (data as any).rows ?? [] });"
new = "    const rows2 = (data as any).rows ?? (Array.isArray(data) ? data : []);\n    return reply.send({ success: true, data: rows2 });"
if old in content:
    open('C:/projetos/beautytech-v2/backend/src/modules/all-modules.ts', 'w', encoding='utf-8').write(content.replace(old, new, 1))
    print('CORRIGIDO')
else:
    print('TRECHO NAO ENCONTRADO')
