import io

with io.open('backend/src/modules/appointments/appointments.routes.ts', 'r', encoding='utf-8') as f:
    lines = f.readlines()

wa_block = '''    // Dispara WhatsApp de confirmacao (fire and forget)
    try {
      const clientWa = await db.select({ whatsapp: clients.whatsapp, fullName: clients.fullName })
        .from(clients).where(eq(clients.id, clientId));
      if (clientWa[0]?.whatsapp) {
        const { sendTextMessage } = await import("../whatsapp/whatsapp.service.js");
        const dateStr = new Date(scheduledAt).toLocaleDateString("pt-BR");
        await sendTextMessage(clientWa[0].whatsapp, "Ola " + (clientWa[0].fullName ?? "") + "! Seu agendamento esta confirmado para " + dateStr + " as " + time + ". Ate la!", tenant.id);
      }
    } catch (waErr: any) {
      console.error("[BOOKING] Erro ao enviar WhatsApp de confirmacao:", waErr.message);
    }
'''

insert_after = None
for i, line in enumerate(lines):
    if 'console.error("[BOOKING] Erro ao enviar e-mail de confirmacao:"' in line:
        insert_after = i + 2
        break

if insert_after:
    lines.insert(insert_after, wa_block)
    with io.open('backend/src/modules/appointments/appointments.routes.ts', 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print('OK - inserido na linha ' + str(insert_after))
else:
    print('ERRO: linha nao encontrada')
