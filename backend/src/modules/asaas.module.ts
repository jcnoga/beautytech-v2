
// ============================================================
// ASAAS MODULE - Pagamentos e Assinaturas
// ============================================================
import { eq } from "drizzle-orm";
import { db } from "@db/connection";
import { tenants } from "@db/schema/index";
import { authenticate } from "@middleware/auth";

export async function asaasModule(fastify: any) {
  const ASAAS_KEY = process.env.ASAAS_API_KEY!;
  const ASAAS_URL = process.env.ASAAS_ENV === "sandbox"
    ? "https://sandbox.asaas.com/api/v3"
    : "https://api.asaas.com/api/v3";

  const asaasFetch = async (method: string, path: string, body?: any) => {
    const res = await fetch(`${ASAAS_URL}${path}`, {
      method,
      headers: { "Content-Type": "application/json", "access_token": ASAAS_KEY },
      body: body ? JSON.stringify(body) : undefined,
    });
    return res.json();
  };

  // CRIAR OU BUSCAR CLIENTE NO ASAAS
  const getOrCreateAsaasCustomer = async (tenant: any) => {
    if (tenant.settings?.asaasCustomerId) {
      return tenant.settings.asaasCustomerId;
    }
    const existing = await asaasFetch("GET", `/customers?email=${encodeURIComponent(tenant.email)}`);
    if (existing?.data?.length > 0) {
      const id = existing.data[0].id;
      await db.update(tenants).set({ settings: { ...tenant.settings, asaasCustomerId: id }, updatedAt: new Date() }).where(eq(tenants.id, tenant.id));
      return id;
    }
    const created = await asaasFetch("POST", "/customers", {
      name: tenant.name,
      email: tenant.email,
      phone: tenant.phone ?? undefined,
      notificationDisabled: false,
    });
    const id = created.id;
    await db.update(tenants).set({ settings: { ...tenant.settings, asaasCustomerId: id }, updatedAt: new Date() }).where(eq(tenants.id, tenant.id));
    return id;
  };

  // GERAR LINK DE PAGAMENTO / ASSINATURA
  fastify.post("/billing/subscribe", { preHandler: [authenticate] }, async (req: any, reply: any) => {
    const { tenantId } = req.tenantContext;
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId));
    if (!tenant.email) return reply.status(400).send({ success: false, error: "Email do salao nao configurado." });

    const customerId = await getOrCreateAsaasCustomer(tenant);

    const subscription = await asaasFetch("POST", "/subscriptions", {
      customer: customerId,
      billingType: "CREDIT_CARD",
      value: 49.90,
      nextDueDate: new Date().toISOString().split("T")[0],
      cycle: "MONTHLY",
      description: "BeautyTech - Plano Profissional",
      externalReference: tenantId,
      callback: {
        successUrl: `https://beautytech-v2.vercel.app/payment-success`,
        autoRedirect: true,
      },
    });

    if (!subscription.id) return reply.status(500).send({ success: false, error: "Erro ao criar assinatura no Asaas." });

    const paymentLink = await asaasFetch("GET", `/subscriptions/${subscription.id}/paymentBook`);

    await db.update(tenants).set({
      settings: { ...tenant.settings, asaasSubscriptionId: subscription.id },
      updatedAt: new Date()
    }).where(eq(tenants.id, tenantId));

    return reply.send({ success: true, data: { subscriptionId: subscription.id, paymentUrl: subscription.invoiceUrl ?? paymentLink?.invoiceUrl ?? null } });
  });

  // WEBHOOK ASAAS
  fastify.post("/billing/webhook", async (req: any, reply: any) => {
    const token = req.headers["asaas-webhook-token"] ?? req.headers["access_token"];
    if (token !== process.env.ASAAS_WEBHOOK_TOKEN) return reply.status(401).send({ error: "Unauthorized" });

    const event = req.body as any;
    const { event: eventType, payment } = event;

    if (!payment?.externalReference) return reply.send({ ok: true });

    const tenantId = payment.externalReference;

    if (["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"].includes(eventType)) {
      await db.update(tenants).set({
        planTier: "pro",
        isActive: true,
        trialEndsAt: null,
        updatedAt: new Date(),
      }).where(eq(tenants.id, tenantId));
    }

    if (["PAYMENT_OVERDUE", "SUBSCRIPTION_INACTIVATED"].includes(eventType)) {
      await db.update(tenants).set({
        planTier: "basic",
        updatedAt: new Date(),
      }).where(eq(tenants.id, tenantId));
    }

    return reply.send({ ok: true });
  });

  // STATUS DA ASSINATURA
  fastify.get("/billing/status", { preHandler: [authenticate] }, async (req: any, reply: any) => {
    const { tenantId } = req.tenantContext;
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId));
    const subId = tenant.settings?.asaasSubscriptionId;
    if (!subId) return reply.send({ success: true, data: { status: "none" } });
    const sub = await asaasFetch("GET", `/subscriptions/${subId}`);
    return reply.send({ success: true, data: { status: sub.status, value: sub.value, nextDueDate: sub.nextDueDate } });
  });
}
