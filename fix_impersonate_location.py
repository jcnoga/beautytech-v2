with open("backend/src/modules/all-modules.ts", "r", encoding="utf-8") as f:
    content = f.read()

# Bloco do impersonate que esta no lugar errado
impersonate_block = '''
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

# 1. Remover do lugar errado (dentro de protocolSessionsModule)
wrong_context = '''  });

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

}

// TREATMENT PACKAGES MODULE'''

correct_context = '''  });

}

// TREATMENT PACKAGES MODULE'''

# 2. Inserir no lugar certo: antes do fechamento do superAdminModule
# O superAdminModule tem "super-admin/stats" como ultimo endpoint - vamos achar seu fechamento
# Buscar pelo padrao: ultimo endpoint do superAdmin seguido de fechamento
target_sa_end = '''  fastify.get("/super-admin/stats", { preHandler: [requireSuperAdmin] }, async (_req, reply) => {'''

if wrong_context in content:
    content = content.replace(wrong_context, correct_context, 1)
    print("OK: removido do lugar errado")
else:
    print("ERRO: bloco errado nao encontrado")

# Achar onde o superAdminModule fecha após o stats endpoint
# Vamos procurar o padrao do fechamento correto
import re
# Encontrar a posicao do stats e achar o proximo "}\n}" que fecha o modulo
stats_pos = content.find('fastify.get("/super-admin/stats"')
if stats_pos == -1:
    print("ERRO: stats endpoint nao encontrado")
else:
    # Achar o fechamento do modulo apos stats
    close_pos = content.find('\n}\n', stats_pos)
    if close_pos == -1:
        print("ERRO: fechamento do modulo nao encontrado")
    else:
        insert_pos = close_pos  # inserir antes do \n}\n
        content = content[:insert_pos] + '\n' + impersonate_block.rstrip() + '\n' + content[insert_pos:]
        print("OK: inserido no superAdminModule")

with open("backend/src/modules/all-modules.ts", "w", encoding="utf-8") as f:
    f.write(content)
    print("DONE: arquivo salvo")
