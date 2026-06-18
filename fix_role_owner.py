with open("backend/src/modules/all-modules.ts", "r", encoding="utf-8") as f:
    content = f.read()

old = '    const userRows = await _rawClient`SELECT id::text, email, role FROM user_profiles WHERE tenant_id::text = ${tenantId} AND role = ${"admin"} LIMIT 1`;'
new = '    const userRows = await _rawClient`SELECT id::text, email, role FROM user_profiles WHERE tenant_id::text = ${tenantId} AND role = ${"owner"} LIMIT 1`;'

if old in content:
    content = content.replace(old, new, 1)
    with open("backend/src/modules/all-modules.ts", "w", encoding="utf-8") as f:
        f.write(content)
    print("OK: corrigido admin -> owner")
else:
    print("ERRO: linha nao encontrada")
