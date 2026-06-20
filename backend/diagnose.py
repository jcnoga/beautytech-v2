import unicodedata

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

print(f"Tamanho do arquivo: {len(content)} caracteres")
print()

for i, line in enumerate(lines_to_check):
    found_exact = line in content
    found_nfc = unicodedata.normalize("NFC", line) in content
    found_nfd = unicodedata.normalize("NFD", line) in content
    found_stripped = line.strip() in content
    status = "OK" if found_exact else "FALHOU"
    print(f"[{status}] Linha {i+1}: exact={found_exact} nfc={found_nfc} nfd={found_nfd} stripped_match={found_stripped}")
    if not found_exact:
        print(f"         Texto procurado: {repr(line)}")
        keyword = line.strip()[:20]
        idx = content.find(keyword)
        if idx >= 0:
            real_line = content[idx-5:idx+len(line)+10]
            print(f"         Texto real no arquivo perto dali: {repr(real_line)}")
        else:
            print(f"         Nem a palavra-chave '{keyword}' foi encontrada no arquivo!")
