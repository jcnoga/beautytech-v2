import type { FastifyInstance } from "fastify";
import { eq, and, isNull, gte, lte } from "drizzle-orm";
import { db } from "@db/connection";
import { tenants, services, professionals, clients, appointments, appointmentServices } from "@db/schema/index";

export async function publicBookingModule(fastify: FastifyInstance) {

  fastify.get("/public/tenants", async (req: any, reply) => {
    const { city, businessType } = req.query as any;
    const { ilike } = await import("drizzle-orm");
    const cond: any[] = [eq(tenants.isActive, true), isNull(tenants.deletedAt)];
    if (city) cond.push(ilike(tenants.addressCity, "%" + city + "%"));
    if (businessType) cond.push(eq(tenants.businessType, businessType));
    const data = await db.select({
      id: tenants.id, name: tenants.name, slug: tenants.slug,
      businessType: tenants.businessType, addressCity: tenants.addressCity,
      addressState: tenants.addressState, addressStreet: tenants.addressStreet,
      phone: tenants.phone, whatsapp: tenants.whatsapp, logoUrl: tenants.logoUrl,
      instagram: tenants.instagram, businessHours: tenants.businessHours,
      primaryColor: tenants.primaryColor, coverUrl: tenants.coverUrl,
    }).from(tenants).where(and(...cond)).orderBy(tenants.name);
    return reply.send({ success: true, data, total: data.length });
  });

  fastify.get("/public/tenants/:slug", async (req: any, reply) => {
    const [tenant] = await db.select({
      id: tenants.id, name: tenants.name, slug: tenants.slug,
      businessType: tenants.businessType, addressCity: tenants.addressCity,
      addressState: tenants.addressState, addressStreet: tenants.addressStreet,
      addressZip: tenants.addressZip, phone: tenants.phone, whatsapp: tenants.whatsapp,
      logoUrl: tenants.logoUrl, instagram: tenants.instagram, facebook: tenants.facebook,
      website: tenants.website, businessHours: tenants.businessHours, googlePlaceId: tenants.googlePlaceId,
      primaryColor: tenants.primaryColor, coverUrl: tenants.coverUrl,
    }).from(tenants).where(and(eq(tenants.slug, req.params.slug), eq(tenants.isActive, true), isNull(tenants.deletedAt)));
    if (!tenant) return reply.status(404).send({ success: false, error: "Estabelecimento nao encontrado" });
    return reply.send({ success: true, data: tenant });
  });

  fastify.get("/public/tenants/:slug/services", async (req: any, reply) => {
    const [tenant] = await db.select({ id: tenants.id }).from(tenants)
      .where(and(eq(tenants.slug, req.params.slug), eq(tenants.isActive, true), isNull(tenants.deletedAt)));
    if (!tenant) return reply.status(404).send({ success: false, error: "Estabelecimento nao encontrado" });
    const data = await db.select({
      id: services.id, name: services.name, description: services.description,
      durationMinutes: services.durationMinutes, price: services.price,
      priceMin: services.priceMin, priceMax: services.priceMax,
      imageUrl: services.imageUrl, requiresDeposit: services.requiresDeposit,
      depositAmount: services.depositAmount,
    }).from(services).where(and(
      eq(services.tenantId, tenant.id), eq(services.isActive, true),
      eq(services.isOnlineBookable, true), isNull(services.deletedAt)
    )).orderBy(services.sortOrder);
    return reply.send({ success: true, data, total: data.length });
  });

  fastify.get("/public/tenants/:slug/professionals", async (req: any, reply) => {
    const [tenant] = await db.select({ id: tenants.id }).from(tenants)
      .where(and(eq(tenants.slug, req.params.slug), eq(tenants.isActive, true), isNull(tenants.deletedAt)));
    if (!tenant) return reply.status(404).send({ success: false, error: "Estabelecimento nao encontrado" });
    const data = await db.select({
      id: professionals.id, fullName: professionals.fullName, displayName: professionals.displayName,
      avatarUrl: professionals.avatarUrl, bio: professionals.bio, specialties: professionals.specialties,
      color: professionals.color, workingHours: professionals.workingHours,
    }).from(professionals).where(and(
      eq(professionals.tenantId, tenant.id), eq(professionals.isActive, true),
      eq(professionals.acceptsOnlineBooking, true), isNull(professionals.deletedAt)
    )).orderBy(professionals.sortOrder);
    return reply.send({ success: true, data, total: data.length });
  });

  fastify.get("/public/tenants/:slug/availability", async (req: any, reply) => {
    const { professionalId, serviceId, date } = req.query as any;
    if (!professionalId || !serviceId || !date)
      return reply.status(400).send({ success: false, error: "professionalId, serviceId e date sao obrigatorios" });

    const [tenant] = await db.select({ id: tenants.id }).from(tenants)
      .where(and(eq(tenants.slug, req.params.slug), eq(tenants.isActive, true)));
    if (!tenant) return reply.status(404).send({ success: false, error: "Estabelecimento nao encontrado" });

    const [professional] = await db.select({ workingHours: professionals.workingHours })
      .from(professionals).where(and(eq(professionals.id, professionalId), eq(professionals.tenantId, tenant.id)));
    if (!professional) return reply.status(404).send({ success: false, error: "Profissional nao encontrado" });

    const [service] = await db.select({ durationMinutes: services.durationMinutes })
      .from(services).where(and(eq(services.id, serviceId), eq(services.tenantId, tenant.id)));
    if (!service) return reply.status(404).send({ success: false, error: "Servico nao encontrado" });

    const targetDate = new Date(date + "T12:00:00");
    const dayNames = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
    const dayName = dayNames[targetDate.getDay()];
    const wh = (professional.workingHours as any) ?? {};
    const dayConfig = wh[dayName];

    if (!dayConfig || !dayConfig.enabled)
      return reply.send({ success: true, data: [], message: "Profissional nao trabalha neste dia" });

    const [startH, startM] = (dayConfig.start ?? "08:00").split(":").map(Number);
    const [endH, endM]     = (dayConfig.end   ?? "18:00").split(":").map(Number);
    const slotDuration = service.durationMinutes;
    const slots: string[] = [];
    let current = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    while (current + slotDuration <= endMinutes) {
      slots.push(String(Math.floor(current / 60)).padStart(2,"0") + ":" + String(current % 60).padStart(2,"0"));
      current += slotDuration;
    }

    const dayStart = new Date(date + "T00:00:00.000Z");
    const dayEnd   = new Date(date + "T23:59:59.999Z");
    const existingAppts = await db.select({
      scheduledAt: appointments.scheduledAt, endsAt: appointments.endsAt,
      durationMinutes: appointments.durationMinutes,
    }).from(appointments).where(and(
      eq(appointments.professionalId, professionalId),
      eq(appointments.tenantId, tenant.id),
      gte(appointments.scheduledAt, dayStart),
      lte(appointments.scheduledAt, dayEnd),
      isNull(appointments.deletedAt)
    ));

    const available = slots.filter(slot => {
      const [sh, sm] = slot.split(":").map(Number);
      const slotStart = sh * 60 + sm;
      const slotEnd   = slotStart + slotDuration;
      return !existingAppts.some(appt => {
        const as_ = new Date(appt.scheduledAt);
        const ae  = appt.endsAt ? new Date(appt.endsAt) : new Date(as_.getTime() + appt.durationMinutes * 60000);
        const asMin = as_.getUTCHours() * 60 + as_.getUTCMinutes();
        const aeMin = ae.getUTCHours()  * 60 + ae.getUTCMinutes();
        return slotStart < aeMin && slotEnd > asMin;
      });
    });

    return reply.send({ success: true, data: available, date, total: available.length });
  });

  fastify.post("/public/clients/register", async (req: any, reply) => {
    const { tenantSlug, fullName, whatsapp, email, phone } = req.body as any;
    if (!tenantSlug || !fullName || !whatsapp)
      return reply.status(400).send({ success: false, error: "tenantSlug, fullName e whatsapp sao obrigatorios" });

    const [tenant] = await db.select({ id: tenants.id }).from(tenants)
      .where(and(eq(tenants.slug, tenantSlug), eq(tenants.isActive, true)));
    if (!tenant) return reply.status(404).send({ success: false, error: "Estabelecimento nao encontrado" });

    const [existing] = await db.select({ id: clients.id, fullName: clients.fullName, whatsapp: clients.whatsapp })
      .from(clients).where(and(eq(clients.tenantId, tenant.id), eq(clients.whatsapp, whatsapp), isNull(clients.deletedAt)));
    if (existing) return reply.send({ success: true, data: { ...existing, isExisting: true } });

    const [client] = await db.insert(clients).values({
      tenantId: tenant.id, fullName, whatsapp,
      email: email ?? null, phone: phone ?? null, source: "online_booking",
    }).returning({ id: clients.id, fullName: clients.fullName, whatsapp: clients.whatsapp });
    return reply.status(201).send({ success: true, data: { ...client, isExisting: false } });
  });

  fastify.post("/public/appointments", async (req: any, reply) => {
    const { tenantSlug, clientId, professionalId, serviceId, date, time, clientNotes } = req.body as any;
    if (!tenantSlug || !clientId || !professionalId || !serviceId || !date || !time)
      return reply.status(400).send({ success: false, error: "Campos obrigatorios: tenantSlug, clientId, professionalId, serviceId, date, time" });

    const [tenant] = await db.select({ id: tenants.id }).from(tenants)
      .where(and(eq(tenants.slug, tenantSlug), eq(tenants.isActive, true)));
    if (!tenant) return reply.status(404).send({ success: false, error: "Estabelecimento nao encontrado" });

    const [service] = await db.select({ id: services.id, price: services.price, durationMinutes: services.durationMinutes, name: services.name })
      .from(services).where(and(eq(services.id, serviceId), eq(services.tenantId, tenant.id), eq(services.isActive, true)));
    if (!service) return reply.status(404).send({ success: false, error: "Servico nao encontrado" });

    const [professional] = await db.select({ id: professionals.id })
      .from(professionals).where(and(eq(professionals.id, professionalId), eq(professionals.tenantId, tenant.id), eq(professionals.isActive, true)));
    if (!professional) return reply.status(404).send({ success: false, error: "Profissional nao encontrado" });

    const [client] = await db.select({ id: clients.id })
      .from(clients).where(and(eq(clients.id, clientId), eq(clients.tenantId, tenant.id)));
    if (!client) return reply.status(404).send({ success: false, error: "Cliente nao encontrado" });

    const scheduledAt = new Date(date + "T" + time + ":00");
    const endsAt = new Date(scheduledAt.getTime() + service.durationMinutes * 60000);

    const conflict = await db.select({ id: appointments.id }).from(appointments).where(and(
      eq(appointments.professionalId, professionalId),
      eq(appointments.tenantId, tenant.id),
      isNull(appointments.deletedAt),
      lte(appointments.scheduledAt, endsAt),
      gte(appointments.endsAt, scheduledAt)
    ));
    if (conflict.length > 0)
      return reply.status(409).send({ success: false, error: "Horario indisponivel. Por favor escolha outro horario." });

    const [appointment] = await db.insert(appointments).values({
      tenantId: tenant.id, clientId: client.id, professionalId: professional.id,
      status: "pending", scheduledAt, endsAt,
      durationMinutes: service.durationMinutes, totalPrice: service.price,
      subtotal: service.price, source: "online_booking", clientNotes: clientNotes ?? null,
    }).returning();

    await db.insert(appointmentServices).values({
      tenantId: tenant.id, appointmentId: appointment.id, serviceId: service.id,
      professionalId: professional.id, price: service.price,
      durationMinutes: service.durationMinutes, total: service.price,
    });

    return reply.status(201).send({
      success: true,
      data: { ...appointment, serviceName: service.name },
      message: "Agendamento realizado com sucesso! Aguarde a confirmacao.",
    });
  });
}
