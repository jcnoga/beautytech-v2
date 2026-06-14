path = r"C:\projetos\beautytech-v2\backend\src\modules\whatsapp\whatsapp.routes.ts"
with open(path, "r", encoding="utf-8") as f:
    lines = f.readlines()

# Substituir linhas 39-63 (idx 38-62) pelo novo bloco
new_block = [
    '        // Notificar dono do SaaS quando salao conectar pela primeira vez\n',
    '        if (isConnected && currentTenant?.whatsappStatus !== "connected") {\n',
    '          const phone = data.number ?? "desconhecido";\n',
    '          const name = currentTenant?.name ?? tenantId;\n',
    '          const hora = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });\n',
    '          // Tentar WhatsApp\n',
    '          const ownerPhone = process.env["NOTIFY_OWNER_PHONE"];\n',
    '          const apiUrl = process.env["WHATSAPP_API_URL"];\n',
    '          const apiKey = process.env["WHATSAPP_API_KEY"];\n',
    '          const instance = process.env["WHATSAPP_INSTANCE"];\n',
    '          if (ownerPhone && apiUrl && apiKey && instance) {\n',
    '            try {\n',
    '              const msg = "* Salao Conectado!*\\n\\n" +\n',
    '                "*Salao:* " + name + "\\n" +\n',
    '                "*Numero:* " + phone + "\\n" +\n',
    '                "*Horario:* " + hora;\n',
    '              await fetch(apiUrl + "/message/sendText/" + instance, {\n',
    '                method: "POST",\n',
    '                headers: { "Content-Type": "application/json", "apikey": apiKey },\n',
    '                body: JSON.stringify({ number: ownerPhone, text: msg }),\n',
    '              });\n',
    '            } catch (e) {\n',
    '              console.error("Erro ao notificar dono via WhatsApp:", e);\n',
    '            }\n',
    '          }\n',
    '          // Sempre enviar e-mail\n',
    '          await sendOwnerNotificationEmail(name, phone, hora);\n',
    '        }\n',
]

lines[38:63] = new_block

with open(path, "w", encoding="utf-8", newline="\n") as f:
    f.writelines(lines)
print("OK - bloco notify atualizado com email")
