path = r"C:\projetos\beautytech-v2\backend\src\modules\whatsapp\whatsapp.routes.ts"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Adicionar import do sendOwnerNotificationEmail
old_import = 'import { db } from "../../db/connection.js";'
new_import = 'import { db } from "../../db/connection.js";\nimport { sendOwnerNotificationEmail } from "../email.module.js";'

# Adicionar chamada apos o update do banco
old_notify = '        // Notificar dono do SaaS quando salao conectar pela primeira vez\n        if (isConnected && currentTenant?.whatsappStatus !== "connected") {\n          const ownerPhone = process.env["NOTIFY_OWNER_PHONE"];\n          const apiUrl = process.env["WHATSAPP_API_URL"];\n          const apiKey = process.env["WHATSAPP_API_KEY"];\n          const instance = process.env["WHATSAPP_INSTANCE"];\n          if (ownerPhone && apiUrl && apiKey && instance) {\n            try {\n              const phone = data.number ?? "desconhecido";\n              const name = currentTenant?.name ?? tenantId;\n              const hora = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });\n              const msg = "?? *Salao Conectado!*\\\\n\\\\n" +\n                "*Salao:* " + name + "\\\\n" +\n                "*Numero:* " + phone + "\\\\n" +\n                "*Horario:* " + hora;\n              await fetch(apiUrl + "/message/sendText/" + instance, {\n                method: "POST",\n                headers: { "Content-Type": "application/json", "apikey": apiKey },\n                body: JSON.stringify({ number: ownerPhone, text: msg }),\n              });\n            } catch (e) {\n              console.error("Erro ao notificar dono:", e);\n            }\n          }\n        }'

new_notify = '        // Notificar dono do SaaS quando salao conectar pela primeira vez\n        if (isConnected && currentTenant?.whatsappStatus !== "connected") {\n          const phone = data.number ?? "desconhecido";\n          const name = currentTenant?.name ?? tenantId;\n          const hora = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });\n          // Tentar WhatsApp\n          const ownerPhone = process.env["NOTIFY_OWNER_PHONE"];\n          const apiUrl = process.env["WHATSAPP_API_URL"];\n          const apiKey = process.env["WHATSAPP_API_KEY"];\n          const instance = process.env["WHATSAPP_INSTANCE"];\n          if (ownerPhone && apiUrl && apiKey && instance) {\n            try {\n              const msg = "?? *Salao Conectado!*\\\\n\\\\n" +\n                "*Salao:* " + name + "\\\\n" +\n                "*Numero:* " + phone + "\\\\n" +\n                "*Horario:* " + hora;\n              await fetch(apiUrl + "/message/sendText/" + instance, {\n                method: "POST",\n                headers: { "Content-Type": "application/json", "apikey": apiKey },\n                body: JSON.stringify({ number: ownerPhone, text: msg }),\n              });\n            } catch (e) {\n              console.error("Erro ao notificar dono via WhatsApp:", e);\n            }\n          }\n          // Sempre enviar e-mail\n          await sendOwnerNotificationEmail(name, phone, hora);\n        }'

ok1 = old_import in content
ok2 = old_notify in content

if ok1:
    content = content.replace(old_import, new_import)
    print("OK - import adicionado")
else:
    print("ATENCAO - import nao encontrado")

if ok2:
    content = content.replace(old_notify, new_notify)
    print("OK - chamada email adicionada")
else:
    print("ATENCAO - bloco notify nao encontrado")
    idx = content.find("Notificar dono")
    print(repr(content[max(0,idx-50):idx+300]))

if ok1 or ok2:
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(content)
    print("ARQUIVO SALVO")
