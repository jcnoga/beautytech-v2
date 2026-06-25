import cron from 'node-cron';
import { db } from '../db/connection.js';
import { appointments, clients, tenants, messageTemplates, notifications } from '../db/schema/index.js';
import { eq, and, gte, lte, isNull, sql } from 'drizzle-orm';
import { processWhatsAppQueue } from './whatsapp-worker.js';
import { disconnectInstance } from '../modules/whatsapp/whatsapp.service.js';
import { checkSubscriptionNotifications } from './subscription-notifications.js';


async function tenantPodeWhatsApp(tenantId: string): Promise<boolean> {
  const [t] = await db.select({ planTier: tenants.planTier, trialEndsAt: tenants.trialEndsAt }).from(tenants).where(eq(tenants.id, tenantId));
  if (!t) return false;
  const now = new Date();
  const trialEnd = t.trialEndsAt ? new Date(t.trialEndsAt) : null;
  const isTrialActive = t.planTier === 'trial' && trialEnd && trialEnd > now;
  const effectivePlan = isTrialActive ? 'trial' : (t.planTier === 'trial' ? 'basic' : t.planTier);
  return effectivePlan !== 'basic';
}

function formatMessage(template: string, data: Record<string, string>): string {
  return template
    .replace(/{nome}/g,  data.nome  ?? '')
    .replace(/{data}/g,  data.data  ?? '')
    .replace(/{hora}/g,  data.hora  ?? '')
    .replace(/{valor}/g, data.valor ?? '');
}

async function checkAppointmentReminders() {
  console.log('[Scheduler] Verificando lembretes de agendamento...');
  const now = new Date();
  const activeTenants = await db.select({ id: tenants.id }).from(tenants).where(and(eq(tenants.isActive, true), isNull(tenants.deletedAt)));
  for (const tenant of activeTenants) {
    if (!(await tenantPodeWhatsApp(tenant.id))) {
      console.log('[Scheduler] Tenant ' + tenant.id + ' bloqueado - plano basico');
      continue;
    }
    const [tmpl24h, tmpl2h] = await Promise.all([
      db.select().from(messageTemplates).where(and(eq(messageTemplates.tenantId, tenant.id), eq(messageTemplates.trigger, 'appointment_reminder_24h'), eq(messageTemplates.isActive, true))).limit(1),
      db.select().from(messageTemplates).where(and(eq(messageTemplates.tenantId, tenant.id), eq(messageTemplates.trigger, 'appointment_reminder_2h'),  eq(messageTemplates.isActive, true))).limit(1),
    ]);
    if (tmpl24h.length) {
      const from24 = new Date(now.getTime() + 23 * 3600000);
      const to24   = new Date(now.getTime() + 25 * 3600000);
      const appts24 = await db.select({ id: appointments.id, scheduledAt: appointments.scheduledAt, clientId: appointments.clientId })
        .from(appointments).where(and(eq(appointments.tenantId, tenant.id), eq(appointments.status, 'confirmed'), gte(appointments.scheduledAt, from24), lte(appointments.scheduledAt, to24), isNull(appointments.deletedAt), isNull(appointments.reminderSentAt)));
      for (const appt of appts24) {
        const [client] = await db.select().from(clients).where(eq(clients.id, appt.clientId));
        if (!client?.whatsapp) continue;
        const msg = formatMessage(tmpl24h[0].message, { nome: client.fullName.split(' ')[0], data: new Date(appt.scheduledAt).toLocaleDateString('pt-BR'), hora: new Date(appt.scheduledAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) });
        await db.insert(notifications).values({ tenantId: tenant.id, clientId: client.id, channel: 'whatsapp', message: msg, status: 'pending', referenceId: appt.id });
        await db.update(appointments).set({ reminderSentAt: now }).where(eq(appointments.id, appt.id));
        console.log('[Scheduler] Lembrete 24h gerado para ' + client.fullName);
      }
    }
    if (tmpl2h.length) {
      const from2 = new Date(now.getTime() + 110 * 60000);
      const to2   = new Date(now.getTime() + 130 * 60000);
      const appts2 = await db.select({ id: appointments.id, scheduledAt: appointments.scheduledAt, clientId: appointments.clientId })
        .from(appointments).where(and(eq(appointments.tenantId, tenant.id), eq(appointments.status, 'confirmed'), gte(appointments.scheduledAt, from2), lte(appointments.scheduledAt, to2), isNull(appointments.deletedAt)));
      for (const appt of appts2) {
        const [client] = await db.select().from(clients).where(eq(clients.id, appt.clientId));
        if (!client?.whatsapp) continue;
        const msg = formatMessage(tmpl2h[0].message, { nome: client.fullName.split(' ')[0], hora: new Date(appt.scheduledAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) });
        await db.insert(notifications).values({ tenantId: tenant.id, clientId: client.id, channel: 'whatsapp', message: msg, status: 'pending', referenceId: appt.id });
        console.log('[Scheduler] Lembrete 2h gerado para ' + client.fullName);
      }
    }
  }
}

async function checkBirthdays() {
  console.log('[Scheduler] Verificando aniversariantes...');
  const now = new Date();
  const month = now.getMonth() + 1;
  const day   = now.getDate();
  const activeTenants = await db.select({ id: tenants.id }).from(tenants).where(and(eq(tenants.isActive, true), isNull(tenants.deletedAt)));
  for (const tenant of activeTenants) {
    if (!(await tenantPodeWhatsApp(tenant.id))) continue;
    const [tmpl] = await db.select().from(messageTemplates).where(and(eq(messageTemplates.tenantId, tenant.id), eq(messageTemplates.trigger, 'birthday'), eq(messageTemplates.isActive, true))).limit(1);
    if (!tmpl) continue;
    const birthdayClients = await db.execute(
      require('drizzle-orm').sql`SELECT * FROM clients WHERE tenant_id = ${tenant.id} AND is_active = true AND deleted_at IS NULL AND EXTRACT(MONTH FROM birth_date) = ${month} AND EXTRACT(DAY FROM birth_date) = ${day}`
    );
    for (const client of (birthdayClients.rows as any[])) {
      if (!client.whatsapp) continue;
      const msg = formatMessage(tmpl.message, { nome: client.full_name.split(' ')[0] });
      await db.insert(notifications).values({ tenantId: tenant.id, clientId: client.id, channel: 'whatsapp', message: msg, status: 'pending' });
      console.log('[Scheduler] Aniversario gerado para ' + client.full_name);
    }
  }
}

async function checkReactivation() {
  console.log('[Scheduler] Verificando clientes inativos...');
  const activeTenants = await db.select({ id: tenants.id }).from(tenants).where(and(eq(tenants.isActive, true), isNull(tenants.deletedAt)));
  for (const tenant of activeTenants) {
    if (!(await tenantPodeWhatsApp(tenant.id))) continue;
    const [tmpl] = await db.select().from(messageTemplates).where(and(eq(messageTemplates.tenantId, tenant.id), eq(messageTemplates.trigger, 'client_reactivation'), eq(messageTemplates.isActive, true))).limit(1);
    if (!tmpl) continue;
    const inactiveClients = await db.select().from(clients).where(and(eq(clients.tenantId, tenant.id), eq(clients.isActive, true), eq(clients.segment, 'at_risk'), isNull(clients.deletedAt))).limit(20);
    for (const client of inactiveClients) {
      if (!client.whatsapp) continue;
      const msg = formatMessage(tmpl.message, { nome: client.fullName.split(' ')[0] });
      await db.insert(notifications).values({ tenantId: tenant.id, clientId: client.id, channel: 'whatsapp', message: msg, status: 'pending' });
    }
  }
}


async function desconectarWhatsAppExpirados() {
  console.log('[Scheduler] Verificando WhatsApp de tenants expirados...');
  const now = new Date();
  const expirados = await db.select({ id: tenants.id, whatsappInstance: tenants.whatsappInstance }).from(tenants).where(and(eq(tenants.isActive, true), isNull(tenants.deletedAt)));
  for (const tenant of expirados) {
    if (!tenant.whatsappInstance) continue;
    const pode = await tenantPodeWhatsApp(tenant.id);
    if (!pode) {
      try {
        await disconnectInstance(tenant.id);
        console.log('[Scheduler] WhatsApp desconectado para tenant ' + tenant.id);
      } catch (e) {
        console.log('[Scheduler] Erro ao desconectar tenant ' + tenant.id);
      }
    }
  }
}

export function startScheduler() {
  console.log('[Scheduler] Iniciando jobs automaticos...');

  // WhatsApp worker - a cada 5 minutos
  cron.schedule('*/5 * * * *', async () => {
    try { await processWhatsAppQueue(); } catch(e) { console.error('[Scheduler] Erro worker:', e); }
  });

  // Lembretes de agendamento - a cada hora
  cron.schedule('0 * * * *', async () => {
    try { await checkAppointmentReminders(); } catch(e) { console.error('[Scheduler] Erro lembretes:', e); }
  });

  // Aniversarios e reativacao - todo dia 9h
  cron.schedule('0 9 * * *', async () => {
    try { await checkBirthdays(); } catch(e) { console.error('[Scheduler] Erro aniversarios:', e); }
    try { await checkReactivation(); } catch(e) { console.error('[Scheduler] Erro reativacao:', e); }
  });

  // Desconecta WhatsApp de tenants expirados - todo dia 8h30
  cron.schedule('30 8 * * *', async () => {
    try { await desconectarWhatsAppExpirados(); } catch(e) { console.error('[Scheduler] Erro desconexao:', e); }
  });

  // Notificacoes de vencimento de plano - todo dia 8h
  cron.schedule('0 8 * * *', async () => {
    try { await checkSubscriptionNotifications(); } catch(e) { console.error('[Scheduler] Erro vencimentos:', e); }
  });

  console.log('[Scheduler] Jobs registrados com sucesso.');
}
