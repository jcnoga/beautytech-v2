
content = open("C:/projetos/beautytech-v2/backend/src/modules/all-modules.ts", encoding="utf-8").read()

old = '''    // Servicos demo
    const insertedSvcs = await db.insert(services).values([
 // CLIENT RECORDS MODULE'''

new = '''    // Servicos demo
    const insertedSvcs = await db.insert(services).values([
      { tenantId, name: "Demo Coloracao", durationMinutes: 90, price: "180.00", isActive: true, isOnlineBookable: true, createdBy: tenantId },
      { tenantId, name: "Demo Corte Feminino", durationMinutes: 45, price: "80.00", isActive: true, isOnlineBookable: true, createdBy: tenantId },
      { tenantId, name: "Demo Manicure", durationMinutes: 60, price: "60.00", isActive: true, isOnlineBookable: true, createdBy: tenantId },
    ]).returning();

 // CLIENT RECORDS MODULE'''

result = content.replace(old, new, 1)
open("C:/projetos/beautytech-v2/backend/src/modules/all-modules.ts", "w", encoding="utf-8").write(result)
print("DONE" if old not in result else "NAO SUBSTITUIU")
