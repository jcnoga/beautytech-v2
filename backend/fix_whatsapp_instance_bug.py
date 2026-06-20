import sys
import unicodedata

# --- BACKEND: persistir whatsapp_instance no update ---
path_backend = r"C:\projetos\beautytech-v2\backend\src\modules\all-modules.ts"

with open(path_backend, "r", encoding="utf-8") as f:
    content_be = unicodedata.normalize("NFC", f.read())

old_be = """  fastify.patch("/super-admin/tenants/:id/whatsapp-mode", { preHandler: [requireSuperAdmin] }, async (req: any, reply) => {
    const { whatsapp_mode, whatsapp_api_url, whatsapp_api_key, whatsapp_instance } = req.body as any;
    const valid = ["manual", "local", "zapi", "cloud"];
    if (!valid.includes(whatsapp_mode)) return reply.status(400).send({ success: false, error: "Modo invalido" });
    const [tenant] = await db.update(tenants).set({
      whatsappMode: whatsapp_mode,
      whatsappApiUrl: whatsapp_api_url ?? null,
      whatsappApiKey: whatsapp_api_key ?? null,
      updatedAt: new Date(),
    }).where(eq(tenants.id, req.params.id)).returning();
    return reply.send({ success: true, data: tenant });
  });"""

new_be = """  fastify.patch("/super-admin/tenants/:id/whatsapp-mode", { preHandler: [requireSuperAdmin] }, async (req: any, reply) => {
    const { whatsapp_mode, whatsapp_api_url, whatsapp_api_key, whatsapp_instance } = req.body as any;
    const valid = ["manual", "local", "zapi", "cloud"];
    if (!valid.includes(whatsapp_mode)) return reply.status(400).send({ success: false, error: "Modo invalido" });
    const [tenant] = await db.update(tenants).set({
      whatsappMode: whatsapp_mode,
      whatsappApiUrl: whatsapp_api_url ?? null,
      whatsappApiKey: whatsapp_api_key ?? null,
      whatsappInstance: whatsapp_instance ?? null,
      updatedAt: new Date(),
    }).where(eq(tenants.id, req.params.id)).returning();
    return reply.send({ success: true, data: tenant });
  });"""

old_be = unicodedata.normalize("NFC", old_be)
new_be = unicodedata.normalize("NFC", new_be)

if old_be not in content_be:
    sys.exit("ERRO: trecho do backend (whatsapp-mode endpoint) nao encontrado")

content_be = content_be.replace(old_be, new_be, 1)

with open(path_backend, "w", encoding="utf-8") as f:
    f.write(content_be)

print("OK: whatsappInstance agora e persistido no backend")
