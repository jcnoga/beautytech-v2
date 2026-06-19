path = r'C:\projetos\beautytech-v2\backend\src\modules\all-modules.ts'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

routes = '''
    // ============================================================
    // WHATSAPP PROXY ROUTES
    // ============================================================
    async function evoFetch(tenant: any, path: string, method = "GET") {
      const url = tenant.whatsappApiUrl;
      const key = tenant.whatsappApiKey;
      const instance = tenant.whatsappInstance ?? "zensalon";
      if (!url || !key) throw new Error("WhatsApp nao configurado para este tenant");
      const res = await fetch(`${url}/instance${path}/${instance}`, {
        method,
        headers: { "apikey": key, "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Erro " + res.status);
      return res.json();
    }

    fastify.get("/whatsapp/status", { preHandler: [authenticate] }, async (req: any, reply: any) => {
      const { tenantId } = req.tenantContext;
      const [tenant] = await db.select({
        whatsappApiUrl: tenants.whatsappApiUrl,
        whatsappApiKey: tenants.whatsappApiKey,
        whatsappInstance: tenants.whatsappInstance,
      }).from(tenants).where(eq(tenants.id, tenantId));
      try {
        const d = await evoFetch(tenant, "/connectionState");
        return reply.send({ success: true, data: d });
      } catch(e: any) { return reply.status(400).send({ success: false, error: e.message }); }
    });

    fastify.post("/whatsapp/connect", { preHandler: [authenticate] }, async (req: any, reply: any) => {
      const { tenantId } = req.tenantContext;
      const [tenant] = await db.select({
        whatsappApiUrl: tenants.whatsappApiUrl,
        whatsappApiKey: tenants.whatsappApiKey,
        whatsappInstance: tenants.whatsappInstance,
      }).from(tenants).where(eq(tenants.id, tenantId));
      try {
        const instance = tenant.whatsappInstance ?? "zensalon";
        const url = tenant.whatsappApiUrl;
        const key = tenant.whatsappApiKey;
        if (!url || !key) throw new Error("WhatsApp nao configurado");
        // Cria instancia se nao existir
        await fetch(`${url}/instance/create`, {
          method: "POST",
          headers: { "apikey": key, "Content-Type": "application/json" },
          body: JSON.stringify({ instanceName: instance, qrcode: true }),
        });
        // Busca QR code
        const qr = await fetch(`${url}/instance/connect/${instance}`, {
          headers: { "apikey": key },
        }).then(r => r.json());
        return reply.send({ success: true, data: qr });
      } catch(e: any) { return reply.status(400).send({ success: false, error: e.message }); }
    });

    fastify.post("/whatsapp/disconnect", { preHandler: [authenticate] }, async (req: any, reply: any) => {
      const { tenantId } = req.tenantContext;
      const [tenant] = await db.select({
        whatsappApiUrl: tenants.whatsappApiUrl,
        whatsappApiKey: tenants.whatsappApiKey,
        whatsappInstance: tenants.whatsappInstance,
      }).from(tenants).where(eq(tenants.id, tenantId));
      try {
        await evoFetch(tenant, "/logout");
        return reply.send({ success: true });
      } catch(e: any) { return reply.status(400).send({ success: false, error: e.message }); }
    });
'''

# Insere antes do ultimo fechamento do registerRoutes
marker = '  // ---- FIM DAS ROTAS ----'
if marker in content:
    content = content.replace(marker, routes + '\n' + marker)
    print("OK: marcador encontrado")
else:
    # Tenta inserir antes do ultimo }) do arquivo
    last = content.rfind('\n}')
    if last > 0:
        content = content[:last] + routes + content[last:]
        print("OK: inserido no final")
    else:
        print("ERRO: nao encontrou ponto de insercao")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
