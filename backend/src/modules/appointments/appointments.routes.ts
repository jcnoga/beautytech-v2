import type { FastifyInstance } from "fastify";
import { eq, and, isNull, gte, lte, sql } from "drizzle-orm";
import { db } from "@db/connection";
import { tenants, services, professionals, clients, appointments, appointmentServices } from "@db/schema/index";
import { isTestClient } from "../super-admin/test-data.guard";
import { freeSlots, localToUtc, lockProfessional, checkAgendaRules, AgendaRuleError } from "./agenda-rules";

/** Limite das rotas públicas que gravam (cadastro de cliente e agendamento): por IP (plugin rate-limit). */
export const PUBLIC_LIMIT = 10;
const PUBLIC_RATE_LIMIT = { max: PUBLIC_LIMIT, timeWindow: "1 minute" };

// Limite por telefone (em memória; a API roda num processo só): no máximo PUBLIC_LIMIT por minuto por número,
// mesmo trocando de IP.
const phoneHits = new Map<string, number[]>();
export function publicPhoneLimited(phone: string, now = Date.now()): boolean {
  const key = String(phone ?? "").replace(/\D/g, "").slice(-11);
  if (!key) return false;
  const recent = (phoneHits.get(key) ?? []).filter((t) => now - t < 60_000);
  recent.push(now);
  phoneHits.set(key, recent);
  if (phoneHits.size > 10_000) for (const [k, v] of phoneHits) if (!v.some((t) => now - t < 60_000)) phoneHits.delete(k);
  return recent.length > PUBLIC_LIMIT;
}

/** WhatsApp do agendamento público. Pendente = pedido recebido; confirmado = horário garantido. Primeira pessoa,
 *  com o nome da conta só na assinatura (nada de "o salão"/"na Barbearia": o artigo muda de um nicho para outro). */
export function bookingMessage(p: { pending: boolean; clientName?: string | null; date: string; time: string;
  serviceName: string; professionalName?: string | null; tenantName?: string | null }) {
  const head = p.pending
    ? "Recebemos seu pedido de agendamento para " + p.date + " às " + p.time + "."
    : "Seu agendamento para " + p.date + " às " + p.time + " está confirmado.";
  const tail = p.pending ? "Assim que confirmarmos o horário, avisaremos por aqui." : "Até breve!";
  return "Olá " + (p.clientName || "Cliente") + "! " + head + "\n" +
    "Serviço: " + p.serviceName + "\n" +
    "Profissional: " + (p.professionalName || "A definir") + "\n" +
    tail + (p.tenantName ? "\n— " + p.tenantName : "");
}

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
      primaryColor: tenants.primaryColor, coverUrl: tenants.coverUrl, galleryImages: tenants.galleryImages,
      lat: tenants.lat, lng: tenants.lng,
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
      primaryColor: tenants.primaryColor, coverUrl: tenants.coverUrl, galleryImages: tenants.galleryImages,
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

    // Mesmas regras da agenda interna (agenda-rules): jornada, intervalo, bloqueios e agendamentos, em horário de Brasília.
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date))) return reply.status(400).send({ success: false, error: "date invalida (AAAA-MM-DD)" });
    const { slots: available } = await freeSlots(db, tenant.id, professionalId, serviceId, date);
    return reply.send({ success: true, data: available, date, total: available.length });
  });

  // Cadastro do cliente pela página pública de agendamento (sem login). Segurança (08/10/2026):
  // - responde só o id (UUID aleatório) e se já existia: nunca nome, e-mail ou telefone de quem já está cadastrado;
  // - não altera cadastro existente (antes gravava o e-mail informado em quem não tinha);
  // - no máximo PUBLIC_LIMIT tentativas por minuto por IP (rate-limit) e por telefone (publicPhoneLimited).
  fastify.post("/public/clients/register", { config: { rateLimit: PUBLIC_RATE_LIMIT } }, async (req: any, reply) => {
    const { tenantSlug, fullName, whatsapp, email, phone } = req.body as any;
    if (!tenantSlug || !fullName || !whatsapp)
      return reply.status(400).send({ success: false, error: "tenantSlug, fullName e whatsapp sao obrigatorios" });
    if (publicPhoneLimited(whatsapp))
      return reply.status(429).send({ success: false, code: "TOO_MANY_ATTEMPTS", error: "Muitas tentativas com este telefone. Aguarde um minuto." });

    const [tenant] = await db.select({ id: tenants.id }).from(tenants)
      .where(and(eq(tenants.slug, tenantSlug), eq(tenants.isActive, true)));
    if (!tenant) return reply.status(404).send({ success: false, error: "Estabelecimento nao encontrado" });

    const [existing] = await db.select({ id: clients.id })
      .from(clients).where(and(eq(clients.tenantId, tenant.id), eq(clients.whatsapp, whatsapp), isNull(clients.deletedAt)));
    if (existing) return reply.send({ success: true, data: { id: existing.id, isExisting: true } });

    const [client] = await db.insert(clients).values({
      tenantId: tenant.id, fullName, whatsapp,
      email: email ?? null, phone: phone ?? null, source: "online_booking",
    }).returning({ id: clients.id });
    return reply.status(201).send({ success: true, data: { id: client.id, isExisting: false } });
  });

  fastify.post("/public/appointments", { config: { rateLimit: PUBLIC_RATE_LIMIT } }, async (req: any, reply) => {
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

    // Horário de Brasília; conferência (habilitado, jornada, choque) e gravação sob a trava do profissional,
    // como na agenda interna (agenda-rules).
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date)) || !/^\d{2}:\d{2}$/.test(String(time)))
      return reply.status(400).send({ success: false, error: "Data ou horario invalido" });
    const scheduledAt = localToUtc(date, time);
    const endsAt = new Date(scheduledAt.getTime() + service.durationMinutes * 60000);
    let appointment: any;
    try {
      appointment = await db.transaction(async (tx) => {
        await lockProfessional(tx, tenant.id, professional.id);
        await checkAgendaRules(tx, { tenantId: tenant.id, professionalId: professional.id, scheduledAt, endsAt,
          services: [{ serviceId: service.id, professionalId: professional.id }] });
        const [a] = await tx.insert(appointments).values({
          tenantId: tenant.id, clientId: client.id, professionalId: professional.id,
          status: "pending", scheduledAt, endsAt,
          durationMinutes: service.durationMinutes, totalPrice: service.price,
          subtotal: service.price, source: "online_booking", clientNotes: clientNotes ?? null,
        }).returning();
        await tx.insert(appointmentServices).values({
          tenantId: tenant.id, appointmentId: a.id, serviceId: service.id,
          professionalId: professional.id, price: service.price,
          durationMinutes: service.durationMinutes, total: service.price,
        });
        return a;
      });
    } catch (e) {
      if (e instanceof AgendaRuleError) {
        const error = e.code === "SCHEDULE_CONFLICT" ? "Horario indisponivel. Por favor escolha outro horario." : e.message;
        return reply.status(e.status).send({ success: false, code: e.code, error });
      }
      throw e;
    }


    // Confirmação: no máximo 1 e-mail e 1 WhatsApp (antes saíam 3 WhatsApps); uma falha não impede a outra.
    // Dados de teste: cliente de teste não recebe confirmação (nem e-mail nem WhatsApp).
    if (!(await isTestClient(db, clientId))) {
      const [clientData] = await db.select({ email: clients.email, fullName: clients.fullName, whatsapp: clients.whatsapp })
        .from(clients).where(eq(clients.id, clientId));
      const [tenantData] = await db.select({ name: tenants.name }).from(tenants).where(eq(tenants.id, tenant.id));
      const [proData] = await db.select({ fullName: professionals.fullName })
        .from(professionals).where(eq(professionals.id, professionalId));
      // Data do dia escolhido (Brasília); scheduledAt está em UTC e mudaria de dia depois das 21h.
      const dateStr = String(date).split("-").reverse().join("/");

      // E-mail e WhatsApp em paralelo e independentes: erro ou demora de um não segura o outro.
      const envioEmail = async () => {
        if (!clientData?.email) return;
        const { sendAppointmentReminderEmail } = await import("../resend.module.js");
        await sendAppointmentReminderEmail({
          to: clientData.email,
          clientName: clientData.fullName ?? "Cliente",
          tenantName: tenantData?.name ?? "Salao",
          serviceName: service.name,
          date: dateStr,
          time: time,
          professionalName: proData?.fullName ?? undefined,
          pending: appointment.status === "pending",
          ref: { tenantId: tenant.id, clientId: client.id, referenceId: appointment.id },
        });
      };
      const envioWhatsapp = async () => {
        if (!clientData?.whatsapp) return;
        const { sendTextMessage } = await import("../whatsapp/whatsapp.service.js");
        let waNumber = clientData.whatsapp.replace(/\D/g, "");
        if (waNumber.length === 10 || waNumber.length === 11) waNumber = "55" + waNumber;
        await sendTextMessage(waNumber, bookingMessage({
          pending: appointment.status === "pending", clientName: clientData.fullName, date: dateStr, time,
          serviceName: service.name, professionalName: proData?.fullName, tenantName: tenantData?.name,
        }), tenant.id);
      };
      const [email, whatsapp] = await Promise.allSettled([envioEmail(), envioWhatsapp()]);
      if (email.status === "rejected") console.error("[BOOKING] Erro ao enviar e-mail de confirmacao:", email.reason?.message);
      if (whatsapp.status === "rejected") console.error("[BOOKING] Erro ao enviar WhatsApp de confirmacao:", whatsapp.reason?.message);
    }

    return reply.status(201).send({
      success: true,
      data: { ...appointment, serviceName: service.name },
      message: "Agendamento realizado com sucesso! Aguarde a confirmacao.",
    });
  });
}


