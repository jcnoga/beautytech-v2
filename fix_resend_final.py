content = '''import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = `${process.env.RESEND_FROM_NAME ?? "ZenSalon"} <${process.env.RESEND_FROM_EMAIL ?? "noreply@zensalon.com.br"}>`;
const FRONTEND = process.env.FRONTEND_URL ?? "https://www.zensalon.com.br";

export async function sendWelcomeEmail(to: string, salonName: string) {
  try {
    await resend.emails.send({
      from: FROM, to,
      subject: `Bem-vindo ao ZenSalon, ${salonName}!`,
      html: `<div style="font-family:sans-serif;max-width:560px;margin:auto;padding:32px;background:#fff;">
        <h1 style="color:#1a0a2e;">ZenSalon</h1>
        <h2 style="color:#1a0a2e;">Ola, ${salonName}!</h2>
        <p style="color:#444;line-height:1.6;">Sua conta foi criada com sucesso. Voce esta no <strong>periodo de teste gratuito de 7 dias</strong> com acesso completo a plataforma.</p>
        <ul style="color:#444;line-height:2;">
          <li>Cadastrar seus profissionais</li>
          <li>Configurar seus servicos e precos</li>
          <li>Agendar os primeiros clientes</li>
          <li>Ativar o WhatsApp automatico</li>
        </ul>
        <div style="text-align:center;margin:32px 0;">
          <a href="${FRONTEND}" style="background:#2d1b69;color:#fff;padding:14px 32px;border-radius:99px;text-decoration:none;font-weight:700;">Acessar meu painel</a>
        </div>
        <p style="color:#6b5e8a;font-size:13px;text-align:center;">Equipe ZenSalon</p>
      </div>`,
    });
    console.log(`[RESEND] Boas-vindas enviado para ${to}`);
  } catch (e: any) { console.error(`[RESEND] Erro boas-vindas:`, e.message); }
}

export async function sendProActivatedEmail(to: string, salonName: string) {
  try {
    await resend.emails.send({
      from: FROM, to,
      subject: `Plano Pro ativado - ${salonName}`,
      html: `<div style="font-family:sans-serif;max-width:560px;margin:auto;padding:32px;background:#fff;">
        <h1 style="color:#1a0a2e;">ZenSalon</h1>
        <h2 style="color:#166534;">Plano Pro Ativado!</h2>
        <p style="color:#444;">Seu pagamento foi confirmado. Agora voce tem acesso ilimitado a todos os recursos.</p>
        <ul style="color:#444;line-height:2;">
          <li>Clientes e agendamentos ilimitados</li>
          <li>WhatsApp automatico ativo</li>
          <li>Relatorios financeiros completos</li>
          <li>Campanhas de marketing</li>
          <li>Programa de fidelidade</li>
        </ul>
        <div style="text-align:center;margin:32px 0;">
          <a href="${FRONTEND}" style="background:#2d1b69;color:#fff;padding:14px 32px;border-radius:99px;text-decoration:none;font-weight:700;">Acessar meu painel</a>
        </div>
        <p style="color:#6b5e8a;font-size:13px;text-align:center;">Obrigado por escolher o ZenSalon!</p>
      </div>`,
    });
    console.log(`[RESEND] Pro ativado enviado para ${to}`);
  } catch (e: any) { console.error(`[RESEND] Erro pro ativado:`, e.message); }
}

export async function sendPaymentOverdueEmail(to: string, salonName: string) {
  try {
    await resend.emails.send({
      from: FROM, to,
      subject: `Pagamento pendente - ${salonName}`,
      html: `<div style="font-family:sans-serif;max-width:560px;margin:auto;padding:32px;background:#fff;">
        <h1 style="color:#1a0a2e;">ZenSalon</h1>
        <h2 style="color:#991b1b;">Pagamento pendente</h2>
        <p style="color:#444;">Ola, <strong>${salonName}</strong>. Identificamos um pagamento em atraso. Regularize para reativar todos os recursos Pro.</p>
        <div style="text-align:center;margin:32px 0;">
          <a href="${FRONTEND}" style="background:#ef4444;color:#fff;padding:14px 32px;border-radius:99px;text-decoration:none;font-weight:700;">Regularizar pagamento</a>
        </div>
        <p style="color:#6b5e8a;font-size:13px;text-align:center;">Equipe ZenSalon</p>
      </div>`,
    });
    console.log(`[RESEND] Pagamento vencido enviado para ${to}`);
  } catch (e: any) { console.error(`[RESEND] Erro pagamento vencido:`, e.message); }
}

export async function sendOwnerNotificationEmail(salonName: string, phone: string, hora: string) {
  const ownerEmail = process.env["NOTIFY_OWNER_EMAIL"];
  if (!ownerEmail) return;
  try {
    await resend.emails.send({
      from: FROM, to: ownerEmail,
      subject: "Novo salao conectou o WhatsApp - " + salonName,
      html: `<div style="font-family:sans-serif;max-width:560px;margin:auto;padding:32px;background:#fff;">
        <h1 style="color:#1a0a2e;">ZenSalon</h1>
        <h2 style="color:#166534;">Salao Conectado ao WhatsApp!</h2>
        <p><strong>Salao:</strong> ${salonName}</p>
        <p><strong>Numero:</strong> ${phone}</p>
        <p><strong>Horario:</strong> ${hora}</p>
      </div>`,
    });
    console.log("[RESEND] Notificacao dono enviada para " + ownerEmail);
  } catch (e: any) { console.error("[RESEND] Erro notificacao dono:", e.message); }
}

export async function sendAppointmentReminderEmail({ to, clientName, tenantName, serviceName, date, time, professionalName }: {
  to: string; clientName: string; tenantName: string; serviceName: string; date: string; time: string; professionalName?: string;
}) {
  try {
    await resend.emails.send({
      from: FROM, to,
      subject: "Agendamento confirmado - " + tenantName,
      html: `<div style="font-family:sans-serif;max-width:560px;margin:auto;padding:32px;background:#fff;">
        <h1 style="color:#1a0a2e;">${tenantName}</h1>
        <h2 style="color:#166534;">Agendamento Confirmado!</h2>
        <p><strong>Cliente:</strong> ${clientName}</p>
        <p><strong>Servico:</strong> ${serviceName}</p>
        ${professionalName ? `<p><strong>Profissional:</strong> ${professionalName}</p>` : ""}
        <p><strong>Data:</strong> ${date}</p>
        <p><strong>Horario:</strong> ${time}</p>
        <p style="color:#6b5e8a;font-size:12px;">Voce recebera um lembrete 24h antes do horario.</p>
      </div>`,
    });
    console.log("[RESEND] Confirmacao agendamento enviada para " + to);
  } catch (e: any) { console.error("[RESEND] Erro confirmacao agendamento:", e.message); }
}
'''
open('C:/projetos/beautytech-v2/backend/src/modules/resend.module.ts', 'w', encoding='utf-8').write(content)
print("OK - resend.module.ts reescrito limpo")
