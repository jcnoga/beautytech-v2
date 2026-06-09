content = open('C:/projetos/beautytech-v2/backend/src/modules/all-modules.ts', encoding='utf-8').read()
old = 'rconsole.error("[REGISTER ERROR]"'
new = 'console.error("[REGISTER ERROR]"'
if old in content:
    open('C:/projetos/beautytech-v2/backend/src/modules/all-modules.ts', 'w', encoding='utf-8').write(content.replace(old, new, 1))
    print('CORRIGIDO')
else:
    print('NAO ENCONTRADO')
