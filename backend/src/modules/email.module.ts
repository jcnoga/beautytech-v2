import { Resend } from "resend";
import { env } from "../config/env.js";

const resend = new Resend(env.RESEND_API_KEY);
const FROM = `${env.RESEND_FROM_NAME ?? "ZenSalon"} <${env.RESEND_FROM_EMAIL ?? "noreply@zensalon.com.br"}>`;

export async function sendWelcomeEmail(params: {
  to: string;
  tenantName: string;
  ownerName: string;
  loginUrl?: string;
}) {
  const { to, tenantName, ownerName, loginUrl = "https://app.zensalon.com.br" } = params;
  return resend.emails.send({
    from: FROM,
    to,
    subject: `Bem-vindo ao ZenSalon, ${ownerName}!`,
    html: `
      <div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #f0f0f0">
        <div style="background:linear-gradient(135deg,#C9847A,#8A7BAF);padding:32px;text-align:center">
          <h1 style="color:#fff;margin:0;font-size:24px">ZenSalon</h1>
          <p style="color:#ffffff90;margin:8px 0 0;font-size:14px">Gestao inteligente para o seu salao</p>
        </div>
        <div style="padding:32px">
          <h2 style="color:#1a1a2e;margin:0 0 16px">Ola, ${ownerName}!</h2>
          <p style="color:#555;line-height:1.7;margin:0 0 16px">
            Sua conta do <strong>${tenantName}</strong> foi criada com sucesso.
          </p>
          <div style="background:#f8f8f8;border-radius:8px;padding:20px;margin:24px 0">
            <p style="margin:0 0 8px;color:#888;font-size:13px;font-weight:600">PROXIMOS PASSOS</p>
            <p style="margin:4px 0;color:#333;font-size:14px">Complete o perfil do estabelecimento</p>
            <p style="margin:4px 0;color:#333;font-size:14px">Cadastre seus profissionais</p>
            <p style="margin:4px 0;color:#333;font-size:14px">Adicione servicos e precos</p>
            <p style="margin:4px 0;color:#333;font-size:14px">Compartilhe seu link de agendamento</p>
          </div>
          <div style="text-align:center;margin:28px 0">
            <a href="${loginUrl}" style="background:linear-gradient(135deg,#C9847A,#8A7BAF);color:#fff;padding:14px 32px;border-radius:50px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block">
              Acessar minha conta
            </a>
          </div>
        </div>
        <div style="background:#f8f8f8;padding:16px 32px;text-align:center">
          <p style="color:#bbb;font-size:12px;margin:0">ZenSalon - Todos os direitos reservados.</p>
        </div>
      </div>`,
  });
}

export async function sendProActivatedEmail(params: {
  to: string;
  tenantName: string;
  ownerName: string;
  planName?: string;
}) {
  const { to, tenantName, ownerName, planName = "Pro" } = params;
  return resend.emails.send({
    from: FROM,
    to,
    subject: `Plano ${planName} ativado - ${tenantName}`,
    html: `
      <div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #f0f0f0">
        <div style="background:linear-gradient(135deg,#C9847A,#8A7BAF);padding:32px;text-align:center">
          <h1 style="color:#fff;margin:0;font-size:24px">ZenSalon</h1>
        </div>
        <div style="padding:32px">
          <h2 style="color:#1a1a2e;margin:0 0 16px">Plano ${planName} ativado!</h2>
          <p style="color:#555;line-height:1.7;margin:0 0 16px">
            Parabens, ${ownerName}! O plano <strong>${planName}</strong> do <strong>${tenantName}</strong> esta ativo.
          </p>
          <div style="background:#f0fdf4;border:1px solid #22c55e30;border-radius:8px;padding:20px;margin:24px 0">
            <p style="margin:0 0 8px;color:#16a34a;font-size:13px;font-weight:700">RECURSOS DESBLOQUEADOS</p>
            <p style="margin:4px 0;color:#333;font-size:14px">Agendamentos ilimitados</p>
            <p style="margin:4px 0;color:#333;font-size:14px">WhatsApp automatico</p>
            <p style="margin:4px 0;color:#333;font-size:14px">Relatorios avancados</p>
            <p style="margin:4px 0;color:#333;font-size:14px">CRM e fidelidade</p>
          </div>
        </div>
        <div style="background:#f8f8f8;padding:16px 32px;text-align:center">
          <p style="color:#bbb;font-size:12px;margin:0">ZenSalon - Todos os direitos reservados.</p>
        </div>
      </div>`,
  });
}

export async function sendPaymentOverdueEmail(params: {
  to: string;
  tenantName: string;
  ownerName: string;
  daysOverdue: number;
  paymentUrl?: string;
}) {
  const { to, tenantName, ownerName, daysOverdue, paymentUrl = "https://app.zensalon.com.br/billing" } = params;
  return resend.emails.send({
    from: FROM,
    to,
    subject: `Pagamento pendente - ${tenantName}`,
    html: `
      <div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #f0f0f0">
        <div style="background:#ef4444;padding:32px;text-align:center">
          <h1 style="color:#fff;margin:0;font-size:24px">Atencao</h1>
        </div>
        <div style="padding:32px">
          <h2 style="color:#1a1a2e;margin:0 0 16px">Pagamento em atraso</h2>
          <p style="color:#555;line-height:1.7;margin:0 0 16px">
            Ola, ${ownerName}. A assinatura do <strong>${tenantName}</strong>
            esta com pagamento em atraso ha <strong>${daysOverdue} dia(s)</strong>.
          </p>
          <div style="text-align:center;margin:28px 0">
            <a href="${paymentUrl}" style="background:#ef4444;color:#fff;padding:14px 32px;border-radius:50px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block">
              Regularizar pagamento
            </a>
          </div>
        </div>
        <div style="background:#f8f8f8;padding:16px 32px;text-align:center">
          <p style="color:#bbb;font-size:12px;margin:0">ZenSalon - Todos os direitos reservados.</p>
        </div>
      </div>`,
  });
}

export async function sendAppointmentReminderEmail(params: {
  to: string;
  clientName: string;
  tenantName: string;
  serviceName: string;
  date: string;
  time: string;
  professionalName?: string;
}) {
  const { to, clientName, tenantName, serviceName, date, time, professionalName } = params;
  return resend.emails.send({
    from: FROM,
    to,
    subject: `Lembrete: ${serviceName} - ${date} as ${time}`,
    html: `
      <div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #f0f0f0">
        <div style="background:linear-gradient(135deg,#C9847A,#8A7BAF);padding:32px;text-align:center">
          <h1 style="color:#fff;margin:0;font-size:24px">${tenantName}</h1>
        </div>
        <div style="padding:32px">
          <h2 style="color:#1a1a2e;margin:0 0 16px">Ola, ${clientName}!</h2>
          <p style="color:#555;line-height:1.7;margin:0 0 24px">Lembrete do seu agendamento:</p>
          <div style="background:#f8f8f8;border-radius:8px;padding:20px;margin:0 0 24px">
            <p style="margin:4px 0;color:#333;font-size:15px"><strong>Servico:</strong> ${serviceName}</p>
            <p style="margin:4px 0;color:#333;font-size:15px"><strong>Data:</strong> ${date}</p>
            <p style="margin:4px 0;color:#333;font-size:15px"><strong>Horario:</strong> ${time}</p>
            ${professionalName ? `<p style="margin:4px 0;color:#333;font-size:15px"><strong>Profissional:</strong> ${professionalName}</p>` : ""}
          </div>
        </div>
        <div style="background:#f8f8f8;padding:16px 32px;text-align:center">
          <p style="color:#bbb;font-size:12px;margin:0">ZenSalon - Todos os direitos reservados.</p>
        </div>
      </div>`,
  });
}