content = open('C:/projetos/beautytech-v2/backend/src/db/schema/index.ts', encoding='utf-8').read()

old = '  lat:          decimal("lat", { precision: 10, scale: 7 }),\n  lng:          decimal("lng", { precision: 10, scale: 7 }),'
new = '  lat:          numeric("lat", { precision: 10, scale: 7 }),\n  lng:          numeric("lng", { precision: 10, scale: 7 }),'

if old in content:
    content = content.replace(old, new, 1)
    open('C:/projetos/beautytech-v2/backend/src/db/schema/index.ts', 'w', encoding='utf-8').write(content)
    print("OK - decimal substituido por numeric")
else:
    print("NAO ENCONTRADO")
