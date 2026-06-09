content = open('C:/projetos/beautytech-v2/backend/src/modules/asaas.module.ts', encoding='utf-8').read()

old = """    const subscription = await asaasFetch("POST", "/subscriptions", {
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

    return reply.send({ success: true, data: { subscriptionId: subscription.id, paymentUrl: subscription.invoiceUrl ?? paymentLink?.invoiceUrl ?? null } });"""

new = """    const charge = await asaasFetch("POST", "/payments", {
      customer: customerId,
      billingType: "UNDEFINED",
      value: 49.90,
      dueDate: new Date().toISOString().split("T")[0],
      description: "BeautyTech - Plano Profissional (mensal)",
      externalReference: tenantId,
    });

    console.log("[ASAAS] Payment created:", JSON.stringify(charge).substring(0, 300));

    if (!charge.id) return reply.status(500).send({ success: false, error: "Erro ao criar cobranca no Asaas." });

    await db.update(tenants).set({
      settings: { ...tenant.settings, asaasChargeId: charge.id },
      updatedAt: new Date()
    }).where(eq(tenants.id, tenantId));

    return reply.send({ success: true, data: { chargeId: charge.id, paymentUrl: charge.invoiceUrl ?? charge.bankSlipUrl ?? null } });"""

if old in content:
    open('C:/projetos/beautytech-v2/backend/src/modules/asaas.module.ts', 'w', encoding='utf-8').write(content.replace(old, new, 1))
    print('CORRIGIDO')
else:
    print('TRECHO NAO ENCONTRADO')
