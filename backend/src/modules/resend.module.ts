import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = `${process.env.RESEND_FROM_NAME 🎉 "ZenSalon"} <${process.env.RESEND_FROM_EMAIL 🎉 "noreply@zensalon.com.br"}>`;

// -- Boas-vindas no cadastro ----------------------------------
export async function sendWelcomeEmail(to: string, salonName: string) {
  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: `Bem-vindo ao BeautyTech, ${salonName}!`,
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:auto;padding:32px;background:#fff;">
          <div style="text-align:center;margin-bottom:32px;">
            <h1 style="font-size:28px;color:#1a0a2e;margin:0;">✨ BeautyTech</h1>
            <p style="color:#6b5e8a;margin:4px 0 0;">Gest�o inteligente para sal�es de beleza</p>
          </div>
          <h2 style="color:#1a0a2e;">Ol�, ${salonName}! 🎉</h2>
          <p style="color:#444;line-height:1.6;">
            Sua conta foi criada com sucesso. Voc� est� no <strong>per�odo de teste gratuito de 7 dias</strong> com acesso completo � plataforma.
          </p>
          <div style="background:#f5f3ff;border-radius:12px;padding:20px;margin:24px 0;">
            <p style="margin:0;color:#2d1b69;font-weight:600;">🎉 O que voc� pode fazer agora:</p>
            <ul style="color:#444;line-height:2;margin:8px 0 0;padding-left:20px;">
              <li>Cadastrar seus profissionais</li>
              <li>Configurar seus servi�os e pre�os</li>
              <li>Agendar os primeiros clientes</li>
              <li>Ativar o WhatsApp autom�tico</li>
            </ul>
          </div>
          <div style="text-align:center;margin:32px 0;">
            <a href="${process.env.FRONTEND_URL || "https://beautytech-v2.vercel.app"}"
               style="background:linear-gradient(135deg,#2d1b69,#4a2c9e);color:#fff;padding:14px 32px;border-radius:99px;text-decoration:none;font-weight:700;font-size:16px;">
              Acessar meu painel →
            </a>
          </div>
          <p style="color:#6b5e8a;font-size:13px;text-align:center;">
            D�vidas✨ Responda este e-mail ou fale no WhatsApp.<br>
            Equipe BeautyTech
          </p>
        </div>
      `,
    });
    console.log(`[RESEND] Boas-vindas enviado para ${to}`);
  } catch (e: any) {
    console.error(`[RESEND] Erro boas-vindas:`, e.message);
  }
}

// -- Plano Pro ativado ----------------------------------------
export async function sendProActivatedEmail(to: string, salonName: string) {
  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: `🎉 Plano Pro ativado � ${salonName}`,
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:auto;padding:32px;background:#fff;">
          <div style="text-align:center;margin-bottom:32px;">
            <h1 style="font-size:28px;color:#1a0a2e;margin:0;">✨ BeautyTech</h1>
          </div>
          <div style="text-align:center;padding:32px;background:linear-gradient(135deg,#2d1b69,#4a2c9e);border-radius:16px;margin-bottom:24px;">
            <div style="font-size:48px;">🎉</div>
            <h2 style="color:#ffd700;margin:8px 0;">Plano Pro Ativado!</h2>
            <p style="color:rgba(255,255,255,.8);margin:0;">${salonName}</p>
          </div>
          <p style="color:#444;line-height:1.6;">
            Seu pagamento foi confirmado e o <strong>Plano Pro</strong> est� ativo. Agora voc� tem acesso ilimitado a todos os recursos da plataforma.
          </p>
          <div style="background:#f0fdf4;border-radius:12px;padding:20px;margin:24px 0;border-left:4px solid #22c55e;">
            <p style="margin:0;color:#166534;font-weight:600;">✨ Recursos Pro desbloqueados:</p>
            <ul style="color:#444;line-height:2;margin:8px 0 0;padding-left:20px;">
              <li>Clientes e agendamentos ilimitados</li>
              <li>WhatsApp autom�tico ativo</li>
              <li>Relat�rios financeiros completos</li>
              <li>Campanhas de marketing</li>
              <li>Programa de fidelidade</li>
            </ul>
          </div>
          <div style="text-align:center;margin:32px 0;">
            <a href="${process.env.FRONTEND_URL || "https://beautytech-v2.vercel.app"}"
               style="background:linear-gradient(135deg,#2d1b69,#4a2c9e);color:#fff;padding:14px 32px;border-radius:99px;text-decoration:none;font-weight:700;font-size:16px;">
              Acessar meu painel →
            </a>
          </div>
          <p style="color:#6b5e8a;font-size:13px;text-align:center;">
            Obrigado por escolher o BeautyTech! 🎉<br>
            Equipe BeautyTech
          </p>
        </div>
      `,
    });
    console.log(`[RESEND] Pro ativado enviado para ${to}`);
  } catch (e: any) {
    console.error(`[RESEND] Erro pro ativado:`, e.message);
  }
}

// -- Pagamento vencido ----------------------------------------
export async function sendPaymentOverdueEmail(to: string, salonName: string) {
  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: `⚠️ Pagamento pendente � ${salonName}`,
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:auto;padding:32px;background:#fff;">
          <div style="text-align:center;margin-bottom:32px;">
            <h1 style="font-size:28px;color:#1a0a2e;margin:0;">✨ BeautyTech</h1>
          </div>
          <div style="background:#fef2f2;border-radius:12px;padding:20px;margin-bottom:24px;border-left:4px solid #ef4444;">
            <h2 style="color:#991b1b;margin:0 0 8px;">⚠️ Pagamento pendente</h2>
            <p style="color:#444;margin:0;">Seu plano Pro foi suspenso por falta de pagamento.</p>
          </div>
          <p style="color:#444;line-height:1.6;">
            Ol�, <strong>${salonName}</strong>. Identificamos um pagamento em atraso. Regularize para reativar todos os recursos Pro.
          </p>
          <div style="text-align:center;margin:32px 0;">
            <a href="${process.env.FRONTEND_URL || "https://beautytech-v2.vercel.app"}"
               style="background:#ef4444;color:#fff;padding:14px 32px;border-radius:99px;text-decoration:none;font-weight:700;font-size:16px;">
              Regularizar pagamento →
            </a>
          </div>
          <p style="color:#6b5e8a;font-size:13px;text-align:center;">Equipe BeautyTech</p>
        </div>
      `,
    });
    console.log(`[RESEND] Pagamento vencido enviado para ${to}`);
  } catch (e: any) {
    console.error(`[RESEND] Erro pagamento vencido:`, e.message);
  }
}

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

// -- Confirmacao de agendamento para o cliente ----------------
export async function sendAppointmentReminderEmail({ to, clientName, tenantName, serviceName, date, time, professionalName }: {
  to: string; clientName: string; tenantName: string; serviceName: string; date: string; time: string; professionalName✨: string;
}) {
  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: "Agendamento confirmado - " + tenantName,
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:auto;padding:32px;background:#fff;">
          <div style="text-align:center;margin-bottom:24px;">
            <h1 style="font-size:24px;color:#1a0a2e;margin:0;">${tenantName}</h1>
          </div>
          <div style="background:#f0fdf4;border-radius:12px;padding:24px;border-left:4px solid #22c55e;margin-bottom:24px;">
            <h2 style="color:#166534;margin:0 0 16px;">Agendamento Confirmado!</h2>
            <table style="width:100%;border-collapse:collapse;">
              <tr><td style="color:#666;padding:6px 0;width:130px;">Cliente:</td><td style="color:#1a0a2e;font-weight:700;">${clientName}</td></tr>
              <tr><td style="color:#666;padding:6px 0;">Servico:</td><td style="color:#1a0a2e;font-weight:700;">${serviceName}</td></tr>
              ${professionalName ✨ `<tr><td style="color:#666;padding:6px 0;">Profissional:</td><td style="color:#1a0a2e;">${professionalName}</td></tr>` : ""}
              <tr><td style="color:#666;padding:6px 0;">Data:</td><td style="color:#1a0a2e;font-weight:700;">${date}</td></tr>
              <tr><td style="color:#666;padding:6px 0;">Horario:</td><td style="color:#1a0a2e;font-weight:700;">${time}</td></tr>
            </table>
          </div>
          <p style="color:#6b5e8a;font-size:12px;text-align:center;">
            Voce receberá um lembrete 24h antes do horario.<br>${tenantName}
          </p>
        </div>
      `,
    });
    console.log("[RESEND] Confirmacao agendamento enviada para " + to);
  } catch (e: any) {
    console.error("[RESEND] Erro confirmacao agendamento:", e.message);
  }
}
