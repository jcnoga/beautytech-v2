import re

path = r"backend\src\modules\asaas.module.ts"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = '''    if (["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"].includes(eventType)) {
      await db.update(tenants).set({ planTier: "pro", isActive: true, trialEndsAt: null, updatedAt: new Date() }).where(eq(tenants.id, tenantId));
    }
    if (["PAYMENT_OVERDUE", "SUBSCRIPTION_INACTIVATED"].includes(eventType)) {
      await db.update(tenants).set({ planTier: "basic", updatedAt: new Date() }).where(eq(tenants.id, tenantId));
    }
    return reply.send({ ok: true });'''

new = '''    if (["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"].includes(eventType)) {
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
    return reply.send({ ok: true });'''

if old in content:
    content = content.replace(old, new)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("✅ fix_webhook_resend.py aplicado com sucesso!")
else:
    print("❌ Trecho não encontrado — verifique o arquivo manualmente.")
