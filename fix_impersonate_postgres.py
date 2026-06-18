with open("backend/src/modules/all-modules.ts", "r", encoding="utf-8") as f:
    content = f.read()

# Trocar import do db para incluir queryClient
old_import = 'import { db } from "@db/connection";'
new_import = 'import { db } from "@db/connection";\nimport postgres from "postgres";\nconst _rawClient = postgres(process.env.POSTGRES_URL!, { prepare: false, ssl: { rejectUnauthorized: false } });'

# Trocar o bloco pg nativo para usar postgres diretamente
old_block = '''    const { Pool } = await import("pg");
    const pgPool = new Pool({ connectionString: process.env.DATABASE_URL });
    const tenantRows = await pgPool.query("SELECT id::text, name, email FROM tenants WHERE id::text = $1 LIMIT 1", [tenantId]);
    const tenant = tenantRows.rows[0];
    if (!tenant) { await pgPool.end(); return reply.status(404).send({ success: false, error: "Tenant not found", debug: tenantId }); }

    const userRows = await pgPool.query("SELECT id::text, email, role FROM users WHERE tenant_id::text = $1 AND role = $2 LIMIT 1", [tenantId, "admin"]);
    const adminUser = userRows.rows[0];
    await pgPool.end();
    if (!adminUser) return reply.status(404).send({ success: false, error: "Admin user not found for this tenant" });'''

new_block = '''    const tenantRows = await _rawClient`SELECT id::text, name, email FROM tenants WHERE id::text = ${tenantId} LIMIT 1`;
    const tenant = tenantRows[0];
    if (!tenant) return reply.status(404).send({ success: false, error: "Tenant not found", debug: tenantId });

    const userRows = await _rawClient`SELECT id::text, email, role FROM users WHERE tenant_id::text = ${tenantId} AND role = ${"admin"} LIMIT 1`;
    const adminUser = userRows[0];
    if (!adminUser) return reply.status(404).send({ success: false, error: "Admin user not found for this tenant" });'''

if old_import in content and old_block in content:
    content = content.replace(old_import, new_import, 1)
    content = content.replace(old_block, new_block, 1)
    with open("backend/src/modules/all-modules.ts", "w", encoding="utf-8") as f:
        f.write(content)
    print("OK: usando postgres nativo")
else:
    if old_import not in content:
        print("ERRO: import nao encontrado")
    if old_block not in content:
        print("ERRO: bloco nao encontrado")
