import re

path = r"C:\projetos\beautytech-v2\backend\src\modules\all-modules.ts"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = '''  fastify.delete("/super-admin/tenants/:id", { preHandler: [requireSuperAdmin] }, async (req: any, reply) => {
    await db.update(tenants).set({ deletedAt: new Date(), isActive: false, updatedAt: new Date() }).where(eq(tenants.id, req.params.id));
    return reply.send({ success: true });
  });'''

new = '''  fastify.delete("/super-admin/tenants/:id", { preHandler: [requireSuperAdmin] }, async (req: any, reply) => {
    const tid = req.params.id;
    try {
      await db.execute(sql`DELETE FROM audit_logs WHERE tenant_id=${tid}`);
      await db.execute(sql`DELETE FROM automation_settings WHERE tenant_id=${tid}`);
      await db.execute(sql`DELETE FROM campaigns WHERE tenant_id=${tid}`);
      await db.execute(sql`DELETE FROM client_records WHERE tenant_id=${tid}`);
      await db.execute(sql`DELETE FROM commissions WHERE tenant_id=${tid}`);
      await db.execute(sql`DELETE FROM financial_transactions WHERE tenant_id=${tid}`);
      await db.execute(sql`DELETE FROM financial_categories WHERE tenant_id=${tid}`);
      await db.execute(sql`DELETE FROM financial_accounts WHERE tenant_id=${tid}`);
      await db.execute(sql`DELETE FROM gift_cards WHERE tenant_id=${tid}`);
      await db.execute(sql`DELETE FROM goals WHERE tenant_id=${tid}`);
      await db.execute(sql`DELETE FROM loyalty_transactions WHERE tenant_id=${tid}`);
      await db.execute(sql`DELETE FROM message_templates WHERE tenant_id=${tid}`);
      await db.execute(sql`DELETE FROM notifications WHERE tenant_id=${tid}`);
      await db.execute(sql`DELETE FROM packages WHERE tenant_id=${tid}`);
      await db.execute(sql`DELETE FROM referrals WHERE tenant_id=${tid}`);
      await db.execute(sql`DELETE FROM reviews WHERE tenant_id=${tid}`);
      await db.execute(sql`DELETE FROM subscription_notifications WHERE tenant_id=${tid}`);
      await db.execute(sql`DELETE FROM subscriptions WHERE tenant_id=${tid}`);
      await db.execute(sql`DELETE FROM appointments WHERE tenant_id=${tid}`);
      await db.execute(sql`DELETE FROM professional_blocks WHERE tenant_id=${tid}`);
      await db.execute(sql`DELETE FROM professional_schedules WHERE tenant_id=${tid}`);
      await db.execute(sql`DELETE FROM professional_services WHERE tenant_id=${tid}`);
      await db.execute(sql`DELETE FROM service_categories WHERE tenant_id=${tid}`);
      await db.execute(sql`DELETE FROM product_categories WHERE tenant_id=${tid}`);
      await db.execute(sql`DELETE FROM products WHERE tenant_id=${tid}`);
      await db.execute(sql`DELETE FROM services WHERE tenant_id=${tid}`);
      await db.execute(sql`DELETE FROM professionals WHERE tenant_id=${tid}`);
      await db.execute(sql`DELETE FROM clients WHERE tenant_id=${tid}`);
      await db.execute(sql`DELETE FROM user_profiles WHERE tenant_id=${tid}`);
      await db.execute(sql`DELETE FROM tenants WHERE id=${tid}`);
      return reply.send({ success: true });
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({ success: false, error: err.message });
    }
  });'''

if old in content:
    content = content.replace(old, new)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("OK - rota atualizada")
else:
    print("ERRO - trecho nao encontrado")
