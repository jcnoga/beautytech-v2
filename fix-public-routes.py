# -*- coding: utf-8 -*-
path = r"C:\projetos\beautytech-v2\backend\src\modules\all-modules.ts"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = '  fastify.get("/super-admin/tenants", { preHandler: [requireSuperAdmin] }'

new = '''  // ROTAS PUBLICAS
  fastify.get("/public/salon/:slug", async (req: any, reply) => {
    try {
      const { slug } = req.params;
      const [tenant] = await db.select({
        id: tenants.id, name: tenants.name, slug: tenants.slug,
        phone: tenants.phone, whatsapp: tenants.whatsapp,
        logoUrl: tenants.logoUrl, coverUrl: tenants.coverUrl,
        primaryColor: tenants.primaryColor, addressCity: tenants.addressCity,
        addressState: tenants.addressState, instagram: tenants.instagram,
        businessType: tenants.businessType,
      }).from(tenants).where(and(eq(tenants.slug, slug), eq(tenants.isActive, true), isNull(tenants.deletedAt))).limit(1);
      if (!tenant) return reply.status(404).send({ success: false, error: "Salao nao encontrado" });
      const tenantId = tenant.id;
      const [svcList, profList] = await Promise.all([
        db.select({ id: services.id, name: services.name, description: services.description, durationMinutes: services.durationMinutes, price: services.price })
          .from(services).where(and(eq(services.tenantId, tenantId), eq(services.isActive, true))).orderBy(services.name),
        db.select({ id: professionals.id, fullName: professionals.fullName, displayName: professionals.displayName, avatarUrl: professionals.avatarUrl, color: professionals.color })
          .from(professionals).where(and(eq(professionals.tenantId, tenantId), eq(professionals.isActive, true))).orderBy(professionals.fullName),
      ]);
      return reply.send({ success: true, data: { ...tenant, services: svcList, professionals: profList } });
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  fastify.post("/public/appointments", async (req: any, reply) => {
    try {
      const { slug, clientName, clientPhone, serviceId, professionalId, scheduledAt } = req.body as any;
      if (!slug || !clientName || !clientPhone || !serviceId || !scheduledAt)
        return reply.status(400).send({ success: false, error: "Campos obrigatorios: slug, clientName, clientPhone, serviceId, scheduledAt" });
      const [tenant] = await db.select({ id: tenants.id, name: tenants.name })
        .from(tenants).where(and(eq(tenants.slug, slug), eq(tenants.isActive, true), isNull(tenants.deletedAt))).limit(1);
      if (!tenant) return reply.status(404).send({ success: false, error: "Salao nao encontrado" });
      const tenantId = tenant.id;
      const [svc] = await db.select({ id: services.id, name: services.name, durationMinutes: services.durationMinutes, price: services.price })
        .from(services).where(and(eq(services.id, serviceId), eq(services.tenantId, tenantId))).limit(1);
      if (!svc) return reply.status(404).send({ success: false, error: "Servico nao encontrado" });
      const phone = clientPhone.replace(/\D/g, "");
      let [client] = await db.select({ id: clients.id })
        .from(clients).where(and(eq(clients.tenantId, tenantId), eq(clients.phone, phone))).limit(1);
      if (!client) {
        const [newClient] = await db.insert(clients).values({
          tenantId, fullName: clientName, phone, acceptsWhatsapp: true, createdBy: tenantId,
        }).returning({ id: clients.id });
        client = newClient;
      }
      const start = new Date(scheduledAt);
      const end = new Date(start.getTime() + svc.durationMinutes * 60000);
      const [appt] = await db.insert(appointments).values({
        tenantId, clientId: client.id, professionalId: professionalId ?? null,
        status: "pending", scheduledAt: start, endsAt: end,
        durationMinutes: svc.durationMinutes, totalPrice: svc.price,
        notes: "Agendamento online", createdBy: tenantId,
      }).returning({ id: appointments.id });
      return reply.send({ success: true, data: { appointmentId: appt.id, salonName: tenant.name, service: svc.name, scheduledAt: start } });
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  fastify.get("/super-admin/tenants", { preHandler: [requireSuperAdmin] }'''

if old in content:
    content = content.replace(old, new)
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(content)
    print("OK - rotas publicas adicionadas")
else:
    print("ATENCAO - ponto nao encontrado")
    idx = content.find("super-admin/tenants")
    print(repr(content[max(0,idx-50):idx+100]))