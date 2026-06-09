content = open('C:/projetos/beautytech-v2/backend/src/server.ts', encoding='utf-8').read()

old = 'import {'
new = 'import { asaasModule } from "./modules/asaas.module.js";\nimport {'

if old in content:
    content = content.replace(old, new, 1)

old2 = "await server.register(demoModule,          { prefix });"
new2 = "await server.register(demoModule,          { prefix });\n  await server.register(asaasModule,        { prefix });"

if old2 in content:
    content = content.replace(old2, new2, 1)
    open('C:/projetos/beautytech-v2/backend/src/server.ts', 'w', encoding='utf-8').write(content)
    print('CORRIGIDO')
else:
    print('TRECHO NAO ENCONTRADO')
