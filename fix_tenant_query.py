with open("backend/src/modules/all-modules.ts", "r", encoding="utf-8") as f:
    content = f.read()

old_query = '    const tenantResult = await db.execute(sql`SELECT id, name, email FROM tenants WHERE id = ${tenantId} LIMIT 1`);'
new_query = '    const tenantResult = await db.execute(sql`SELECT id, name, email FROM tenants WHERE id::text = ${tenantId}::text LIMIT 1`);'

if old_query in content:
    content = content.replace(old_query, new_query, 1)
    with open("backend/src/modules/all-modules.ts", "w", encoding="utf-8") as f:
        f.write(content)
    print("OK: query corrigida com cast ::text")
else:
    print("ERRO: query nao encontrada")
