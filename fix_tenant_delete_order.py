path = "backend/src/modules/all-modules.ts"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old_block = """      await db.execute(sql`DELETE FROM audit_logs WHERE tenant_id=${tid}`);
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
      await db.execute(sql`DELETE FROM tenants WHERE id=${tid}`);"""

new_block = """      // Nivel 1: tabelas mais profundas (dependem de appointments/protocols/products)
      await db.execute(sql`DELETE FROM protocol_sessions WHERE tenant_id=${tid}`);
      await db.execute(sql`DELETE FROM protocol_steps WHERE protocol_id IN (SELECT id FROM protocols WHERE tenant_id=${tid})`);
      await db.execute(sql`DELETE FROM stock_movements WHERE product_id IN (SELECT id FROM products WHERE tenant_id=${tid})`);
      await db.execute(sql`DELETE FROM appointment_photos WHERE tenant_id=${tid}`);
      await db.execute(sql`DELETE FROM appointment_services WHERE tenant_id=${tid}`);
      await db.execute(sql`DELETE FROM commissions WHERE tenant_id=${tid}`);
      await db.execute(sql`DELETE FROM reviews WHERE tenant_id=${tid}`);
      await db.execute(sql`DELETE FROM financial_transactions WHERE tenant_id=${tid}`);

      // Nivel 2: tabelas que dependem de clients
      await db.execute(sql`DELETE FROM gift_cards WHERE tenant_id=${tid}`);
      await db.execute(sql`DELETE FROM loyalty_transactions WHERE tenant_id=${tid}`);
      await db.execute(sql`DELETE FROM notifications WHERE tenant_id=${tid}`);
      await db.execute(sql`DELETE FROM referrals WHERE tenant_id=${tid}`);
      await db.execute(sql`DELETE FROM leads WHERE tenant_id=${tid}`);
      await db.execute(sql`DELETE FROM package_sessions WHERE client_id IN (SELECT id FROM clients WHERE tenant_id=${tid})`);
      await db.execute(sql`DELETE FROM consent_forms WHERE tenant_id=${tid}`);
      await db.execute(sql`DELETE FROM client_records WHERE tenant_id=${tid}`);
      await db.execute(sql`DELETE FROM packages WHERE tenant_id=${tid}`);
      await db.execute(sql`DELETE FROM treatment_packages WHERE tenant_id=${tid}`);

      // Nivel 3: agendamentos e protocolos
      await db.execute(sql`DELETE FROM appointments WHERE tenant_id=${tid}`);
      await db.execute(sql`DELETE FROM protocols WHERE tenant_id=${tid}`);
      await db.execute(sql`DELETE FROM products WHERE tenant_id=${tid}`);

      // Nivel 4: tabelas que dependem de professionals
      await db.execute(sql`DELETE FROM portfolio_images WHERE professional_id IN (SELECT id FROM professionals WHERE tenant_id=${tid})`);
      await db.execute(sql`DELETE FROM professional_services WHERE tenant_id=${tid}`);
      await db.execute(sql`DELETE FROM professional_blocks WHERE tenant_id=${tid}`);
      await db.execute(sql`DELETE FROM professional_schedules WHERE tenant_id=${tid}`);
      await db.execute(sql`DELETE FROM goals WHERE tenant_id=${tid}`);

      // Nivel 5: catalogo de servicos
      await db.execute(sql`DELETE FROM services WHERE tenant_id=${tid}`);

      // Nivel 6: entidades principais (clients antes de professionals, por causa de preferred_professional_id)
      await db.execute(sql`DELETE FROM clients WHERE tenant_id=${tid}`);
      await db.execute(sql`DELETE FROM professionals WHERE tenant_id=${tid}`);

      // Nivel 7: categorias e cadastros auxiliares
      await db.execute(sql`DELETE FROM financial_accounts WHERE tenant_id=${tid}`);
      await db.execute(sql`DELETE FROM financial_categories WHERE tenant_id=${tid}`);
      await db.execute(sql`DELETE FROM product_categories WHERE tenant_id=${tid}`);
      await db.execute(sql`DELETE FROM service_categories WHERE tenant_id=${tid}`);
      await db.execute(sql`DELETE FROM suppliers WHERE tenant_id=${tid}`);

      // Nivel 8: tabelas independentes (so dependem de tenant_id)
      await db.execute(sql`DELETE FROM audit_logs WHERE tenant_id=${tid}`);
      await db.execute(sql`DELETE FROM automation_settings WHERE tenant_id=${tid}`);
      await db.execute(sql`DELETE FROM campaigns WHERE tenant_id=${tid}`);
      await db.execute(sql`DELETE FROM message_templates WHERE tenant_id=${tid}`);
      await db.execute(sql`DELETE FROM subscription_notifications WHERE tenant_id=${tid}`);
      await db.execute(sql`DELETE FROM subscriptions WHERE tenant_id=${tid}`);
      await db.execute(sql`DELETE FROM salon_profiles WHERE tenant_id=${tid}`);
      await db.execute(sql`DELETE FROM promotions WHERE tenant_id=${tid}`);

      // Nivel 9: user_profiles depois de professionals (professionals.user_profile_id -> user_profiles.id)
      await db.execute(sql`DELETE FROM user_profiles WHERE tenant_id=${tid}`);

      // Por ultimo: o tenant em si
      await db.execute(sql`DELETE FROM tenants WHERE id=${tid}`);"""

if old_block in content:
    content = content.replace(old_block, new_block)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("OK: ordem de exclusao do tenant corrigida (44 statements, ordem topologica correta)")
else:
    print("AVISO: bloco original nao encontrado - nenhuma alteracao feita. Verifique indentacao/espacos.")
