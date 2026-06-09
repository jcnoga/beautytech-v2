content = open('C:/projetos/beautytech-v2/backend/src/modules/all-modules.ts', encoding='utf-8').read()
old = "    const data = await db.execute(sql`INSERT INTO consent_forms (tenant_id,client_id,type,content,created_by) VALUES (${tenantId},${b.clientId},${b.type??'lgpd'},${b.content??null},${userId}) RETURNING *`);\n    return reply.status(201).send({ success: true, data: ((data as any).rows??[])[0] });"
new = "    const data = await db.execute(sql`INSERT INTO consent_forms (tenant_id,client_id,type,content,created_by) VALUES (${tenantId},${b.clientId},${b.type??'lgpd'},${b.content??null},${userId}) RETURNING *`);\n    const rows = (data as any).rows ?? (Array.isArray(data) ? data : [data]);\n    return reply.status(201).send({ success: true, data: rows[0] ?? rows });"
if old in content:
    open('C:/projetos/beautytech-v2/backend/src/modules/all-modules.ts', 'w', encoding='utf-8').write(content.replace(old, new, 1))
    print('CORRIGIDO')
else:
    print('TRECHO NAO ENCONTRADO')
