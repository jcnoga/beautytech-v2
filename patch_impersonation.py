import re

with open("backend/src/modules/all-modules.ts", "r", encoding="utf-8") as f:
    content = f.read()

# Inserir endpoint ANTES do fechamento do superAdminModule
# O superAdminModule termina antes do "// TREATMENT PACKAGES MODULE"
new_endpoint = '''
  // IMPERSONATION
  fastify.post("/super-admin/tenants/:id/impersonate", { preHandler: [requireSuperAdmin] }, async (req: any, reply: any) => {
    const tenantId = req.params.id;
    const superAdminEmail = req.superAdmin.email;

    const tenantResult = await db.execute(sql`SELECT id, name, email FROM tenants WHERE id = ${tenantId} LIMIT 1`);
    const tenant = ((tenantResult as any).rows ?? [])[0];
    if (!tenant) return reply.status(404).send({ success: false, error: "Tenant not found" });

    const userResult = await db.execute(sql`SELECT id, email, role FROM users WHERE tenant_id = ${tenantId} AND role = 'admin' LIMIT 1`);
    const adminUser = ((userResult as any).rows ?? [])[0];
    if (!adminUser) return reply.status(404).send({ success: false, error: "Admin user not found for this tenant" });

    const jwt = await import("jsonwebtoken");
    const impersonationToken = jwt.default.sign(
      {
        userId: adminUser.id,
        tenantId: tenant.id,
        email: adminUser.email,
        role: adminUser.role,
        impersonation: true,
        impersonatedBy: superAdminEmail,
        tenantName: tenant.name,
      },
      process.env.JWT_SECRET!,
      { expiresIn: "2h" }
    );

    await db.execute(sql`INSERT INTO audit_logs (tenant_id, user_id, action, details, created_at)
      VALUES (${tenantId}, ${adminUser.id}, 'IMPERSONATION_START',
      ${"Super admin " + superAdminEmail + " acessou como tenant " + tenant.name}, now())`);

    return reply.send({ success: true, token: impersonationToken, tenantName: tenant.name });
  });

'''

# Localizar o fechamento do superAdminModule (linha com "}" seguida de linha em branco e "// TREATMENT PACKAGES")
target = '}\n\n// TREATMENT PACKAGES MODULE'
replacement = new_endpoint + '}\n\n// TREATMENT PACKAGES MODULE'

if target in content:
    content = content.replace(target, replacement, 1)
    with open("backend/src/modules/all-modules.ts", "w", encoding="utf-8") as f:
        f.write(content)
    print("OK: endpoint /impersonate adicionado com sucesso")
else:
    print("ERRO: marcador nao encontrado — verifique manualmente")
