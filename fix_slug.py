content = open('C:/projetos/beautytech-v2/backend/src/modules/all-modules.ts', encoding='utf-8').read()
old = "        slug: salonName.toLowerCase().replace(/[^a-z0-9]/g, \"-\").replace(/-+/g, \"-\"),"
new = "        slug: salonName.toLowerCase().replace(/[^a-z0-9]/g, \"-\").replace(/-+/g, \"-\").replace(/^-|-$/g, \"\") + \"-\" + Math.random().toString(36).slice(2,7),"
if old in content:
    open('C:/projetos/beautytech-v2/backend/src/modules/all-modules.ts', 'w', encoding='utf-8').write(content.replace(old, new, 1))
    print('CORRIGIDO')
else:
    print('TRECHO NAO ENCONTRADO')
