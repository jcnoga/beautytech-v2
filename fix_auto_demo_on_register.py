path = "backend/src/modules/all-modules.ts"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

changes = 0

old = """      await db.insert(serviceCategories).values(
        defaultCategories.map((name, i) => ({
          tenantId: tenant.id,
          name,
          isActive: true,
          sortOrder: i + 1,
        }))
      );

      // Geocoding automatico via Nominatim (fire and forget)"""

new = """      await db.insert(serviceCategories).values(
        defaultCategories.map((name, i) => ({
          tenantId: tenant.id,
          name,
          isActive: true,
          sortOrder: i + 1,
        }))
      );

      // Popula o tenant com dados demo automaticamente (profissionais, servicos,
      // horarios, clientes e agendamentos de exemplo), chamando a rota /demo/seed
      // internamente via fastify.inject (sem requisicao de rede real).
      try {
        const jwt = await import("jsonwebtoken");
        const demoToken = jwt.default.sign(
          {
            userId: authUserId,
            tenantId: tenant.id,
            email,
            role: "owner",
            impersonation: true,
            impersonatedBy: "system:auto-demo-on-register",
            tenantName: tenant.name,
          },
          process.env.SUPER_ADMIN_SECRET!,
          { expiresIn: "10m" }
        );
        const seedRes = await fastify.inject({
          method: "POST",
          url: "/api/v1/demo/seed",
          headers: { authorization: `Bearer ${demoToken}` },
        });
        if (seedRes.statusCode >= 400) {
          console.error("[REGISTER] Seed demo retornou erro:", seedRes.statusCode, seedRes.body);
        }
      } catch (seedErr: any) {
        console.error("[REGISTER] Falha ao gerar dados demo automaticos:", seedErr?.message);
      }

      // Geocoding automatico via Nominatim (fire and forget)"""

if old in content:
    content = content.replace(old, new)
    changes += 1
    print("OK: seed automatico de dados demo adicionado ao cadastro de tenant")
else:
    print("AVISO: bloco de referencia nao encontrado - nenhuma alteracao feita")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print(f"\nTotal de mudancas aplicadas: {changes}/1")
