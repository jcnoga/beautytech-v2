import type { FastifyInstance } from "fastify";
import { eq, and, isNull, gte, lte, sql } from "drizzle-orm";
import { db } from "@db/connection";
import {
  tenants,
  salonProfile,
  portfolioImages,
  promotions,
  reviews,
  clients,
  professionals,
} from "@db/schema/index";

export async function salonProfilePublicModule(fastify: FastifyInstance) {
  // ────────────────────────────────────────────────
  // GET /public/tenants/:slug/salon-profile
  // Dados da vitrine: tagline, descrição, capa, contatos
  // ────────────────────────────────────────────────
  fastify.get("/public/tenants/:slug/salon-profile", async (req: any, reply) => {
    const [tenant] = await db
      .select({ id: tenants.id })
      .from(tenants)
      .where(and(eq(tenants.slug, req.params.slug), eq(tenants.isActive, true), isNull(tenants.deletedAt)));

    if (!tenant) {
      return reply.status(404).send({ success: false, error: "Estabelecimento nao encontrado" });
    }

    const [profile] = await db
      .select({
        tagline: salonProfile.tagline,
        description: salonProfile.description,
        coverImageUrl: salonProfile.coverImageUrl,
        instagramUrl: salonProfile.instagramUrl,
        whatsappNumber: salonProfile.whatsappNumber,
        addressFull: salonProfile.addressFull,
        isPremiumEnabled: salonProfile.isPremiumEnabled,
      })
      .from(salonProfile)
      .where(eq(salonProfile.tenantId, tenant.id));

    // Fallback: se o tenant nao tiver salon_profile criado ainda,
    // retorna vitrine desabilitada em vez de erro 404
    if (!profile) {
      return reply.send({
        success: true,
        data: {
          tagline: null,
          description: null,
          coverImageUrl: null,
          instagramUrl: null,
          whatsappNumber: null,
          addressFull: null,
          isPremiumEnabled: false,
        },
      });
    }

    return reply.send({ success: true, data: profile });
  });

  // ────────────────────────────────────────────────
  // GET /public/tenants/:slug/portfolio
  // Fotos de trabalhos realizados, com nome do profissional
  // ────────────────────────────────────────────────
  fastify.get("/public/tenants/:slug/portfolio", async (req: any, reply) => {
    const [tenant] = await db
      .select({ id: tenants.id })
      .from(tenants)
      .where(and(eq(tenants.slug, req.params.slug), eq(tenants.isActive, true), isNull(tenants.deletedAt)));

    if (!tenant) {
      return reply.status(404).send({ success: false, error: "Estabelecimento nao encontrado" });
    }

    const data = await db
      .select({
        id: portfolioImages.id,
        imageUrl: portfolioImages.imageUrl,
        caption: portfolioImages.caption,
        category: portfolioImages.category,
        sortOrder: portfolioImages.sortOrder,
        professionalName: professionals.fullName,
      })
      .from(portfolioImages)
      .leftJoin(professionals, eq(portfolioImages.professionalId, professionals.id))
      .where(eq(portfolioImages.tenantId, tenant.id))
      .orderBy(portfolioImages.sortOrder);

    return reply.send({ success: true, data, total: data.length });
  });

  // ────────────────────────────────────────────────
  // GET /public/tenants/:slug/testimonials
  // Avaliacoes aprovadas e marcadas como publicas
  // ────────────────────────────────────────────────
  fastify.get("/public/tenants/:slug/testimonials", async (req: any, reply) => {
    const [tenant] = await db
      .select({ id: tenants.id })
      .from(tenants)
      .where(and(eq(tenants.slug, req.params.slug), eq(tenants.isActive, true), isNull(tenants.deletedAt)));

    if (!tenant) {
      return reply.status(404).send({ success: false, error: "Estabelecimento nao encontrado" });
    }

    const data = await db
      .select({
        id: reviews.id,
        rating: reviews.rating,
        comment: reviews.comment,
        createdAt: reviews.createdAt,
        clientName: clients.fullName,
      })
      .from(reviews)
      .innerJoin(clients, eq(reviews.clientId, clients.id))
      .where(and(
        eq(reviews.tenantId, tenant.id),
        eq(reviews.status, "published"),
        eq(reviews.isPublic, true),
      ))
      .orderBy(reviews.createdAt);

    return reply.send({ success: true, data, total: data.length });
  });

  // ────────────────────────────────────────────────
  // GET /public/tenants/:slug/promotions
  // Apenas promocoes ativas e dentro da validade
  // ────────────────────────────────────────────────
  fastify.get("/public/tenants/:slug/promotions", async (req: any, reply) => {
    const [tenant] = await db
      .select({ id: tenants.id })
      .from(tenants)
      .where(and(eq(tenants.slug, req.params.slug), eq(tenants.isActive, true), isNull(tenants.deletedAt)));

    if (!tenant) {
      return reply.status(404).send({ success: false, error: "Estabelecimento nao encontrado" });
    }

    const now = new Date();

    const data = await db
      .select({
        id: promotions.id,
        title: promotions.title,
        description: promotions.description,
        discountType: promotions.discountType,
        discountValue: promotions.discountValue,
        validUntil: promotions.validUntil,
      })
      .from(promotions)
      .where(and(
        eq(promotions.tenantId, tenant.id),
        eq(promotions.isActive, true),
        lte(promotions.validFrom, now),
        gte(promotions.validUntil, now),
      ));

    return reply.send({ success: true, data, total: data.length });
  });

  // ------------------------------------------------------------
  // GET /public/my-appointments?whatsapp=...
  // Lista agendamentos de um cliente em qualquer tenant, pelo WhatsApp
  // ------------------------------------------------------------
  fastify.get("/public/my-appointments", async (req: any, reply) => {
    const raw = (req.query?.whatsapp || "").toString();
    const digits = raw.replace(/\D/g, "");
    if (!digits || digits.length < 8) {
      return reply.status(400).send({ success: false, error: "Informe um WhatsApp valido" });
    }
    const result: any = await db.execute(sql`
      SELECT
        a.id,
        a.scheduled_at   AS "scheduledAt",
        a.status         AS "status",
        t.name            AS "tenantName",
        t.slug            AS "tenantSlug",
        p.full_name       AS "professionalName",
        string_agg(s.name, ', ') AS "serviceNames"
      FROM appointments a
      JOIN clients c        ON c.id = a.client_id
      JOIN tenants t        ON t.id = a.tenant_id
      LEFT JOIN professionals p        ON p.id = a.professional_id
      LEFT JOIN appointment_services aps ON aps.appointment_id = a.id
      LEFT JOIN services s             ON s.id = aps.service_id
      WHERE regexp_replace(c.whatsapp, '\D', '', 'g') = ${digits}
      GROUP BY a.id, a.scheduled_at, a.status, t.name, t.slug, p.full_name
      ORDER BY a.scheduled_at DESC
      LIMIT 100
    `);
    const rows = Array.isArray(result) ? result : (result.rows ?? []);
    return reply.send({ success: true, data: rows });
  });
}
