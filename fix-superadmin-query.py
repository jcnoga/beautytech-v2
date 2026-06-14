path = r"C:\projetos\beautytech-v2\backend\src\modules\all-modules.ts"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = 'const data = await db.select({ id: tenants.id, name: tenants.name, slug: tenants.slug, email: tenants.email, phone: tenants.phone, planTier: tenants.planTier, isActive: tenants.isActive, trialEndsAt: tenants.trialEndsAt, createdAt: tenants.createdAt, maxUsers: tenants.maxUsers }).from(tenants).where(and(...cond)).orderBy(desc(tenants.createdAt));'

new = 'const data = await db.select({ id: tenants.id, name: tenants.name, slug: tenants.slug, email: tenants.email, phone: tenants.phone, planTier: tenants.planTier, isActive: tenants.isActive, trialEndsAt: tenants.trialEndsAt, createdAt: tenants.createdAt, maxUsers: tenants.maxUsers, whatsapp_status: tenants.whatsappStatus, whatsapp_phone: tenants.whatsappPhone, whatsapp_connected_at: tenants.whatsappConnectedAt, whatsapp_mode: tenants.whatsappMode }).from(tenants).where(and(...cond)).orderBy(desc(tenants.createdAt));'

if old in content:
    content = content.replace(old, new)
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(content)
    print("OK - query atualizada com campos WhatsApp")
else:
    print("ATENCAO - trecho nao encontrado")
    idx = content.find("super-admin/tenants")
    print(content[max(0,idx-50):idx+400])
