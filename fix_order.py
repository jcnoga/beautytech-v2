content = open('C:/projetos/beautytech-v2/backend/src/modules/all-modules.ts', encoding='utf-8').read()
old = "    const data = await db.execute(sql`SELECT * FROM consent_forms WHERE tenant_id = ${tenantId} AND client_id = ${req.params.clientId} ORDER BY created_at DESC`);"
new = "    const data = await db.execute(sql`SELECT * FROM consent_forms WHERE tenant_id = ${tenantId} AND client_id = ${req.params.clientId} ORDER BY is_signed DESC, created_at DESC`);"
if old in content:
    open('C:/projetos/beautytech-v2/backend/src/modules/all-modules.ts', 'w', encoding='utf-8').write(content.replace(old, new, 1))
    print('CORRIGIDO')
else:
    print('TRECHO NAO ENCONTRADO')
