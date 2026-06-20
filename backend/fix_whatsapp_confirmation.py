import sys
import unicodedata

path = r"C:\projetos\beautytech-v2\backend\src\modules\appointments\appointments.routes.ts"

with open(path, "r", encoding="utf-8") as f:
    content = unicodedata.normalize("NFC", f.read())

old = """// Dispara e-mail de confirmação (fire and forget)
    try {
      const clientData = await db.select({ email: clients.email, fullName: clients.fullName })
        .from(clients).where(eq(clients.id, clientId));
      const tenantData = await db.select({ name: tenants.name })
        .from(tenants).where(eq(tenants.id, tenant.id));
      const proData = await db.select({ fullName: professionals.fullName })
        .from(professionals).where(eq(professionals.id, professionalId));

if (clientData[0]?.email) {
        const { sendAppointmentReminderEmail } = await import("../resend.module.js");
        await sendAppointmentReminderEmail({
          to: clientData[0].email,
          clientName: clientData[0].fullName ?? "Cliente",
          tenantName: tenantData[0]?.name ?? "Salao",
          serviceName: service.name,
          date: new Date(scheduledAt).toLocaleDateString("pt-BR"),
          time: time,
          professionalName: proData[0]?.fullName ?? undefined,
        });
      }
    } catch (emailErr: any) {
      console.error("[BOOKING] Erro ao enviar e-mail de confirmacao:", emailErr.message);
    }"""

new = """// Dispara e-mail de confirmação (fire and forget)
    try {
      const clientData = await db.select({ email: clients.email, fullName: clients.fullName, whatsapp: clients.whatsapp })
        .from(clients).where(eq(clients.id, clientId));
      const tenantData = await db.select({ name: tenants.name })
        .from(tenants).where(eq(tenants.id, tenant.id));
      const proData = await db.select({ fullName: professionals.fullName })
        .from(professionals).where(eq(professionals.id, professionalId));

if (clientData[0]?.email) {
        const { sendAppointmentReminderEmail } = await import("../resend.module.js");
        await sendAppointmentReminderEmail({
          to: clientData[0].email,
          clientName: clientData[0].fullName ?? "Cliente",
          tenantName: tenantData[0]?.name ?? "Salao",
          serviceName: service.name,
          date: new Date(scheduledAt).toLocaleDateString("pt-BR"),
          time: time,
          professionalName: proData[0]?.fullName ?? undefined,
        });
      }
      // Dispara confirmacao via WhatsApp (fire and forget)
      if (clientData[0]?.whatsapp) {
        try {
          const { sendTextMessage } = await import("../whatsapp/whatsapp.service.js");
          let waNumber = clientData[0].whatsapp.replace(/\\D/g, "");
          if (waNumber.length === 10 || waNumber.length === 11) waNumber = "55" + waNumber;
          const waMsg = "Ola " + (clientData[0].fullName ?? "Cliente") + "! Seu agendamento na " + (tenantData[0]?.name ?? "Salao") + " foi confirmado.\\n\\n" +
            "Servico: " + service.name + "\\n" +
            "Profissional: " + (proData[0]?.fullName ?? "A definir") + "\\n" +
            "Data: " + new Date(scheduledAt).toLocaleDateString("pt-BR") + "\\n" +
            "Horario: " + time + "\\n\\n" +
            "Ate breve!";
          await sendTextMessage(waNumber, waMsg, tenant.id);
        } catch (waErr: any) {
          console.error("[BOOKING] Erro ao enviar WhatsApp de confirmacao:", waErr.message);
        }
      }
    } catch (emailErr: any) {
      console.error("[BOOKING] Erro ao enviar e-mail de confirmacao:", emailErr.message);
    }"""

old = unicodedata.normalize("NFC", old)
new = unicodedata.normalize("NFC", new)

if old not in content:
    sys.exit("ERRO: trecho nao encontrado")

content = content.replace(old, new, 1)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("OK: confirmacao via WhatsApp adicionada ao endpoint de agendamento")
