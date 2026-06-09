content = open('C:/projetos/beautytech-v2/backend/src/modules/all-modules.ts', encoding='utf-8').read()
idx = content.find('reply.status(500).send({ success: false, error: "Erro ao criar sal')
if idx >= 0:
    end = content.find('});', idx) + 3
    old = content[idx-6:end]
    new = 'console.error("[REGISTER ERROR]", err?.message, err?.stack);\n      return reply.status(500).send({ success: false, error: err?.message ?? "Erro ao criar salao" });'
    result = content[:idx-6] + new + content[end:]
    open('C:/projetos/beautytech-v2/backend/src/modules/all-modules.ts', 'w', encoding='utf-8').write(result)
    print('CORRIGIDO')
else:
    print('NAO ENCONTRADO')
