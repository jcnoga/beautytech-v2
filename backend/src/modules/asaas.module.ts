
// ============================================================
// ASAAS MODULE - Pagamentos e Assinaturas
// ============================================================
import { eq } from "drizzle-orm";
import { db } from "@db/connection";
import { tenants } from "@db/schema/index";
import { authenticate } from "@middleware/auth";

export async function asaasModule(fastify: any) {
  const raw = process.env.ASAAS_API_KEY ?? '';
  const ASAAS_KEY = raw.startsWith('$') ? raw : (raw ? '$' + raw : '');
  const ASAAS_URL = process.env.ASAAS_ENV === "production"
    ? "https://api.asaas.com/api/v3"
    : "https://sandbox.asaas.com/api/v3";

  if (!ASAAS_KEY) {
    console.warn("[ASAAS] ASAAS_API_KEY nao configurada - modulo desabilitado");
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

  const getOrCreateAsaasCustomer = async (tenant: any) => {
    const cpfCnpj = tenant.cpfCnpj;
    if (tenant.settings?.asaasCustomerId) {
      if (cpfCnpj) {
        await asaasFetch("PUT", `/customers/${tenant.settings.asaasCustomerId}`, { cpfCnpj });
      }
      return tenant.settings.asaasCustomerId;
    }
    const asaasEmail = process.env.ASAAS_ENV === 'production' ? tenant.email : (process.env.ASAAS_TEST_EMAIL ?? tenant.email);
    const existing = await asaasFetch("GET", `/customers?email=${encodeURIComponent(asaasEmail)}`);
    if (existing?.data?.length > 0) {
      const id = existing.data[0].id;
      if (cpfCnpj) await asaasFetch("PUT", `/customers/${id}`, { cpfCnpj });
      await db.update(tenants).set({ settings: { ...tenant.settings, asaasCustomerId: id }, updatedAt: new Date() }).where(eq(tenants.id, tenant.id));
      return id;
    }
    const created = await asaasFetch("POST", "/customers", {
      name: tenant.name,
      email: asaasEmail,
      phone: tenant.phone ?? undefined,
      cpfCnpj: cpfCnpj ?? undefined,
      notificationDisabled: false,
    });
    if (!created.id) throw new Error("Erro ao criar cliente no Asaas: " + JSON.stringify(created));
    await db.update(tenants).set({ settings: { ...tenant.settings, asaasCustomerId: created.id }, updatedAt: new Date() }).where(eq(tenants.id, tenant.id));
    return created.id;
  };

  fastify.post("/billing/subscribe", { preHandler: [authenticate] }, async (req: any, reply: any) => {
    const { tenantId } = req.tenantContext;
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId));
    if (!tenant.email) return reply.status(400).send({ success: false, error: "Email do salao nao configurado." });
    if (!tenant.cpfCnpj) return reply.status(400).send({ success: false, error: "CPF/CNPJ do salao nao configurado. Acesse Configuracoes para cadastrar." });

    const customerId = await getOrCreateAsaasCustomer(tenant);

    const charge = await asaasFetch("POST", "/payments", {
      customer: customerId,
      billingType: "UNDEFINED",
      value: 49.90,
      dueDate: new Date().toISOString().split("T")[0],
      description: "BeautyTech - Plano Profissional (mensal)",
      externalReference: tenantId,
    });

    if (!charge.id) return reply.status(500).send({ success: false, error: "Erro ao criar cobranca no Asaas: " + (charge.errors?.[0]?.description ?? "erro desconhecido") });

    await db.update(tenants).set({
      settings: { ...tenant.settings, asaasChargeId: charge.id },
      updatedAt: new Date()
    }).where(eq(tenants.id, tenantId));

    return reply.send({ success: true, data: { chargeId: charge.id, paymentUrl: charge.invoiceUrl ?? charge.bankSlipUrl ?? null } });
  });

  fastify.post("/billing/webhook", async (req: any, reply: any) => {
    const token = req.headers["asaas-webhook-token"] ?? req.headers["access_token"];
    if (token !== process.env.ASAAS_WEBHOOK_TOKEN) return reply.status(401).send({ error: "Unauthorized" });
    const event = req.body as any;
    const { event: eventType, payment } = event;
    if (!payment?.externalReference) return reply.send({ ok: true });
    const tenantId = payment.externalReference;
    if (["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"].includes(eventType)) {
      await db.update(tenants).set({ planTier: "pro", isActive: true, trialEndsAt: null, updatedAt: new Date() }).where(eq(tenants.id, tenantId));
      try {
        const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId));
        if (tenant?.email) {
          const { sendProActivatedEmail } = await import("../modules/resend.module.js");
          await sendProActivatedEmail(tenant.email, tenant.name ?? "");
        }
      } catch (e: any) {
        console.error("[WEBHOOK] Erro ao enviar email pro ativado:", e.message);
      }
    }
    if (["PAYMENT_OVERDUE", "SUBSCRIPTION_INACTIVATED"].includes(eventType)) {
      await db.update(tenants).set({ planTier: "basic", updatedAt: new Date() }).where(eq(tenants.id, tenantId));
      try {
        const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId));
        if (tenant?.email) {
          const { sendPaymentOverdueEmail } = await import("../modules/resend.module.js");
          await sendPaymentOverdueEmail(tenant.email, tenant.name ?? "");
        }
      } catch (e: any) {
        console.error("[WEBHOOK] Erro ao enviar email pagamento vencido:", e.message);
      }
    }
    return reply.send({ ok: true });
  });

  fastify.get("/billing/status", { preHandler: [authenticate] }, async (req: any, reply: any) => {
    const { tenantId } = req.tenantContext;
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId));
    const chargeId = tenant.settings?.asaasChargeId;
    if (!chargeId) return reply.send({ success: true, data: { status: "none" } });
    const charge = await asaasFetch("GET", `/payments/${chargeId}`);
    return reply.send({ success: true, data: { status: charge.status, value: charge.value, dueDate: charge.dueDate } });
  });
}
