with open("backend/src/modules/all-modules.ts", "r", encoding="utf-8") as f:
    content = f.read()

old = '      process.env.JWT_SECRET!,'
new = '      process.env.SUPER_ADMIN_SECRET!,'

if old in content:
    content = content.replace(old, new, 1)
    with open("backend/src/modules/all-modules.ts", "w", encoding="utf-8") as f:
        f.write(content)
    print("OK: trocado JWT_SECRET -> SUPER_ADMIN_SECRET")
else:
    print("ERRO: linha nao encontrada")
