content = open('C:/projetos/beautytech-v2/backend/src/modules/all-modules.ts', encoding='utf-8').read()

old = "  fastify.delete(\"/super-admin/tenants/:id\","

new = """  // PLAN SETTINGS - GET ALL
  fastify.get("/super-admin/plan-settings", { preHandler: [requireSuperAdmin] }, async (_req: any, reply: any) => {
    const data = await db.execute(sql`SELECT * FROM plan_settings ORDER BY key`);
    const rows = (data as any).rows ?? (Array.isArray(data) ? data : []);
    return reply.send({ success: true, data: rows });
  });

  // PLAN SETTINGS - UPDATE
  fastify.patch("/super-admin/plan-settings/:key", { preHandler: [requireSuperAdmin] }, async (req: any, reply: any) => {
    const { value } = req.body as any;
    await db.execute(sql`UPDATE plan_settings SET value=${JSON.stringify(value)}, updated_at=NOW() WHERE key=${req.params.key}`);
    return reply.send({ success: true });
  });

  // TENANT PLAN - UPDATE WITH MAX CLIENTS
  fastify.patch("/super-admin/tenants/:id/plan", { preHandler: [requireSuperAdmin] }, async (req: any, reply: any) => {
    const { planTier, maxClients, maxUsers, trialDays } = req.body as any;
    const updates: any = { updatedAt: new Date() };
    if (planTier !== undefined) updates.planTier = planTier;
    if (maxClients !== undefined) updates.maxClients = maxClients;
    if (maxUsers !== undefined) updates.maxUsers = maxUsers;
    if (trialDays !== undefined) {
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + Number(trialDays));
      updates.trialEndsAt = trialEndsAt;
      updates.planTier = "trial";
    }
    const [tenant] = await db.update(tenants).set(updates).where(eq(tenants.id, req.params.id)).returning();
    return reply.send({ success: true, data: tenant });
  });

  // PLAN INFO - TENANT GET OWN PLAN
  fastify.get("/plan-info", { preHandler: [authenticate] }, async (req: any, reply: any) => {
    const { tenantId } = req.tenantContext;
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId));
    const settings = await db.execute(sql`SELECT key, value FROM plan_settings`);
    const rows = (settings as any).rows ?? (Array.isArray(settings) ? settings : []);
    const cfg: any = {};
    rows.forEach((r: any) => { cfg[r.key] = r.value; });
    
    const now = new Date();
    const trialEndsAt = tenant.trialEndsAt ? new Date(tenant.trialEndsAt) : null;
    const isTrialActive = tenant.planTier === "trial" && trialEndsAt && trialEndsAt > now;
    const trialDaysLeft = isTrialActive ? Math.ceil((trialEndsAt!.getTime() - now.getTime()) / 86400000) : 0;
    const effectivePlan = isTrialActive ? "trial" : (tenant.planTier === "trial" ? "basic" : tenant.planTier);
    
    return reply.send({ success: true, data: {
      planTier: tenant.planTier,
      effectivePlan,
      isTrialActive,
      trialDaysLeft,
      trialEndsAt: tenant.trialEndsAt,
      maxClients: effectivePlan === "basic" ? Number(cfg.free_max_clients ?? 30) : tenant.maxClients,
      maxUsers: effectivePlan === "basic" ? 1 : tenant.maxUsers,
      maxAppointmentsMonth: effectivePlan === "basic" ? Number(cfg.free_max_appointments_month ?? 50) : -1,
      features: {
        whatsapp: effectivePlan !== "basic",
        automations: effectivePlan !== "basic",
        campaigns: effectivePlan !== "basic",
        reports: effectivePlan !== "basic",
        commissions: effectivePlan !== "basic",
        inventory: effectivePlan !== "basic",
      },
      whatsappLimits: {
        minIntervalSeconds: Number(cfg.whatsapp_min_interval_seconds ?? 20),
        maxIntervalSeconds: Number(cfg.whatsapp_max_interval_seconds ?? 60),
        dailyLimitNew: Number(cfg.whatsapp_daily_limit_new ?? 50),
        dailyLimitWarm: Number(cfg.whatsapp_daily_limit_warm ?? 200),
        dailyLimitMature: Number(cfg.whatsapp_daily_limit_mature ?? 500),
        sendStartHour: Number(cfg.whatsapp_send_start_hour ?? 8),
        sendEndHour: Number(cfg.whatsapp_send_end_hour ?? 20),
      }
    }});
  });

  fastify.delete("/super-admin/tenants/:id","""

if old in content:
    open('C:/projetos/beautytech-v2/backend/src/modules/all-modules.ts', 'w', encoding='utf-8').write(content.replace(old, new, 1))
    print('CORRIGIDO')
else:
    print('TRECHO NAO ENCONTRADO')
