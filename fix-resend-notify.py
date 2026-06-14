path = r"C:\projetos\beautytech-v2\backend\src\modules\resend.module.ts"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Adicionar funcao de notificacao para o dono no final do arquivo
extra = '''
// -- Notificacao para o dono do SaaS -------------------------
export async function sendOwnerNotificationEmail(salonName: string, phone: string, hora: string) {
  const ownerEmail = process.env["NOTIFY_OWNER_EMAIL"];
  if (!ownerEmail) return;
  try {
    await resend.emails.send({
      from: FROM,
      to: ownerEmail,
      subject: "Novo salao conectou o WhatsApp - " + salonName,
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:auto;padding:32px;background:#fff;">
          <div style="text-align:center;margin-bottom:24px;">
            <h1 style="font-size:24px;color:#1a0a2e;margin:0;">ZenSalon</h1>
            <p style="color:#6b5e8a;margin:4px 0 0;">Notificacao do sistema</p>
          </div>
          <div style="background:#f0fdf4;border-radius:12px;padding:24px;border-left:4px solid #22c55e;">
            <h2 style="color:#166534;margin:0 0 16px;">Salao Conectado ao WhatsApp!</h2>
            <table style="width:100%;border-collapse:collapse;">
              <tr><td style="color:#666;padding:6px 0;width:120px;">Salao:</td><td style="color:#1a0a2e;font-weight:700;">${salonName}</td></tr>
              <tr><td style="color:#666;padding:6px 0;">Numero:</td><td style="color:#1a0a2e;font-weight:700;">${phone}</td></tr>
              <tr><td style="color:#666;padding:6px 0;">Horario:</td><td style="color:#1a0a2e;">${hora}</td></tr>
            </table>
          </div>
          <p style="color:#6b5e8a;font-size:12px;text-align:center;margin-top:24px;">
            ZenSalon - Painel Super Admin
          </p>
        </div>
      `,
    });
    console.log("[RESEND] Notificacao dono enviada para " + ownerEmail);
  } catch (e: any) {
    console.error("[RESEND] Erro notificacao dono:", e.message);
  }
}
'''

content = content + extra

with open(path, "w", encoding="utf-8", newline="\n") as f:
    f.write(content)
print("OK - funcao de notificacao adicionada")
