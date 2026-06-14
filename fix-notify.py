path = r"C:\projetos\beautytech-v2\backend\src\modules\whatsapp\whatsapp.routes.ts"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = '      // Atualiza status no banco conforme retorno da Evolution API\n      if (data && data.state) {\n        const isConnected = data.state === "open";\n        await db.update(tenants)\n          .set({\n            whatsappStatus: isConnected ? "connected" : "disconnected",\n            whatsappPhone: data.number ?? null,\n            whatsappConnectedAt: isConnected ? new Date() : null,\n          })\n          .where(eq(tenants.id, tenantId));\n      }'

new = '''      // Atualiza status no banco conforme retorno da Evolution API
      if (data && data.state) {
        const isConnected = data.state === "open";

        const [currentTenant] = await db.select({
          whatsappStatus: tenants.whatsappStatus,
          name: tenants.name,
        }).from(tenants).where(eq(tenants.id, tenantId));

        await db.update(tenants)
          .set({
            whatsappStatus: isConnected ? "connected" : "disconnected",
            whatsappPhone: data.number ?? null,
            whatsappConnectedAt: isConnected ? new Date() : null,
          })
          .where(eq(tenants.id, tenantId));

        // Notificar dono do SaaS quando salao conectar pela primeira vez
        if (isConnected && currentTenant?.whatsappStatus !== "connected") {
          const ownerPhone = process.env["NOTIFY_OWNER_PHONE"];
          const apiUrl = process.env["WHATSAPP_API_URL"];
          const apiKey = process.env["WHATSAPP_API_KEY"];
          const instance = process.env["WHATSAPP_INSTANCE"];
          if (ownerPhone && apiUrl && apiKey && instance) {
            try {
              const phone = data.number ?? "desconhecido";
              const name = currentTenant?.name ?? tenantId;
              const hora = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
              const msg = "?? *Salao Conectado!*\\n\\n" +
                "*Salao:* " + name + "\\n" +
                "*Numero:* " + phone + "\\n" +
                "*Horario:* " + hora;
              await fetch(apiUrl + "/message/sendText/" + instance, {
                method: "POST",
                headers: { "Content-Type": "application/json", "apikey": apiKey },
                body: JSON.stringify({ number: ownerPhone, text: msg }),
              });
            } catch (e) {
              console.error("Erro ao notificar dono:", e);
            }
          }
        }
      }'''

if old in content:
    content = content.replace(old, new)
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(content)
    print("OK - notificacao adicionada")
else:
    print("ATENCAO - trecho nao encontrado")
    idx = content.find("Atualiza status no banco")
    print(repr(content[max(0,idx-50):idx+400]))
