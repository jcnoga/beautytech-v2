// ============================================================
// BEAUTYTECH v2 — Módulos Backend Completos
// clients | professionals | appointments | services |
// packages | financial | commissions | dashboard |
// crm | loyalty | campaigns | products
// ============================================================

import type { FastifyInstance } from "fastify";
import { eq, and, ilike, isNull, desc, gte, lte, sql, count } from "drizzle-orm";
import { db } from "@db/connection";
import {
  clients, professionals, appointments, appointmentServices,
  services, serviceCategories, packages, giftCards,
  financialTransactions, financialAccounts, financialCategories,
  commissions, goals, loyaltyTransactions, referrals,
  leads, campaigns, messageTemplates, notifications,
  products, productCategories, suppliers, stockMovements,
  reviews, auditLogs, tenants, userProfiles,
} from "@db/schema/index";
import { authenticate, requireOwner, requireManager, requireFinancial } from "@middleware/auth";

// ─── HELPER ──────────────────────────────────────────────────
function paginate(page = 1, limit = 20) {
  return { limit: Number(limit), offset: (Number(page) - 1) * Number(limit) };
}

// ─────────────────────────────────────────────────────────────
// CLIENTS MODULE
// ─────────────────────────────────────────────────────────────
export async function clientsModule(fastify: FastifyInstance) {

  fastify.get("/clients", { preHandler: [authenticate] }, async (req: any, reply) => {
    const { tenantId } = req.tenantContext;
    const { page, limit, search, segment, isVip, isActive } = req.query as any;
    const { limit: l, offset } = paginate(page, limit);
    const cond = [eq(clients.tenantId, tenantId), isNull(clients.deletedAt)];
    if (search) cond.push(ilike(clients.fullName, `%${search}%`));
    if (segment) cond.push(eq(clients.segment, segment));
    if (isVip !== undefined) cond.push(eq(clients.isVip, isVip === "true"));
    if (isActive !== undefined) cond.push(eq(clients.isActive, isActive === "true"));
    const [data, [{ total }]] = await Promise.all([
      db.select().from(clients).where(and(...cond)).orderBy(desc(clients.createdAt)).limit(l).offset(offset),
      db.select({ total: sql<number>`count(*)` }).from(clients).where(and(...cond)),
    ]);
    return reply.send({ success: true, data, total: Number(total), page: Number(page ?? 1), limit: l, totalPages: Math.ceil(Number(total) / l) });
  });

  fastify.get("/clients/birthdays", { preHandler: [authenticate] }, async (req: any, reply) => {
    const { tenantId } = req.tenantContext;
    const month = new Date().getMonth() + 1;
    const data = await db.select().from(clients)
      .where(and(eq(clients.tenantId, tenantId), eq(clients.isActive, true), isNull(clients.deletedAt), sql`EXTRACT(MONTH FROM ${clients.birthDate}) = ${month}`))
      .orderBy(sql`EXTRACT(DAY FROM ${clients.birthDate})`);
    return reply.send({ success: true, data, total: data.length });
  });

  fastify.get("/clients/at-risk", { preHandler: [authenticate] }, async (req: any, reply) => {
    const { tenantId } = req.tenantContext;
    const data = await db.select().from(clients)
      .where(and(eq(clients.tenantId, tenantId), eq(clients.segment, "at_risk"), eq(clients.isActive, true), isNull(clients.deletedAt)))
      .orderBy(clients.lastVisitAt).limit(50);
    return reply.send({ success: true, data, total: data.length });
  });

  fastify.get("/clients/:id", { preHandler: [authenticate] }, async (req: any, reply) => {
    const { tenantId } = req.tenantContext;
    const [client] = await db.select().from(clients)
      .where(and(eq(clients.id, req.params.id), eq(clients.tenantId, tenantId), isNull(clients.deletedAt)));
    if (!client) return reply.status(404).send({ success: false, error: "Cliente não encontrado" });
    return reply.send({ success: true, data: client });
  });

  fastify.post("/clients", { preHandler: [authenticate] }, async (req: any, reply) => {
    const { tenantId, userId } = req.tenantContext;
    const [client] = await db.insert(clients).values({ ...req.body, tenantId, createdBy: userId, updatedBy: userId }).returning();
    return reply.status(201).send({ success: true, data: client });
  });

  fastify.patch("/clients/:id", { preHandler: [authenticate] }, async (req: any, reply) => {
    const { tenantId, userId } = req.tenantContext;
    const [client] = await db.update(clients)
      .set({ ...req.body, updatedBy: userId, updatedAt: new Date() })
      .where(and(eq(clients.id, req.params.id), eq(clients.tenantId, tenantId)))
      .returning();
    if (!client) return reply.status(404).send({ success: false, error: "Cliente não encontrado" });
    return reply.send({ success: true, data: client });
  });

  fastify.delete("/clients/:id", { preHandler: [authenticate] }, async (req: any, reply) => {
    const { tenantId, userId } = req.tenantContext;
    await db.update(clients).set({ deletedAt: new Date(), updatedBy: userId })
      .where(and(eq(clients.id, req.params.id), eq(clients.tenantId, tenantId)));
    return reply.status(204).send();
  });
}

// ─────────────────────────────────────────────────────────────
// PROFESSIONALS MODULE
// ─────────────────────────────────────────────────────────────
export async function professionalsModule(fastify: FastifyInstance) {

  fastify.get("/professionals", { preHandler: [authenticate] }, async (req: any, reply) => {
    const { tenantId } = req.tenantContext;
    const { isActive } = req.query as any;
    const cond = [eq(professionals.tenantId, tenantId), isNull(professionals.deletedAt)];
    if (isActive !== undefined) cond.push(eq(professionals.isActive, isActive === "true"));
    const data = await db.select().from(professionals).where(and(...cond)).orderBy(professionals.sortOrder);
    return reply.send({ success: true, data, total: data.length });
  });

  fastify.get("/professionals/:id", { preHandler: [authenticate] }, async (req: any, reply) => {
    const { tenantId } = req.tenantContext;
    const [prof] = await db.select().from(professionals)
      .where(and(eq(professionals.id, req.params.id), eq(professionals.tenantId, tenantId)));
    if (!prof) return reply.status(404).send({ success: false, error: "Profissional não encontrado" });
    return reply.send({ success: true, data: prof });
  });

  fastify.post("/professionals", { preHandler: [authenticate, requireManager] }, async (req: any, reply) => {
    const { tenantId, userId } = req.tenantContext;
    const [prof] = await db.insert(professionals).values({ ...req.body, tenantId, createdBy: userId, updatedBy: userId }).returning();
    return reply.status(201).send({ success: true, data: prof });
  });

  fastify.patch("/professionals/:id", { preHandler: [authenticate, requireManager] }, async (req: any, reply) => {
    const { tenantId, userId } = req.tenantContext;
    const [prof] = await db.update(professionals)
      .set({ ...req.body, updatedBy: userId, updatedAt: new Date() })
      .where(and(eq(professionals.id, req.params.id), eq(professionals.tenantId, tenantId)))
      .returning();
    return reply.send({ success: true, data: prof });
  });

  fastify.delete("/professionals/:id", { preHandler: [authenticate, requireOwner] }, async (req: any, reply) => {
    const { tenantId, userId } = req.tenantContext;
    await db.update(professionals).set({ deletedAt: new Date(), updatedBy: userId })
      .where(and(eq(professionals.id, req.params.id), eq(professionals.tenantId, tenantId)));
    return reply.status(204).send();
  });

  // Comissões do profissional
  fastify.get("/professionals/:id/commissions", { preHandler: [authenticate] }, async (req: any, reply) => {
    const { tenantId } = req.tenantContext;
    const { month } = req.query as any;
    const cond = [eq(commissions.tenantId, tenantId), eq(commissions.professionalId, req.params.id)];
    if (month) cond.push(eq(commissions.referenceMonth, month));
    const data = await db.select().from(commissions).where(and(...cond)).orderBy(desc(commissions.createdAt));
    const total = data.reduce((s, c) => s + Number(c.commissionAmt), 0);
    return reply.send({ success: true, data, total: data.length, totalAmount: total });
  });
}

// ─────────────────────────────────────────────────────────────
// APPOINTMENTS MODULE
// ─────────────────────────────────────────────────────────────
export async function appointmentsModule(fastify: FastifyInstance) {

  fastify.get("/appointments", { preHandler: [authenticate] }, async (req: any, reply) => {
    const { tenantId } = req.tenantContext;
    const { page, limit, date, dateFrom, dateTo, clientId, professionalId, status } = req.query as any;
    const { limit: l, offset } = paginate(page, limit);
    const cond = [eq(appointments.tenantId, tenantId), isNull(appointments.deletedAt)];
    if (date) {
      const d = new Date(date);
      const s = new Date(d); s.setHours(0,0,0,0);
      const e = new Date(d); e.setHours(23,59,59,999);
      cond.push(gte(appointments.scheduledAt, s), lte(appointments.scheduledAt, e));
    }
    if (dateFrom) cond.push(gte(appointments.scheduledAt, new Date(dateFrom)));
    if (dateTo)   cond.push(lte(appointments.scheduledAt, new Date(dateTo)));
    if (clientId)       cond.push(eq(appointments.clientId, clientId));
    if (professionalId) cond.push(eq(appointments.professionalId, professionalId));
    if (status)         cond.push(eq(appointments.status, status));
    const [data, [{ total }]] = await Promise.all([
      db.select().from(appointments).where(and(...cond)).orderBy(appointments.scheduledAt).limit(l).offset(offset),
      db.select({ total: sql<number>`count(*)` }).from(appointments).where(and(...cond)),
    ]);
    return reply.send({ success: true, data, total: Number(total), page: Number(page ?? 1), limit: l, totalPages: Math.ceil(Number(total) / l) });
  });

  fastify.get("/appointments/today", { preHandler: [authenticate] }, async (req: any, reply) => {
    const { tenantId } = req.tenantContext;
    const s = new Date(); s.setHours(0,0,0,0);
    const e = new Date(); e.setHours(23,59,59,999);
    const data = await db.select({
      appointment: appointments,
      client: { id: clients.id, fullName: clients.fullName, whatsapp: clients.whatsapp, phone: clients.phone, loyaltyTier: clients.loyaltyTier, isVip: clients.isVip },
      professional: { id: professionals.id, fullName: professionals.fullName, displayName: professionals.displayName, color: professionals.color },
    })
    .from(appointments)
    .leftJoin(clients, eq(appointments.clientId, clients.id))
    .leftJoin(professionals, eq(appointments.professionalId, professionals.id))
    .where(and(eq(appointments.tenantId, tenantId), gte(appointments.scheduledAt, s), lte(appointments.scheduledAt, e), isNull(appointments.deletedAt)))
    .orderBy(appointments.scheduledAt);
    return reply.send({ success: true, data, total: data.length });
  });

  fastify.post("/appointments", { preHandler: [authenticate] }, async (req: any, reply) => {
    const { tenantId, userId } = req.tenantContext;
  const { services: svcs, ...body } = req.body as any;
const values = {
  ...body,
  tenantId,
  createdBy:      userId,
  updatedBy:      userId,
  scheduledAt:    new Date(body.scheduledAt),
  endsAt:         new Date(body.endsAt),
};
const [appt] = await db.insert(appointments).values(values).returning();
    if (svcs?.length) {
      await db.insert(appointmentServices).values(svcs.map((s: any) => ({ ...s, appointmentId: appt.id, tenantId })));
    }
    return reply.status(201).send({ success: true, data: appt });
  });

  fastify.patch("/appointments/:id", { preHandler: [authenticate] }, async (req: any, reply) => {
    const { tenantId, userId } = req.tenantContext;
    const [appt] = await db.update(appointments)
      .set({ ...req.body, updatedBy: userId, updatedAt: new Date() })
      .where(and(eq(appointments.id, req.params.id), eq(appointments.tenantId, tenantId)))
      .returning();
    return reply.send({ success: true, data: appt });
  });

  fastify.post("/appointments/:id/confirm", { preHandler: [authenticate] }, async (req: any, reply) => {
    const { tenantId, userId } = req.tenantContext;
    const [appt] = await db.update(appointments)
      .set({ status: "confirmed", confirmedAt: new Date(), updatedBy: userId, updatedAt: new Date() })
      .where(and(eq(appointments.id, req.params.id), eq(appointments.tenantId, tenantId)))
      .returning();
    return reply.send({ success: true, data: appt });
  });

  fastify.post("/appointments/:id/checkin", { preHandler: [authenticate] }, async (req: any, reply) => {
    const { tenantId, userId } = req.tenantContext;
    const [appt] = await db.update(appointments)
      .set({ status: "in_progress", checkinAt: new Date(), updatedBy: userId, updatedAt: new Date() })
      .where(and(eq(appointments.id, req.params.id), eq(appointments.tenantId, tenantId)))
      .returning();
    return reply.send({ success: true, data: appt });
  });

  fastify.post("/appointments/:id/complete", { preHandler: [authenticate] }, async (req: any, reply) => {
    const { tenantId, userId } = req.tenantContext;
    const { paymentMethod, amountPaid } = req.body as any;
    const [appt] = await db.update(appointments)
      .set({ status: "completed", checkoutAt: new Date(), paymentMethod, amountPaid, paymentStatus: "confirmed", updatedBy: userId, updatedAt: new Date() })
      .where(and(eq(appointments.id, req.params.id), eq(appointments.tenantId, tenantId)))
      .returning();
    return reply.send({ success: true, data: appt });
  });

  fastify.post("/appointments/:id/cancel", { preHandler: [authenticate] }, async (req: any, reply) => {
    const { tenantId, userId } = req.tenantContext;
    const { reason } = req.body as any;
    const [appt] = await db.update(appointments)
      .set({ status: "cancelled", cancelledAt: new Date(), cancellationReason: reason, updatedBy: userId, updatedAt: new Date() })
      .where(and(eq(appointments.id, req.params.id), eq(appointments.tenantId, tenantId)))
      .returning();
    return reply.send({ success: true, data: appt });
  });

  fastify.post("/appointments/:id/no-show", { preHandler: [authenticate] }, async (req: any, reply) => {
    const { tenantId, userId } = req.tenantContext;
    const [appt] = await db.update(appointments)
      .set({ status: "no_show", updatedBy: userId, updatedAt: new Date() })
      .where(and(eq(appointments.id, req.params.id), eq(appointments.tenantId, tenantId)))
      .returning();
    return reply.send({ success: true, data: appt });
  });
}

// ─────────────────────────────────────────────────────────────
// SERVICES MODULE
// ─────────────────────────────────────────────────────────────
export async function servicesModule(fastify: FastifyInstance) {
  fastify.get("/services", { preHandler: [authenticate] }, async (req: any, reply) => {
    const { tenantId } = req.tenantContext;
    const { isActive, categoryId } = req.query as any;
    const cond = [eq(services.tenantId, tenantId), isNull(services.deletedAt)];
    if (isActive !== undefined) cond.push(eq(services.isActive, isActive === "true"));
    if (categoryId) cond.push(eq(services.categoryId, categoryId));
    const data = await db.select().from(services).where(and(...cond)).orderBy(services.sortOrder);
    return reply.send({ success: true, data, total: data.length });
  });

  fastify.post("/services", { preHandler: [authenticate, requireManager] }, async (req: any, reply) => {
    const { tenantId, userId } = req.tenantContext;
    const [service] = await db.insert(services).values({ ...req.body, tenantId, createdBy: userId, updatedBy: userId }).returning();
    return reply.status(201).send({ success: true, data: service });
  });

  fastify.patch("/services/:id", { preHandler: [authenticate, requireManager] }, async (req: any, reply) => {
    const { tenantId, userId } = req.tenantContext;
    const [service] = await db.update(services)
      .set({ ...req.body, updatedBy: userId, updatedAt: new Date() })
      .where(and(eq(services.id, req.params.id), eq(services.tenantId, tenantId)))
      .returning();
    return reply.send({ success: true, data: service });
  });

  fastify.delete("/services/:id", { preHandler: [authenticate, requireManager] }, async (req: any, reply) => {
    const { tenantId, userId } = req.tenantContext;
    await db.update(services).set({ deletedAt: new Date(), updatedBy: userId })
      .where(and(eq(services.id, req.params.id), eq(services.tenantId, tenantId)));
    return reply.status(204).send();
  });

  fastify.get("/service-categories", { preHandler: [authenticate] }, async (req: any, reply) => {
    const { tenantId } = req.tenantContext;
    const data = await db.select().from(serviceCategories)
      .where(and(eq(serviceCategories.tenantId, tenantId), eq(serviceCategories.isActive, true)))
      .orderBy(serviceCategories.sortOrder);
    return reply.send({ success: true, data });
  });
}

// ─────────────────────────────────────────────────────────────
// PACKAGES MODULE
// ─────────────────────────────────────────────────────────────
export async function packagesModule(fastify: FastifyInstance) {
  fastify.get("/packages", { preHandler: [authenticate] }, async (req: any, reply) => {
    const { tenantId } = req.tenantContext;
    const { clientId, status } = req.query as any;
    const cond = [eq(packages.tenantId, tenantId), isNull(packages.deletedAt)];
    if (clientId) cond.push(eq(packages.clientId, clientId));
    if (status)   cond.push(eq(packages.status, status));
    const data = await db.select().from(packages).where(and(...cond)).orderBy(desc(packages.createdAt));
    return reply.send({ success: true, data, total: data.length });
  });

  fastify.post("/packages", { preHandler: [authenticate] }, async (req: any, reply) => {
    const { tenantId, userId } = req.tenantContext;
    const body = req.body as any;
    const [pkg] = await db.insert(packages).values({
      ...body, tenantId, createdBy: userId, updatedBy: userId,
      remainingSessions: body.totalSessions,
    }).returning();
    return reply.status(201).send({ success: true, data: pkg });
  });

  fastify.post("/packages/:id/use-session", { preHandler: [authenticate] }, async (req: any, reply) => {
    const { tenantId, userId } = req.tenantContext;
    const [pkg] = await db.select().from(packages)
      .where(and(eq(packages.id, req.params.id), eq(packages.tenantId, tenantId)));
    if (!pkg || pkg.remainingSessions <= 0) {
      return reply.status(400).send({ success: false, error: "Pacote sem sessões disponíveis" });
    }
    const [updated] = await db.update(packages)
      .set({ usedSessions: pkg.usedSessions + 1, remainingSessions: pkg.remainingSessions - 1, updatedBy: userId, updatedAt: new Date(), status: pkg.remainingSessions - 1 === 0 ? "completed" : "active" })
      .where(eq(packages.id, pkg.id))
      .returning();
    return reply.send({ success: true, data: updated });
  });
}

// ─────────────────────────────────────────────────────────────
// FINANCIAL MODULE
// ─────────────────────────────────────────────────────────────
export async function financialModule(fastify: FastifyInstance) {
  fastify.get("/financial", { preHandler: [authenticate, requireFinancial] }, async (req: any, reply) => {
    const { tenantId } = req.tenantContext;
    const { page, limit, type, status, dateFrom, dateTo } = req.query as any;
    const { limit: l, offset } = paginate(page, limit);
    const cond = [eq(financialTransactions.tenantId, tenantId), isNull(financialTransactions.deletedAt)];
    if (type)     cond.push(eq(financialTransactions.type, type));
    if (status)   cond.push(eq(financialTransactions.status, status));
    if (dateFrom) cond.push(gte(financialTransactions.dueDate, dateFrom));
    if (dateTo)   cond.push(lte(financialTransactions.dueDate, dateTo));
    const [data, [{ total }]] = await Promise.all([
      db.select().from(financialTransactions).where(and(...cond)).orderBy(desc(financialTransactions.dueDate)).limit(l).offset(offset),
      db.select({ total: sql<number>`count(*)` }).from(financialTransactions).where(and(...cond)),
    ]);
    return reply.send({ success: true, data, total: Number(total), page: Number(page ?? 1), limit: l, totalPages: Math.ceil(Number(total) / l) });
  });

  fastify.get("/financial/summary", { preHandler: [authenticate, requireFinancial] }, async (req: any, reply) => {
    const { tenantId } = req.tenantContext;
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    const to   = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];
    const [revenue, expenses] = await Promise.all([
      db.select({ total: sql<number>`coalesce(sum(amount), 0)` }).from(financialTransactions)
        .where(and(eq(financialTransactions.tenantId, tenantId), eq(financialTransactions.type, "revenue"), eq(financialTransactions.status, "confirmed"), gte(financialTransactions.dueDate, from), lte(financialTransactions.dueDate, to))),
      db.select({ total: sql<number>`coalesce(sum(amount), 0)` }).from(financialTransactions)
        .where(and(eq(financialTransactions.tenantId, tenantId), eq(financialTransactions.type, "expense"), eq(financialTransactions.status, "confirmed"), gte(financialTransactions.dueDate, from), lte(financialTransactions.dueDate, to))),
    ]);
    const rev = Number(revenue[0]?.total ?? 0);
    const exp = Number(expenses[0]?.total ?? 0);
    return reply.send({ success: true, data: { revenue: rev, expenses: exp, profit: rev - exp, margin: rev > 0 ? ((rev - exp) / rev) * 100 : 0 } });
  });

  fastify.post("/financial", { preHandler: [authenticate, requireFinancial] }, async (req: any, reply) => {
    const { tenantId, userId } = req.tenantContext;
    const [tx] = await db.insert(financialTransactions).values({ ...req.body, tenantId, createdBy: userId, updatedBy: userId }).returning();
    return reply.status(201).send({ success: true, data: tx });
  });

  fastify.patch("/financial/:id", { preHandler: [authenticate, requireFinancial] }, async (req: any, reply) => {
    const { tenantId, userId } = req.tenantContext;
    const [tx] = await db.update(financialTransactions)
      .set({ ...req.body, updatedBy: userId, updatedAt: new Date() })
      .where(and(eq(financialTransactions.id, req.params.id), eq(financialTransactions.tenantId, tenantId)))
      .returning();
    return reply.send({ success: true, data: tx });
  });

  fastify.post("/financial/:id/confirm-payment", { preHandler: [authenticate, requireFinancial] }, async (req: any, reply) => {
    const { tenantId, userId } = req.tenantContext;
    const { paymentMethod } = req.body as any;
    const [tx] = await db.update(financialTransactions)
      .set({ status: "confirmed", paidAt: new Date(), paymentMethod, updatedBy: userId, updatedAt: new Date() })
      .where(and(eq(financialTransactions.id, req.params.id), eq(financialTransactions.tenantId, tenantId)))
      .returning();
    return reply.send({ success: true, data: tx });
  });

  fastify.get("/financial/accounts", { preHandler: [authenticate] }, async (req: any, reply) => {
    const { tenantId } = req.tenantContext;
    const data = await db.select().from(financialAccounts).where(and(eq(financialAccounts.tenantId, tenantId), eq(financialAccounts.isActive, true)));
    return reply.send({ success: true, data });
  });

  fastify.get("/financial/categories", { preHandler: [authenticate] }, async (req: any, reply) => {
    const { tenantId } = req.tenantContext;
    const { type } = req.query as any;
    const cond = [eq(financialCategories.tenantId, tenantId), eq(financialCategories.isActive, true)];
    if (type) cond.push(eq(financialCategories.type, type));
    const data = await db.select().from(financialCategories).where(and(...cond));
    return reply.send({ success: true, data });
  });
}

// ─────────────────────────────────────────────────────────────
// COMMISSIONS MODULE
// ─────────────────────────────────────────────────────────────
export async function commissionsModule(fastify: FastifyInstance) {
  fastify.get("/commissions", { preHandler: [authenticate, requireFinancial] }, async (req: any, reply) => {
    const { tenantId } = req.tenantContext;
    const { professionalId, month, isPaid } = req.query as any;
    const cond = [eq(commissions.tenantId, tenantId)];
    if (professionalId) cond.push(eq(commissions.professionalId, professionalId));
    if (month) cond.push(eq(commissions.referenceMonth, month));
    if (isPaid !== undefined) cond.push(eq(commissions.isPaid, isPaid === "true"));
    const data = await db.select().from(commissions).where(and(...cond)).orderBy(desc(commissions.createdAt));
    const totalAmt = data.reduce((s, c) => s + Number(c.commissionAmt), 0);
    return reply.send({ success: true, data, total: data.length, totalAmount: totalAmt });
  });

  fastify.post("/commissions/:id/pay", { preHandler: [authenticate, requireFinancial] }, async (req: any, reply) => {
    const { tenantId } = req.tenantContext;
    const [commission] = await db.update(commissions)
      .set({ isPaid: true, paidAt: new Date() })
      .where(and(eq(commissions.id, req.params.id), eq(commissions.tenantId, tenantId)))
      .returning();
    return reply.send({ success: true, data: commission });
  });

  fastify.get("/goals", { preHandler: [authenticate] }, async (req: any, reply) => {
    const { tenantId } = req.tenantContext;
    const { professionalId, status } = req.query as any;
    const cond = [eq(goals.tenantId, tenantId), isNull(goals.deletedAt)];
    if (professionalId) cond.push(eq(goals.professionalId, professionalId));
    if (status) cond.push(eq(goals.status, status));
    const data = await db.select().from(goals).where(and(...cond)).orderBy(desc(goals.createdAt));
    return reply.send({ success: true, data });
  });

  fastify.post("/goals", { preHandler: [authenticate, requireManager] }, async (req: any, reply) => {
    const { tenantId, userId } = req.tenantContext;
    const [goal] = await db.insert(goals).values({ ...req.body, tenantId, createdBy: userId, updatedBy: userId }).returning();
    return reply.status(201).send({ success: true, data: goal });
  });
}

// ─────────────────────────────────────────────────────────────
// DASHBOARD MODULE
// ─────────────────────────────────────────────────────────────
export async function dashboardModule(fastify: FastifyInstance) {
  fastify.get("/dashboard/kpis", { preHandler: [authenticate] }, async (req: any, reply) => {
    const { tenantId } = req.tenantContext;
    const now = new Date();
    const startDay   = new Date(now); startDay.setHours(0,0,0,0);
    const endDay     = new Date(now); endDay.setHours(23,59,59,999);
    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endMonth   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const startPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endPrevMonth   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    const from = startMonth.toISOString().split("T")[0];
    const to   = endMonth.toISOString().split("T")[0];
    const fromPrev = startPrevMonth.toISOString().split("T")[0];
    const toPrev   = endPrevMonth.toISOString().split("T")[0];

    const [apptToday, apptMonth, activeClients, revenueMonth, revenuePrev, avgTicket] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(appointments)
        .where(and(eq(appointments.tenantId, tenantId), gte(appointments.scheduledAt, startDay), lte(appointments.scheduledAt, endDay), isNull(appointments.deletedAt))),
      db.select({ count: sql<number>`count(*)` }).from(appointments)
        .where(and(eq(appointments.tenantId, tenantId), eq(appointments.status, "completed"), gte(appointments.scheduledAt, startMonth), lte(appointments.scheduledAt, endMonth))),
      db.select({ count: sql<number>`count(*)` }).from(clients)
        .where(and(eq(clients.tenantId, tenantId), eq(clients.isActive, true), isNull(clients.deletedAt))),
      db.select({ total: sql<number>`coalesce(sum(amount), 0)` }).from(financialTransactions)
        .where(and(eq(financialTransactions.tenantId, tenantId), eq(financialTransactions.type, "revenue"), eq(financialTransactions.status, "confirmed"), gte(financialTransactions.dueDate, from), lte(financialTransactions.dueDate, to))),
      db.select({ total: sql<number>`coalesce(sum(amount), 0)` }).from(financialTransactions)
        .where(and(eq(financialTransactions.tenantId, tenantId), eq(financialTransactions.type, "revenue"), eq(financialTransactions.status, "confirmed"), gte(financialTransactions.dueDate, fromPrev), lte(financialTransactions.dueDate, toPrev))),
      db.select({ avg: sql<number>`coalesce(avg(total_price), 0)` }).from(appointments)
        .where(and(eq(appointments.tenantId, tenantId), eq(appointments.status, "completed"), gte(appointments.scheduledAt, startMonth), lte(appointments.scheduledAt, endMonth))),
    ]);

    const rev  = Number(revenueMonth[0]?.total ?? 0);
    const prev = Number(revenuePrev[0]?.total ?? 0);
    return reply.send({
      success: true,
      data: {
        appointmentsToday:  Number(apptToday[0]?.count ?? 0),
        appointmentsMonth:  Number(apptMonth[0]?.count ?? 0),
        activeClients:      Number(activeClients[0]?.count ?? 0),
        revenueMonth:       rev,
        revenuePrevMonth:   prev,
        revenueGrowth:      prev > 0 ? ((rev - prev) / prev) * 100 : 0,
        averageTicket:      Number(avgTicket[0]?.avg ?? 0),
        generatedAt:        new Date().toISOString(),
      },
    });
  });

  fastify.get("/dashboard/agenda", { preHandler: [authenticate] }, async (req: any, reply) => {
    const { tenantId } = req.tenantContext;
    const now = new Date();
    const s = new Date(now); s.setHours(0,0,0,0);
    const e = new Date(now); e.setHours(23,59,59,999);
    const data = await db.select({
      appointment: appointments,
      client: { id: clients.id, fullName: clients.fullName, whatsapp: clients.whatsapp, isVip: clients.isVip, loyaltyTier: clients.loyaltyTier },
      professional: { id: professionals.id, fullName: professionals.fullName, color: professionals.color },
    })
    .from(appointments)
    .leftJoin(clients, eq(appointments.clientId, clients.id))
    .leftJoin(professionals, eq(appointments.professionalId, professionals.id))
    .where(and(eq(appointments.tenantId, tenantId), gte(appointments.scheduledAt, s), lte(appointments.scheduledAt, e), isNull(appointments.deletedAt)))
    .orderBy(appointments.scheduledAt);
    return reply.send({ success: true, data, total: data.length });
  });

  fastify.get("/dashboard/churn-risk", { preHandler: [authenticate] }, async (req: any, reply) => {
    const { tenantId } = req.tenantContext;
    const data = await db.select({
      id: clients.id, fullName: clients.fullName, whatsapp: clients.whatsapp,
      lastVisitAt: clients.lastVisitAt, totalSpent: clients.totalSpent, segment: clients.segment,
    })
    .from(clients)
    .where(and(eq(clients.tenantId, tenantId), eq(clients.segment, "at_risk"), eq(clients.isActive, true), isNull(clients.deletedAt)))
    .orderBy(clients.lastVisitAt).limit(20);
    return reply.send({ success: true, data, total: data.length });
  });

  fastify.get("/dashboard/birthdays", { preHandler: [authenticate] }, async (req: any, reply) => {
    const { tenantId } = req.tenantContext;
    const month = new Date().getMonth() + 1;
    const data = await db.select({
      id: clients.id, fullName: clients.fullName, whatsapp: clients.whatsapp, birthDate: clients.birthDate,
    })
    .from(clients)
    .where(and(eq(clients.tenantId, tenantId), eq(clients.isActive, true), isNull(clients.deletedAt), sql`EXTRACT(MONTH FROM ${clients.birthDate}) = ${month}`))
    .orderBy(sql`EXTRACT(DAY FROM ${clients.birthDate})`);
    return reply.send({ success: true, data, total: data.length });
  });

  fastify.get("/dashboard/professionals-performance", { preHandler: [authenticate] }, async (req: any, reply) => {
    const { tenantId } = req.tenantContext;
    const startMonth = new Date(); startMonth.setDate(1); startMonth.setHours(0,0,0,0);
    const data = await db.select({
      professional: { id: professionals.id, fullName: professionals.fullName, color: professionals.color, monthlyGoal: professionals.monthlyGoal },
      appointmentsMonth: sql<number>`count(${appointments.id})`,
      revenueMonth: sql<number>`coalesce(sum(${appointments.totalPrice}), 0)`,
    })
    .from(professionals)
    .leftJoin(appointments, and(
      eq(appointments.professionalId, professionals.id),
      eq(appointments.status, "completed"),
      gte(appointments.scheduledAt, startMonth),
    ))
    .where(and(eq(professionals.tenantId, tenantId), eq(professionals.isActive, true)))
    .groupBy(professionals.id)
    .orderBy(sql`coalesce(sum(${appointments.totalPrice}), 0) desc`);
    return reply.send({ success: true, data });
  });
}

// ─────────────────────────────────────────────────────────────
// CRM MODULE
// ─────────────────────────────────────────────────────────────
export async function crmModule(fastify: FastifyInstance) {
  fastify.get("/leads", { preHandler: [authenticate] }, async (req: any, reply) => {
    const { tenantId } = req.tenantContext;
    const { status } = req.query as any;
    const cond = [eq(leads.tenantId, tenantId), isNull(leads.deletedAt)];
    if (status) cond.push(eq(leads.status, status));
    const data = await db.select().from(leads).where(and(...cond)).orderBy(desc(leads.createdAt));
    return reply.send({ success: true, data, total: data.length });
  });

  fastify.post("/leads", { preHandler: [authenticate] }, async (req: any, reply) => {
    const { tenantId, userId } = req.tenantContext;
    const [lead] = await db.insert(leads).values({ ...req.body, tenantId, createdBy: userId, updatedBy: userId }).returning();
    return reply.status(201).send({ success: true, data: lead });
  });

  fastify.patch("/leads/:id", { preHandler: [authenticate] }, async (req: any, reply) => {
    const { tenantId, userId } = req.tenantContext;
    const [lead] = await db.update(leads)
      .set({ ...req.body, updatedBy: userId, updatedAt: new Date() })
      .where(and(eq(leads.id, req.params.id), eq(leads.tenantId, tenantId)))
      .returning();
    return reply.send({ success: true, data: lead });
  });

  fastify.post("/leads/:id/convert", { preHandler: [authenticate] }, async (req: any, reply) => {
    const { tenantId, userId } = req.tenantContext;
    const { clientData } = req.body as any;
    const [client] = await db.insert(clients).values({ ...clientData, tenantId, createdBy: userId, updatedBy: userId, source: "lead" }).returning();
    await db.update(leads).set({ status: "converted", convertedTo: client.id, convertedAt: new Date(), updatedBy: userId, updatedAt: new Date() })
      .where(and(eq(leads.id, req.params.id), eq(leads.tenantId, tenantId)));
    return reply.send({ success: true, data: client });
  });
}

// ─────────────────────────────────────────────────────────────
// LOYALTY MODULE
// ─────────────────────────────────────────────────────────────
export async function loyaltyModule(fastify: FastifyInstance) {
  fastify.get("/loyalty/:clientId", { preHandler: [authenticate] }, async (req: any, reply) => {
    const { tenantId } = req.tenantContext;
    const data = await db.select().from(loyaltyTransactions)
      .where(and(eq(loyaltyTransactions.clientId, req.params.clientId), eq(loyaltyTransactions.tenantId, tenantId)))
      .orderBy(desc(loyaltyTransactions.createdAt));
    const balance = data.reduce((s, t) => s + t.points, 0);
    return reply.send({ success: true, data, balance, total: data.length });
  });

  fastify.post("/loyalty/add-points", { preHandler: [authenticate] }, async (req: any, reply) => {
    const { tenantId, userId } = req.tenantContext;
    const { clientId, points, description, referenceId } = req.body as any;
    const [tx] = await db.insert(loyaltyTransactions).values({ tenantId, clientId, points, type: "earned", description, referenceId }).returning();
    await db.update(clients).set({ loyaltyPoints: sql`loyalty_points + ${points}`, updatedBy: userId, updatedAt: new Date() }).where(and(eq(clients.id, clientId), eq(clients.tenantId, tenantId)));
    return reply.status(201).send({ success: true, data: tx });
  });

  fastify.get("/referrals", { preHandler: [authenticate] }, async (req: any, reply) => {
    const { tenantId } = req.tenantContext;
    const data = await db.select().from(referrals).where(eq(referrals.tenantId, tenantId)).orderBy(desc(referrals.createdAt));
    return reply.send({ success: true, data, total: data.length });
  });
}

// ─────────────────────────────────────────────────────────────
// CAMPAIGNS MODULE
// ─────────────────────────────────────────────────────────────
export async function campaignsModule(fastify: FastifyInstance) {
  fastify.get("/campaigns", { preHandler: [authenticate] }, async (req: any, reply) => {
    const { tenantId } = req.tenantContext;
    const data = await db.select().from(campaigns)
      .where(and(eq(campaigns.tenantId, tenantId), isNull(campaigns.deletedAt)))
      .orderBy(desc(campaigns.createdAt));
    return reply.send({ success: true, data, total: data.length });
  });

  fastify.post("/campaigns", { preHandler: [authenticate] }, async (req: any, reply) => {
    const { tenantId, userId } = req.tenantContext;
    const [campaign] = await db.insert(campaigns).values({ ...req.body, tenantId, createdBy: userId, updatedBy: userId }).returning();
    return reply.status(201).send({ success: true, data: campaign });
  });

  fastify.get("/message-templates", { preHandler: [authenticate] }, async (req: any, reply) => {
    const { tenantId } = req.tenantContext;
    const data = await db.select().from(messageTemplates)
      .where(and(eq(messageTemplates.tenantId, tenantId), eq(messageTemplates.isActive, true)));
    return reply.send({ success: true, data });
  });
}

// ─────────────────────────────────────────────────────────────
// PRODUCTS MODULE
// ─────────────────────────────────────────────────────────────
export async function productsModule(fastify: FastifyInstance) {
  fastify.get("/products", { preHandler: [authenticate] }, async (req: any, reply) => {
    const { tenantId } = req.tenantContext;
    const { isActive, lowStock } = req.query as any;
    const cond = [eq(products.tenantId, tenantId), isNull(products.deletedAt)];
    if (isActive !== undefined) cond.push(eq(products.isActive, isActive === "true"));
    if (lowStock === "true") cond.push(sql`${products.stockQty} <= ${products.stockMinQty}`);
    const data = await db.select().from(products).where(and(...cond)).orderBy(products.name);
    return reply.send({ success: true, data, total: data.length });
  });

  fastify.post("/products", { preHandler: [authenticate, requireManager] }, async (req: any, reply) => {
    const { tenantId, userId } = req.tenantContext;
    const [product] = await db.insert(products).values({ ...req.body, tenantId, createdBy: userId, updatedBy: userId }).returning();
    return reply.status(201).send({ success: true, data: product });
  });

  fastify.patch("/products/:id", { preHandler: [authenticate, requireManager] }, async (req: any, reply) => {
    const { tenantId, userId } = req.tenantContext;
    const [product] = await db.update(products)
      .set({ ...req.body, updatedBy: userId, updatedAt: new Date() })
      .where(and(eq(products.id, req.params.id), eq(products.tenantId, tenantId)))
      .returning();
    return reply.send({ success: true, data: product });
  });

  fastify.get("/suppliers", { preHandler: [authenticate] }, async (req: any, reply) => {
    const { tenantId } = req.tenantContext;
    const data = await db.select().from(suppliers)
      .where(and(eq(suppliers.tenantId, tenantId), eq(suppliers.isActive, true), isNull(suppliers.deletedAt)));
    return reply.send({ success: true, data });
  });

  fastify.post("/stock-movements", { preHandler: [authenticate] }, async (req: any, reply) => {
    const { tenantId, userId } = req.tenantContext;
    const { productId, type, quantity, reason } = req.body as any;
    const [movement] = await db.insert(stockMovements).values({ tenantId, productId, type, quantity, reason, createdBy: userId }).returning();
    const delta = ["in","adjustment"].includes(type) ? Number(quantity) : -Number(quantity);
    await db.update(products).set({ stockQty: sql`stock_qty + ${delta}`, updatedBy: userId, updatedAt: new Date() })
      .where(and(eq(products.id, productId), eq(products.tenantId, tenantId)));
    return reply.status(201).send({ success: true, data: movement });
  });
}

// ─────────────────────────────────────────────────────────────
// AUTH MODULE — Registro de novo tenant (salão)
// ─────────────────────────────────────────────────────────────
export async function authModule(fastify: FastifyInstance) {
  fastify.get("/auth/me", { preHandler: [authenticate] }, async (req: any, reply) => {
    const { tenantId } = req.tenantContext;
    const [tenant] = await db.select({
      id:          tenants.id,
      name:        tenants.name,
      planTier:    tenants.planTier,
      isActive:    tenants.isActive,
      trialEndsAt: tenants.trialEndsAt,
    }).from(tenants).where(eq(tenants.id, tenantId));
    const now = new Date();
    const trialEnd = tenant?.trialEndsAt ? new Date(tenant.trialEndsAt) : null;
    const daysLeft = trialEnd ? Math.ceil((trialEnd.getTime() - now.getTime()) / 86400000) : null;
    return reply.send({ success: true, data: { ...tenant, daysLeft } });
  });
  fastify.post("/auth/register", async (req: any, reply) => {
    const { salonName, ownerName, email, password } = req.body as any;

    if (!salonName || !ownerName || !email || !password) {
      return reply.status(400).send({ success: false, error: "Todos os campos são obrigatórios" });
    }
    if (password.length < 6) {
      return reply.status(400).send({ success: false, error: "Senha deve ter no mínimo 6 caracteres" });
    }

    // Criar usuário via API REST do Supabase (sem SDK)
    const supabaseUrl = process.env.SUPABASE_URL!;
    const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const authRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${serviceKey}`,
        "apikey": serviceKey,
      },
      body: JSON.stringify({ email, password, email_confirm: true }),
    });

    const authData = await authRes.json() as any;

    if (!authRes.ok) {
      return reply.status(400).send({ success: false, error: authData.message ?? "Erro ao criar usuário" });
    }

    const authUserId = authData.id;

    try {
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 15);

      const [tenant] = await db.insert(tenants).values({
        name: salonName,
        slug: salonName.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-"),
        planTier: "trial",
        isActive: true,
        trialEndsAt,
      }).returning();

      await db.insert(userProfiles).values({
        tenantId: tenant.id,
        authUserId,
        fullName: ownerName,
        email,
        role: "owner",
        isActive: true,
      });

      await db.insert(financialAccounts).values({
        tenantId: tenant.id,
        name: "Caixa Principal",
        type: "cash",
        balance: "0",
        isDefault: true,
        isActive: true,
      });

      const defaultCategories = ["Cabelo", "Unhas", "Estética", "Maquiagem", "Massagem"];
      await db.insert(serviceCategories).values(
        defaultCategories.map((name, i) => ({
          tenantId: tenant.id,
          name,
          isActive: true,
          sortOrder: i + 1,
        }))
      );

      return reply.status(201).send({
        success: true,
        data: {
          tenantId: tenant.id,
          salonName: tenant.name,
          email,
          message: "Salão cadastrado com sucesso! Faça login para continuar.",
        },
      });

    } catch (err: any) {
      // Remover usuário do Supabase se falhou
      await fetch(`${supabaseUrl}/auth/v1/admin/users/${authUserId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${serviceKey}`,
          "apikey": serviceKey,
        },
      });
      return reply.status(500).send({ success: false, error: "Erro ao criar salão. Tente novamente." });

    }
  });
}

// ─────────────────────────────────────────────────────────────
// AUTOMATIONS MODULE
// ─────────────────────────────────────────────────────────────
export async function automationsModule(fastify: FastifyInstance) {

  // Listar templates
  fastify.get("/automations/templates", { preHandler: [authenticate] }, async (req: any, reply) => {
    const { tenantId } = req.tenantContext;
    const { trigger, channel, isActive } = req.query as any;
    const cond = [eq(messageTemplates.tenantId, tenantId), isNull(messageTemplates.deletedAt)];
    if (trigger)   cond.push(eq(messageTemplates.trigger, trigger));
    if (channel)   cond.push(eq(messageTemplates.channel, channel));
    if (isActive !== undefined) cond.push(eq(messageTemplates.isActive, isActive === "true"));
    const data = await db.select().from(messageTemplates).where(and(...cond)).orderBy(messageTemplates.trigger);
    return reply.send({ success: true, data, total: data.length });
  });

  // Criar template
  fastify.post("/automations/templates", { preHandler: [authenticate] }, async (req: any, reply) => {
    const { tenantId, userId } = req.tenantContext;
    const [template] = await db.insert(messageTemplates).values({ ...req.body, tenantId, createdBy: userId, updatedBy: userId }).returning();
    return reply.status(201).send({ success: true, data: template });
  });

  // Atualizar template
  fastify.patch("/automations/templates/:id", { preHandler: [authenticate] }, async (req: any, reply) => {
    const { tenantId, userId } = req.tenantContext;
    const [template] = await db.update(messageTemplates)
      .set({ ...req.body, updatedBy: userId, updatedAt: new Date() })
      .where(and(eq(messageTemplates.id, req.params.id), eq(messageTemplates.tenantId, tenantId)))
      .returning();
    return reply.send({ success: true, data: template });
  });

  // Deletar template
  fastify.delete("/automations/templates/:id", { preHandler: [authenticate] }, async (req: any, reply) => {
    const { tenantId } = req.tenantContext;
    await db.update(messageTemplates).set({ deletedAt: new Date() })
      .where(and(eq(messageTemplates.id, req.params.id), eq(messageTemplates.tenantId, tenantId)));
    return reply.status(204).send();
  });

  // Seed de templates padrão
  fastify.post("/automations/templates/seed", { preHandler: [authenticate] }, async (req: any, reply) => {
    const { tenantId, userId } = req.tenantContext;
    const defaults = [
      { trigger:"appointment_reminder_24h", channel:"whatsapp", name:"Lembrete 24h", message:"Olá {nome}! 😊 Lembrando que você tem um agendamento amanhã, {data} às {hora}. Confirma sua presença? Qualquer dúvida é só chamar!" },
      { trigger:"appointment_reminder_2h",  channel:"whatsapp", name:"Lembrete 2h",  message:"Olá {nome}! Seu atendimento é em 2 horas, às {hora}. Te esperamos! 💅" },
      { trigger:"appointment_confirmed",    channel:"whatsapp", name:"Confirmação",  message:"✅ Olá {nome}! Seu agendamento está confirmado para {data} às {hora}. Até lá!" },
      { trigger:"appointment_completed",    channel:"whatsapp", name:"Pós-atendimento", message:"Olá {nome}! 🌟 Foi um prazer te atender! Como você avalia nosso serviço de 1 a 10?" },
      { trigger:"birthday",                 channel:"whatsapp", name:"Aniversário",  message:"🎂 Feliz aniversário, {nome}! Em seu dia especial, temos um presente: 15% de desconto no seu próximo atendimento. Use o código: ANIVER15" },
      { trigger:"client_reactivation",      channel:"whatsapp", name:"Reativação",   message:"Olá {nome}! Sentimos sua falta! 💕 Faz um tempo que não te vemos. Temos novidades e promoções especiais esperando por você!" },
      { trigger:"satisfaction_survey",      channel:"whatsapp", name:"Pesquisa",     message:"Olá {nome}! Gostaríamos de saber sua opinião sobre seu último atendimento. De 1 a 5, como foi sua experiência? Sua avaliação é muito importante!" },
      { trigger:"promotion",                channel:"whatsapp", name:"Promoção",     message:"🎉 Olá {nome}! Temos uma promoção especial para você! Confira nossas ofertas e agende seu horário. Vagas limitadas!" },
      { trigger:"financial_reminder",       channel:"whatsapp", name:"Lembrete Financeiro", message:"Olá {nome}! Passando para lembrar sobre o pagamento pendente de {valor}. Qualquer dúvida estamos à disposição!" },
      { trigger:"welcome",                  channel:"whatsapp", name:"Boas-vindas",  message:"🌸 Bem-vinda, {nome}! É um prazer tê-la como cliente. Estamos aqui para deixar você ainda mais linda e feliz. Até breve!" },
    ];
    const inserted = await db.insert(messageTemplates).values(
      defaults.map(d => ({ ...d, tenantId, isActive: true, sendDelay: 0, createdBy: userId, updatedBy: userId }))
    ).returning();
    return reply.status(201).send({ success: true, data: inserted, total: inserted.length });
  });
}
// -------------------------------------------------------------
// SUPER ADMIN MODULE
// -------------------------------------------------------------
export async function superAdminModule(fastify: FastifyInstance) {

  async function requireSuperAdmin(req: any, reply: any) {
    const auth = req.headers.authorization?.replace("Bearer ", "");
    if (!auth) return reply.status(401).send({ success: false, error: "N�o autorizado" });
    try {
      const jwt = await import("jsonwebtoken");
      const payload = jwt.default.verify(auth, process.env.SUPER_ADMIN_SECRET!) as any;
      if (payload.role !== "super_admin") throw new Error("Acesso negado");
      req.superAdmin = payload;
    } catch {
      return reply.status(401).send({ success: false, error: "Token Super Admin inv�lido" });
    }
  }

  fastify.post("/super-admin/login", async (req: any, reply) => {
    const { email, password } = req.body as any;
    if (email !== process.env.SUPER_ADMIN_EMAIL || password !== process.env.SUPER_ADMIN_PASSWORD) {
      return reply.status(401).send({ success: false, error: "Credenciais inv�lidas" });
    }
    const jwt = await import("jsonwebtoken");
    const token = jwt.default.sign({ email, role: "super_admin" }, process.env.SUPER_ADMIN_SECRET!, { expiresIn: "8h" });
    return reply.send({ success: true, data: { token, email, role: "super_admin" } });
  });

  fastify.get("/super-admin/tenants", { preHandler: [requireSuperAdmin] }, async (req: any, reply) => {
    const { search, status } = req.query as any;
    const cond: any[] = [isNull(tenants.deletedAt)];
    if (search) cond.push(ilike(tenants.name, `%${search}%`));
    const data = await db.select({ id: tenants.id, name: tenants.name, slug: tenants.slug, email: tenants.email, phone: tenants.phone, planTier: tenants.planTier, isActive: tenants.isActive, trialEndsAt: tenants.trialEndsAt, createdAt: tenants.createdAt, maxUsers: tenants.maxUsers }).from(tenants).where(and(...cond)).orderBy(desc(tenants.createdAt));
    const now = new Date();
    const enriched = data.map(t => {
      const trialEnd = t.trialEndsAt ? new Date(t.trialEndsAt) : null;
      const daysLeft = trialEnd ? Math.ceil((trialEnd.getTime() - now.getTime()) / 86400000) : null;
      const trialStatus = !t.isActive ? "blocked" : t.planTier !== "trial" ? "active" : !trialEnd ? "trial" : daysLeft !== null && daysLeft > 0 ? "trial" : "expired";
      return { ...t, daysLeft, trialStatus };
    });
    const filtered = status ? enriched.filter(t => t.trialStatus === status) : enriched;
    return reply.send({ success: true, data: filtered, total: filtered.length });
  });

  fastify.get("/super-admin/tenants/:id", { preHandler: [requireSuperAdmin] }, async (req: any, reply) => {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, req.params.id));
    if (!tenant) return reply.status(404).send({ success: false, error: "Tenant n�o encontrado" });
    const [users, appts, cls] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(userProfiles).where(eq(userProfiles.tenantId, req.params.id)),
      db.select({ count: sql<number>`count(*)` }).from(appointments).where(eq(appointments.tenantId, req.params.id)),
      db.select({ count: sql<number>`count(*)` }).from(clients).where(eq(clients.tenantId, req.params.id)),
    ]);
    return reply.send({ success: true, data: { ...tenant, stats: { users: Number(users[0]?.count ?? 0), appointments: Number(appts[0]?.count ?? 0), clients: Number(cls[0]?.count ?? 0) } } });
  });

  fastify.patch("/super-admin/tenants/:id", { preHandler: [requireSuperAdmin] }, async (req: any, reply) => {
    const { trialDays, planTier, isActive, maxUsers } = req.body as any;
    const updates: any = { updatedAt: new Date() };
    if (planTier  !== undefined) updates.planTier  = planTier;
    if (isActive  !== undefined) updates.isActive  = isActive;
    if (maxUsers  !== undefined) updates.maxUsers  = maxUsers;
    if (trialDays !== undefined) {
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + Number(trialDays));
      updates.trialEndsAt = trialEndsAt;
      updates.planTier    = "trial";
      updates.isActive    = true;
    }
    const [tenant] = await db.update(tenants).set(updates).where(eq(tenants.id, req.params.id)).returning();
    return reply.send({ success: true, data: tenant });
  });

  fastify.post("/super-admin/tenants/:id/block", { preHandler: [requireSuperAdmin] }, async (req: any, reply) => {
    const [tenant] = await db.update(tenants).set({ isActive: false, updatedAt: new Date() }).where(eq(tenants.id, req.params.id)).returning();
    return reply.send({ success: true, data: tenant });
  });

  fastify.post("/super-admin/tenants/:id/unblock", { preHandler: [requireSuperAdmin] }, async (req: any, reply) => {
    const [tenant] = await db.update(tenants).set({ isActive: true, updatedAt: new Date() }).where(eq(tenants.id, req.params.id)).returning();
    return reply.send({ success: true, data: tenant });
  });

  fastify.post("/super-admin/tenants/:id/extend-trial", { preHandler: [requireSuperAdmin] }, async (req: any, reply) => {
    const { days } = req.body as any;
    const [current] = await db.select().from(tenants).where(eq(tenants.id, req.params.id));
    const base = current.trialEndsAt && new Date(current.trialEndsAt) > new Date() ? new Date(current.trialEndsAt) : new Date();
    base.setDate(base.getDate() + Number(days ?? 15));
    const [tenant] = await db.update(tenants).set({ trialEndsAt: base, isActive: true, planTier: "trial", updatedAt: new Date() }).where(eq(tenants.id, req.params.id)).returning();
    return reply.send({ success: true, data: tenant });
  });

  fastify.get("/super-admin/stats", { preHandler: [requireSuperAdmin] }, async (_req, reply) => {
    const now = new Date();
    const [t1, t2, t3, t4, t5, t6] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(tenants).where(isNull(tenants.deletedAt)),
      db.select({ count: sql<number>`count(*)` }).from(tenants).where(and(eq(tenants.isActive, true), isNull(tenants.deletedAt))),
      db.select({ count: sql<number>`count(*)` }).from(tenants).where(and(eq(tenants.planTier, "trial"), eq(tenants.isActive, true), gte(tenants.trialEndsAt, now), isNull(tenants.deletedAt))),
      db.select({ count: sql<number>`count(*)` }).from(tenants).where(and(eq(tenants.isActive, false), isNull(tenants.deletedAt))),
      db.select({ count: sql<number>`count(*)` }).from(clients),
      db.select({ count: sql<number>`count(*)` }).from(appointments),
    ]);
    return reply.send({ success: true, data: { totalTenants: Number(t1[0]?.count ?? 0), activeTenants: Number(t2[0]?.count ?? 0), trialTenants: Number(t3[0]?.count ?? 0), blockedTenants: Number(t4[0]?.count ?? 0), totalClients: Number(t5[0]?.count ?? 0), totalAppts: Number(t6[0]?.count ?? 0) } });
  });

// Listar notificações
  fastify.get("/automations/notifications", { preHandler: [authenticate] }, async (req: any, reply) => {
    const { tenantId } = req.tenantContext;
    const { status, channel, page, limit } = req.query as any;
    const { limit: l, offset } = paginate(page, limit);
    const cond = [eq(notifications.tenantId, tenantId)];
    if (status)  cond.push(eq(notifications.status, status));
    if (channel) cond.push(eq(notifications.channel, channel));
    const [data, [{ total }]] = await Promise.all([
      db.select({
        notification: notifications,
        client: { id: clients.id, fullName: clients.fullName, whatsapp: clients.whatsapp },
      })
      .from(notifications)
      .leftJoin(clients, eq(notifications.clientId, clients.id))
      .where(and(...cond))
      .orderBy(desc(notifications.createdAt))
      .limit(l).offset(offset),
      db.select({ total: sql<number>`count(*)` }).from(notifications).where(and(...cond)),
    ]);
    return reply.send({ success: true, data, total: Number(total), page: Number(page ?? 1), limit: l });
  });

  // Marcar notificação como enviada
  fastify.post("/automations/notifications/:id/sent", { preHandler: [authenticate] }, async (req: any, reply) => {
    const { tenantId } = req.tenantContext;
    const [notif] = await db.update(notifications)
      .set({ status: "sent", sentAt: new Date() })
      .where(and(eq(notifications.id, req.params.id), eq(notifications.tenantId, tenantId)))
      .returning();
    return reply.send({ success: true, data: notif });
  });
}
