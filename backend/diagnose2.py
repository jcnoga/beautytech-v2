path = r"C:\projetos\beautytech-v2\backend\src\modules\appointments\appointments.routes.ts"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

lines_to_check = [
    '// Dispara e-mail de confirmação (fire and forget)',
    '    try {',
    '      const clientData = await db.select({ email: clients.email, fullName: clients.fullName })',
    '        .from(clients).where(eq(clients.id, clientId));',
    '      const tenantData = await db.select({ name: tenants.name })',
    '        .from(tenants).where(eq(tenants.id, tenant.id));',
    '      const proData = await db.select({ fullName: professionals.fullName })',
    '        .from(professionals).where(eq(professionals.id, professionalId));',
    '',
    'if (clientData[0]?.email) {',
    '        const { sendAppointmentReminderEmail } = await import("../resend.module.js");',
    '        await sendAppointmentReminderEmail({',
    '          to: clientData[0].email,',
    '          clientName: clientData[0].fullName ?? "Cliente",',
    '          tenantName: tenantData[0]?.name ?? "Salao",',
    '          serviceName: service.name,',
    '          date: new Date(scheduledAt).toLocaleDateString("pt-BR"),',
    '          time: time,',
    '          professionalName: proData[0]?.fullName ?? undefined,',
    '        });',
    '      }',
    '    } catch (emailErr: any) {',
    '      console.error("[BOOKING] Erro ao enviar e-mail de confirmacao:", emailErr.message);',
    '    }',
]

block = lines_to_check[0]
print(f"Linha 1 sozinha: {'OK' if block in content else 'FALHOU'}")

for i in range(1, len(lines_to_check)):
    candidate = block + "\n" + lines_to_check[i]
    ok = candidate in content
    print(f"Linhas 1-{i+1} juntas: {'OK' if ok else 'QUEBROU AQUI'}")
    if not ok:
        idx = content.find(block)
        if idx >= 0:
            real_after = content[idx:idx+len(block)+60]
            print(f"  Texto real no arquivo a partir da linha {i}: {repr(real_after)}")
        break
    block = candidate
else:
    print("\nTODAS as linhas bateram como bloco continuo - bloco completo encontrado!")
