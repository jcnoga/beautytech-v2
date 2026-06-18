with open("backend/src/modules/all-modules.ts", "r", encoding="utf-8") as f:
    content = f.read()

old = '''    await db.execute(sql`INSERT INTO audit_logs (tenant_id, user_id, action, details, created_at)
      VALUES (${tenantId}, ${adminUser.id}, 'IMPERSONATION_START',
      ${"Super admin " + superAdminEmail + " acessou como tenant " + tenant.name}, now())`);'''

new = '''    await db.execute(sql`INSERT INTO audit_logs (tenant_id, user_id, action, table_name, new_data, created_at)
      VALUES (${tenantId}, ${adminUser.id}, 'IMPERSONATION_START', 'tenants',
      ${JSON.stringify({ impersonatedBy: superAdminEmail, tenantName: tenant.name })}, now())`);'''

if old in content:
    content = content.replace(old, new, 1)
    with open("backend/src/modules/all-modules.ts", "w", encoding="utf-8") as f:
        f.write(content)
    print("OK: audit_log corrigido")
else:
    print("ERRO: bloco nao encontrado")
