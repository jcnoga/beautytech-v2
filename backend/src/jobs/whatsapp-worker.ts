import { db } from '../db/connection.js';
import { notifications, clients } from '../db/schema/index.js';
import { eq, and } from 'drizzle-orm';
import { sendTextMessage } from '../modules/whatsapp/whatsapp.service.js';

export async function processWhatsAppQueue() {
  console.log('[WhatsAppWorker] Processando fila de notificacoes...');

  const pending = await db.select({
    notification: notifications,
    client: { whatsapp: clients.whatsapp, fullName: clients.fullName },
  })
  .from(notifications)
  .leftJoin(clients, eq(notifications.clientId, clients.id))
  .where(and(eq(notifications.status, 'pending'), eq(notifications.channel, 'whatsapp')))
  .limit(20);

  for (const row of pending) {
    const phone = row.client?.whatsapp;
    if (!phone) {
      await db.update(notifications).set({ status: 'failed' }).where(eq(notifications.id, row.notification.id));
      continue;
    }
    try {
      const clean = phone.replace(/\\D/g, '');
      const number = clean.startsWith('55') ? clean : '55' + clean;
      await sendTextMessage(number, row.notification.message, row.notification.tenantId);
      await db.update(notifications).set({ status: 'sent', sentAt: new Date() }).where(eq(notifications.id, row.notification.id));
      console.log('[WhatsAppWorker] Enviado para ' + (row.client?.fullName ?? phone));
      await new Promise(r => setTimeout(r, 3000));
    } catch (err: any) {
      console.error('[WhatsAppWorker] Erro ao enviar:', err.message);
      await db.update(notifications).set({ status: 'failed' }).where(eq(notifications.id, row.notification.id));
    }
  }

  console.log('[WhatsAppWorker] Fila processada. Total: ' + pending.length);
}
