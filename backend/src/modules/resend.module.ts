import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = `${process.env.RESEND_FROM_NAME ?? "BeautyTech"} <${process.env.RESEND_FROM_EMAIL ?? "noreply@beautytech.com.br"}>`;
const FRONTEND = process.env.FRONTEND_URL ?? "https://beautytech-v2.vercel.app";

// -- Boas-vindas -----------------------------------------------
export async function sendWelcomeEmail(to: string, salonName: string) {
  try {
    await resend.emails.send({
      from: FROM, to,
      subject: `Bem-vindo ao BeautyTech, ${salonName}!`,
      html: `<div style="font-family:sans-serif;max-width:560px;margin:auto;padding:32px;background:#fff;">
        <h1 style="color:#1a0a2e;">BeautyTech</h1>
        <h2 style="color:#1a0a2e;">Ola, ${salonName}!</h2>
        <p style="color:#444;line-height:1.6;">Sua conta foi criada com sucesso. Voce esta no <strong>periodo de teste gratuito de 30 dias</strong> com acesso completo a plataforma.</p>
        <ul style="color:#444;line-height:2;">
          <li>Cadastrar seus profissionais</li>
          <li>Configurar seus servicos e precos</li>
          <li>Agendar os primeiros clientes</li>
          <li>Ativar o WhatsApp automatico</li>
        </ul>
        <div style="text-align:center;margin:32px 0;">
          <a href="${FRONTEND}" style="background:#2d1b69;color:#fff;padding:14px 32px;border-radius:99px;text-decoration:none;font-weight:700;">Acessar meu painel</a>
        </div>
        <p style="color:#6b5e8a;font-size:13px;text-align:center;">Equipe BeautyTech</p>
      </div>`,
    });
    console.log(`[RESEND] Boas-vindas enviado para ${to}`);
  } catch (e: any) { console.error(`[RESEND] Erro boas-vindas:`, e.message); }
}

// -- Plano ativado ---------------------------------------------
export async function sendPlanActivatedEmail(to: string, salonName: string, planName: string, period: string, expiresAt: Date) {
  const periodLabel: Record<string, string> = { monthly: "Mensal", semiannual: "Semestral", annual: "Anual" };
  const expiry = expiresAt.toLocaleDateString("pt-BR");
  try {
    await resend.emails.send({
      from: FROM, to,
      subject: `Plano ${planName} ativado - BeautyTech`,
      html: `<div style="font-family:sans-serif;max-width:560px;margin:auto;padding:32px;background:#fff;">
        <h1 style="color:#1a0a2e;">BeautyTech</h1>
        <h2 style="color:#166534;">Plano ${planName} Ativado!</h2>
        <p style="color:#444;">Ola, <strong>${salonName}</strong>! Seu pagamento foi confirmado.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          <tr><td style="padding:8px;color:#666;">Plano</td><td style="padding:8px;font-weight:700;">${planName}</td></tr>
          <tr style="background:#f9f9f9;"><td style="padding:8px;color:#666;">Periodo</td><td style="padding:8px;font-weight:700;">${periodLabel[period] ?? period}</td></tr>
          <tr><td style="padding:8px;color:#666;">Valido ate</td><td style="padding:8px;font-weight:700;">${expiry}</td></tr>
        </table>
        <ul style="color:#444;line-height:2;">
          <li>Agendamentos e clientes ilimitados</li>
          <li>WhatsApp automatico ativo</li>
          <li>Relatorios financeiros completos</li>
          <li>Campanhas de marketing</li>
          <li>Programa de fidelidade</li>
        </ul>
        <div style="text-align:center;margin:32px 0;">
          <a href="${FRONTEND}" style="background:#2d1b69;color:#fff;padding:14px 32px;border-radius:99px;text-decoration:none;font-weight:700;">Acessar meu painel</a>
        </div>
        <p style="color:#6b5e8a;font-size:13px;text-align:center;">Obrigado por escolher o BeautyTech!</p>
      </div>`,
    });
    console.log(`[RESEND] Plano ativado enviado para ${to}`);
  } catch (e: any) { console.error(`[RESEND] Erro plano ativado:`, e.message); }
}

// -- Pagamento confirmado (renovacao) -------------------------
export async function sendPaymentConfirmedEmail(to: string, salonName: string, value: number, expiresAt: Date) {
  const expiry = expiresAt.toLocaleDateString("pt-BR");
  try {
    await resend.emails.send({
      from: FROM, to,
      subject: `Pagamento confirmado - BeautyTech`,
      html: `<div style="font-family:sans-serif;max-width:560px;margin:auto;padding:32px;background:#fff;">
        <h1 style="color:#1a0a2e;">BeautyTech</h1>
        <h2 style="color:#166534;">Pagamento Confirmado!</h2>
        <p style="color:#444;">Ola, <strong>${salonName}</strong>! Seu pagamento de <strong>R$ ${Number(value).toFixed(2)}</strong> foi confirmado.</p>
        <p style="color:#444;">Seu plano esta ativo ate <strong>${expiry}</strong>.</p>
        <div style="text-align:center;margin:32px 0;">
          <a href="${FRONTEND}" style="background:#2d1b69;color:#fff;padding:14px 32px;border-radius:99px;text-decoration:none;font-weight:700;">Acessar meu painel</a>
        </div>
        <p style="color:#6b5e8a;font-size:13px;text-align:center;">Equipe BeautyTech</p>
      </div>`,
    });
    console.log(`[RESEND] Pagamento confirmado enviado para ${to}`);
  } catch (e: any) { console.error(`[RESEND] Erro pagamento confirmado:`, e.message); }
}

// -- Pagamento vencido -----------------------------------------
export async function sendPaymentOverdueEmail(to: string, salonName: string) {
  try {
    await resend.emails.send({
      from: FROM, to,
      subject: `Pagamento pendente - BeautyTech`,
      html: `<div style="font-family:sans-serif;max-width:560px;margin:auto;padding:32px;background:#fff;">
        <h1 style="color:#1a0a2e;">BeautyTech</h1>
        <h2 style="color:#991b1b;">Pagamento Pendente</h2>
        <p style="color:#444;">Ola, <strong>${salonName}</strong>. Identificamos um pagamento em atraso.</p>
        <p style="color:#444;">Regularize para manter acesso a todos os recursos do seu plano.</p>
        <div style="text-align:center;margin:32px 0;">
          <a href="${FRONTEND}/billing" style="background:#ef4444;color:#fff;padding:14px 32px;border-radius:99px;text-decoration:none;font-weight:700;">Regularizar pagamento</a>
        </div>
        <p style="color:#6b5e8a;font-size:13px;text-align:center;">Equipe BeautyTech</p>
      </div>`,
    });
    console.log(`[RESEND] Pagamento vencido enviado para ${to}`);
  } catch (e: any) { console.error(`[RESEND] Erro pagamento vencido:`, e.message); }
}

// -- Plano vencendo --------------------------------------------
export async function sendPlanExpiringEmail(to: string, salonName: string, daysLeft: number, expiresAt: Date, cancelAtEnd: boolean) {
  const expiry = expiresAt.toLocaleDateString("pt-BR");
  const msg = cancelAtEnd
    ? `Seu plano foi cancelado e expira em <strong>${daysLeft} dia(s)</strong> (${expiry}). Apos essa data, sua conta sera rebaixada para o plano Free.`
    : `Seu plano renova automaticamente em <strong>${daysLeft} dia(s)</strong> (${expiry}). Certifique-se de que seu metodo de pagamento esta atualizado.`;
  try {
    await resend.emails.send({
      from: FROM, to,
      subject: `Seu plano vence em ${daysLeft} dia(s) - BeautyTech`,
      html: `<div style="font-family:sans-serif;max-width:560px;margin:auto;padding:32px;background:#fff;">
        <h1 style="color:#1a0a2e;">BeautyTech</h1>
        <h2 style="color:#b45309;">Aviso de Vencimento</h2>
        <p style="color:#444;">Ola, <strong>${salonName}</strong>!</p>
        <p style="color:#444;">${msg}</p>
        <div style="text-align:center;margin:32px 0;">
          <a href="${FRONTEND}/billing" style="background:#2d1b69;color:#fff;padding:14px 32px;border-radius:99px;text-decoration:none;font-weight:700;">Gerenciar assinatura</a>
        </div>
        <p style="color:#6b5e8a;font-size:13px;text-align:center;">Equipe BeautyTech</p>
      </div>`,
    });
    console.log(`[RESEND] Aviso ${daysLeft}d enviado para ${to}`);
  } catch (e: any) { console.error(`[RESEND] Erro aviso vencimento:`, e.message); }
}

// -- Plano expirado --------------------------------------------
export async function sendPlanExpiredEmail(to: string, salonName: string) {
  try {
    await resend.emails.send({
      from: FROM, to,
      subject: `Seu plano expirou - BeautyTech`,
      html: `<div style="font-family:sans-serif;max-width:560px;margin:auto;padding:32px;background:#fff;">
        <h1 style="color:#1a0a2e;">BeautyTech</h1>
        <h2 style="color:#991b1b;">Plano Expirado</h2>
        <p style="color:#444;">Ola, <strong>${salonName}</strong>. Seu plano expirou e sua conta foi rebaixada para o plano <strong>Free</strong>.</p>
        <p style="color:#444;">Reative seu plano para recuperar acesso a todos os recursos.</p>
        <div style="text-align:center;margin:32px 0;">
          <a href="${FRONTEND}/billing" style="background:#2d1b69;color:#fff;padding:14px 32px;border-radius:99px;text-decoration:none;font-weight:700;">Reativar plano</a>
        </div>
        <p style="color:#6b5e8a;font-size:13px;text-align:center;">Equipe BeautyTech</p>
      </div>`,
    });
    console.log(`[RESEND] Plano expirado enviado para ${to}`);
  } catch (e: any) { console.error(`[RESEND] Erro plano expirado:`, e.message); }
}

// -- Plano cancelado -------------------------------------------
export async function sendPlanCanceledEmail(to: string, salonName: string, expiresAt: any) {
  const expiry = expiresAt ? new Date(expiresAt).toLocaleDateString("pt-BR") : "em breve";
  try {
    await resend.emails.send({
      from: FROM, to,
      subject: `Assinatura cancelada - BeautyTech`,
      html: `<div style="font-family:sans-serif;max-width:560px;margin:auto;padding:32px;background:#fff;">
        <h1 style="color:#1a0a2e;">BeautyTech</h1>
        <h2 style="color:#991b1b;">Assinatura Cancelada</h2>
        <p style="color:#444;">Ola, <strong>${salonName}</strong>. Sua assinatura foi cancelada com sucesso.</p>
        <p style="color:#444;">Voce ainda tem acesso a todos os recursos ate <strong>${expiry}</strong>.</p>
        <p style="color:#444;">Se mudar de ideia, pode reativar seu plano a qualquer momento.</p>
        <div style="text-align:center;margin:32px 0;">
          <a href="${FRONTEND}/billing" style="background:#2d1b69;color:#fff;padding:14px 32px;border-radius:99px;text-decoration:none;font-weight:700;">Reativar plano</a>
        </div>
        <p style="color:#6b5e8a;font-size:13px;text-align:center;">Equipe BeautyTech</p>
      </div>`,
    });
    console.log(`[RESEND] Cancelamento enviado para ${to}`);
  } catch (e: any) { console.error(`[RESEND] Erro cancelamento:`, e.message); }
}

// -- Notificacao dono ------------------------------------------
export async function sendOwnerNotificationEmail(salonName: string, phone: string, hora: string) {
  const ownerEmail = process.env["NOTIFY_OWNER_EMAIL"];
  if (!ownerEmail) return;
  try {
    await resend.emails.send({
      from: FROM, to: ownerEmail,
      subject: "Novo salao conectou o WhatsApp - " + salonName,
      html: `<div style="font-family:sans-serif;max-width:560px;margin:auto;padding:32px;background:#fff;">
        <h1 style="color:#1a0a2e;">BeautyTech</h1>
        <h2 style="color:#166534;">Salao Conectado ao WhatsApp!</h2>
        <p><strong>Salao:</strong> ${salonName}</p>
        <p><strong>Numero:</strong> ${phone}</p>
        <p><strong>Horario:</strong> ${hora}</p>
      </div>`,
    });
    console.log("[RESEND] Notificacao dono enviada para " + ownerEmail);
  } catch (e: any) { console.error("[RESEND] Erro notificacao dono:", e.message); }
}

// -- Confirmacao de agendamento --------------------------------
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

// -- Pro ativado (legado) --------------------------------------
export async function sendProActivatedEmail(to: string, salonName: string) {
  return sendPlanActivatedEmail(to, salonName, "Pro", "monthly", new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
}
