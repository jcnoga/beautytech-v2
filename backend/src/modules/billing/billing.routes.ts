// ============================================================
// BILLING ROUTES - Assinaturas com Asaas Producao
// ============================================================
import { eq } from "drizzle-orm";
import { db } from "@db/connection";
import { tenants } from "@db/schema/index";
import { authenticate } from "@middleware/auth";
import {
  PLANS, ASAAS_CYCLE,
  calcPlanAmount, calcPlanExpiry, calcProrate,
  PlanTier, PlanPeriod,
} from "./billing.service.js";

export async function billingRoutes(fastify: any) {
  const ASAAS_KEY = (process.env.ASAAS_API_KEY ?? "").startsWith("$") ? process.env.ASAAS_API_KEY! : `$${process.env.ASAAS_API_KEY ?? ""}`;
  const ASAAS_URL = process.env.ASAAS_BASE_URL ?? "https://sandbox.asaas.com/api/v3";
  const WEBHOOK_TOKEN = process.env.ASAAS_WEBHOOK_TOKEN ?? "";
  console.log("[BILLING] KEY_PREFIX:", ASAAS_KEY.substring(0,20), "URL:", ASAAS_URL);

  if (!ASAAS_KEY) {
    console.warn("[BILLING] ASAAS_API_KEY nao configurada");
    return;
  }

  const asaasFetch = async (method: string, path: string, body?: any) => {
    const res = await fetch(`${ASAAS_URL}${path}`, {
      method,
      headers: { "Content-Type": "application/json", "access_token": ASAAS_KEY },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    try { return text ? JSON.parse(text) : {}; } catch { return {}; }
  };

  const getOrCreateCustomer = async (tenant: any): Promise<string> => {
    if (tenant.asaasCustomerId) return tenant.asaasCustomerId;
    const existing = await asaasFetch("GET", `/customers?email=${encodeURIComponent(tenant.email)}`);
    if (existing?.data?.length > 0) {
      const id = existing.data[0].id;
      await db.update(tenants).set({ asaasCustomerId: id, updatedAt: new Date() }).where(eq(tenants.id, tenant.id));
      return id;
    }
    const created = await asaasFetch("POST", "/customers", {
      name: tenant.name,
      email: tenant.email,
      phone: tenant.phone ?? undefined,
      notificationDisabled: false,
    });
    if (!created.id) throw new Error("Erro ao criar cliente no Asaas: " + JSON.stringify(created));
    await db.update(tenants).set({ asaasCustomerId: created.id, updatedAt: new Date() }).where(eq(tenants.id, tenant.id));
    return created.id;
  };

  // GET /billing/plans
  fastify.get("/billing/plans", async (_req: any, reply: any) => {
    try {
      const { db } = await import("@db/connection.js");
      const { sql } = await import("drizzle-orm");
      const result = await db.execute(sql`SELECT key, value FROM plan_settings WHERE key LIKE 'plan_%'`);
      const rows = (result as any).rows ?? (Array.isArray(result) ? result : []);
      const s: Record<string, number> = {};
      rows.forEach((r: any) => { s[r.key] = parseFloat(r.value) || 0; });
      const plans = {
        free:  { tier:"free",  name:"Free",   monthlyPrice:0,                                           professionals: 1,  clients:30     },
        basic: { tier:"basic", name:"Basico", monthlyPrice:s["plan_basic_monthly"] ?? 39.90,            professionals: s["plan_basic_max_users"] ?? 1,  clients:999999 },
        pro:   { tier:"pro",   name:"Pro",    monthlyPrice:s["plan_pro_monthly"]   ?? 59.90,            professionals: s["plan_pro_max_users"]   ?? 5,  clients:999999 },
        super: { tier:"super", name:"Super",  monthlyPrice:s["plan_super_monthly"] ?? 99.90,            professionals: s["plan_super_max_users"] ?? 12, clients:999999 },
      };
      return reply.send({ success: true, data: plans });
    } catch(e) {
      return reply.send({ success: true, data: PLANS });
    }
  });

  // GET /billing/status
  fastify.get("/billing/status", { preHandler: [authenticate] }, async (req: any, reply: any) => {
    const { tenantId } = req.tenantContext;
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId));
    return reply.send({
      success: true,
      data: {
        planTier:          tenant.planTier,
        planPeriod:        tenant.planPeriod ?? "monthly",
        planStatus:        tenant.planStatus ?? "trial",
        planExpiresAt:     tenant.planExpiresAt,
        planStartedAt:     tenant.planStartedAt,
        cancelAtPeriodEnd: tenant.planCancelAtPeriodEnd ?? false,
      },
    });
  });

  // POST /billing/subscribe
  fastify.post("/billing/subscribe", { preHandler: [authenticate] }, async (req: any, reply: any) => {
    const { tenantId } = req.tenantContext;
    const { tier, period } = req.body as { tier: PlanTier; period: PlanPeriod };

    if (!PLANS[tier] || tier === "free") return reply.status(400).send({ success: false, error: "Plano invalido." });
    if (!["monthly","semiannual","annual"].includes(period)) return reply.status(400).send({ success: false, error: "Periodo invalido." });

    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId));
    if (!tenant.email) return reply.status(400).send({ success: false, error: "E-mail do salao nao configurado." });

    // Calcula prorate se upgrade de plano ativo
    let creditBrl = 0;
    const currentTier   = tenant.planTier as PlanTier;
    const currentPeriod = (tenant.planPeriod ?? "monthly") as PlanPeriod;
    const planStatus    = tenant.planStatus ?? "trial";

    if (planStatus === "active" && tenant.planStartedAt && tenant.planExpiresAt) {
      const currentPrice = PLANS[currentTier]?.monthlyPrice ?? 0;
      const newPrice     = PLANS[tier]?.monthlyPrice ?? 0;
      if (newPrice > currentPrice) {
        creditBrl = calcProrate(
          currentTier, currentPeriod,
          new Date(tenant.planStartedAt),
          new Date(tenant.planExpiresAt)
        );
      }
    }

    const totalAmount = calcPlanAmount(tier, period);
    const finalAmount = Math.max(0, parseFloat((totalAmount - creditBrl).toFixed(2)));
    const expiresAt   = calcPlanExpiry(period);
    const dueDate     = new Date().toISOString().split("T")[0];

    const customerId = await getOrCreateCustomer(tenant);

    // Cancela assinatura anterior
    if (tenant.asaasSubscriptionId) {
      try { await asaasFetch("DELETE", `/subscriptions/${tenant.asaasSubscriptionId}`); }
      catch (e) { console.warn("[BILLING] Erro ao cancelar assinatura anterior:", e); }
    }

    // Cria assinatura recorrente
    const subscription = await asaasFetch("POST", "/subscriptions", {
      customer:          customerId,
      billingType:       "UNDEFINED",
      value:             calcPlanAmount(tier, period),
      nextDueDate:       dueDate,
      cycle:             ASAAS_CYCLE[period],
      description:       `BeautyTech - Plano ${PLANS[tier].name} (${period})`,
      externalReference: `${tenantId}|${tier}|${period}`,
    });

    if (!subscription.id) {
      return reply.status(500).send({ success: false, error: "Erro ao criar assinatura: " + JSON.stringify(subscription) });
    }

    // Cobran�a com cr�dito aplicado se upgrade
    let firstCharge: any = null;
    if (creditBrl > 0 && finalAmount > 0) {
      firstCharge = await asaasFetch("POST", "/payments", {
        customer:          customerId,
        billingType:       "UNDEFINED",
        value:             finalAmount,
        dueDate,
        description:       `BeautyTech - Upgrade para ${PLANS[tier].name} (credito R$${creditBrl.toFixed(2)} aplicado)`,
        externalReference: `${tenantId}|${tier}|${period}|upgrade`,
      });
    }

    // Atualiza tenant
    await db.update(tenants).set({
      planTier:             tier,
      planPeriod:           period,
      planStatus:           "active",
      planStartedAt:        new Date(),
      planExpiresAt:        expiresAt,
      planCancelAtPeriodEnd: false,
      asaasSubscriptionId:  subscription.id,
      asaasCustomerId:      customerId,
      updatedAt:            new Date(),
    }).where(eq(tenants.id, tenantId));

    // E-mail confirmacao
    try {
      const { sendPlanActivatedEmail } = await import("../resend.module.js");
      await sendPlanActivatedEmail(tenant.email, tenant.name ?? "", PLANS[tier].name, period, expiresAt);
    } catch (e: any) {
      console.error("[BILLING] Erro e-mail confirmacao:", e.message);
    }

    return reply.send({
      success: true,
      data: {
        subscriptionId: subscription.id,
        paymentUrl:     subscription.invoiceUrl ?? null,
        firstChargeUrl: firstCharge?.invoiceUrl ?? null,
        creditApplied:  creditBrl,
        totalAmount,
        finalAmount,
        expiresAt,
      },
    });
  });

  // POST /billing/cancel
  fastify.post("/billing/cancel", { preHandler: [authenticate] }, async (req: any, reply: any) => {
    const { tenantId } = req.tenantContext;
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId));

    if (tenant.asaasSubscriptionId) {
      try { await asaasFetch("DELETE", `/subscriptions/${tenant.asaasSubscriptionId}`); }
      catch (e) { console.warn("[BILLING] Erro ao cancelar:", e); }
    }

    await db.update(tenants).set({
      planCancelAtPeriodEnd: true,
      planStatus:            "canceled",
      updatedAt:             new Date(),
    }).where(eq(tenants.id, tenantId));

    try {
      const { sendPlanCanceledEmail } = await import("../resend.module.js");
      await sendPlanCanceledEmail(tenant.email ?? "", tenant.name ?? "", tenant.planExpiresAt);
    } catch (e: any) {
      console.error("[BILLING] Erro e-mail cancelamento:", e.message);
    }

    return reply.send({ success: true, message: "Assinatura cancelada. Acesso mantido ate o fim do periodo." });
  });

  // POST /billing/webhook
  fastify.post("/billing/webhook", async (req: any, reply: any) => {
    const token = req.headers["asaas-webhook-token"] ?? req.headers["access_token"];
    if (token !== WEBHOOK_TOKEN) return reply.status(401).send({ error: "Unauthorized" });

    const { event: eventType, payment } = req.body as any;
    const ref = payment?.externalReference ?? "";
    if (!ref) return reply.send({ ok: true });

    const [tenantId, tier, period] = ref.split("|");
    if (!tenantId) return reply.send({ ok: true });

    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId));
    if (!tenant) return reply.send({ ok: true });

    if (["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"].includes(eventType)) {
      const expiresAt = calcPlanExpiry(
        (period as PlanPeriod) ?? "monthly",
        tenant.planExpiresAt ? new Date(tenant.planExpiresAt) : new Date()
      );
      await db.update(tenants).set({
        planStatus:    "active",
        planExpiresAt: expiresAt,
        isActive:      true,
        updatedAt:     new Date(),
      }).where(eq(tenants.id, tenantId));

      try {
        const { sendPaymentConfirmedEmail } = await import("../resend.module.js");
        await sendPaymentConfirmedEmail(tenant.email ?? "", tenant.name ?? "", payment?.value ?? 0, expiresAt);
      } catch (e: any) {
        console.error("[WEBHOOK] Erro e-mail confirmado:", e.message);
      }
    }

    if (eventType === "PAYMENT_OVERDUE") {
      await db.update(tenants).set({ planStatus: "past_due", updatedAt: new Date() }).where(eq(tenants.id, tenantId));
      try {
        const { sendPaymentOverdueEmail } = await import("../resend.module.js");
        await sendPaymentOverdueEmail(tenant.email ?? "", tenant.name ?? "");
      } catch (e: any) {
        console.error("[WEBHOOK] Erro e-mail vencido:", e.message);
      }
    }

    if (eventType === "SUBSCRIPTION_INACTIVATED") {
      await db.update(tenants).set({
        planTier:   "free",
        planStatus: "expired",
        isActive:   true,
        updatedAt:  new Date(),
      }).where(eq(tenants.id, tenantId));
    }

    return reply.send({ ok: true });
  });
}


