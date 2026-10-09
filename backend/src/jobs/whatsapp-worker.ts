import { db } from '../db/connection.js';
import { notifications, clients } from '../db/schema/index.js';
import { eq, and } from 'drizzle-orm';
import { sendTextMessage, normalizeWhatsappNumber } from '../modules/whatsapp/whatsapp.service.js';
import { testRecordIds } from '../modules/super-admin/test-data.guard.js';

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

  // Dados de teste: notificação de cliente de teste nunca sai (marcada como falha, sem envio).
  const testClients = await testRecordIds(db, 'clients', pending.map((r) => r.notification.clientId as string));
  const fail = (id: string, errorMsg: string) =>
    db.update(notifications).set({ status: 'failed', errorMsg }).where(eq(notifications.id, id));
  for (const row of pending) {
    const phone = row.client?.whatsapp;
    if (testClients.has(row.notification.clientId as string)) { await fail(row.notification.id, 'Cliente de dados de teste'); continue; }
    if (!phone) { await fail(row.notification.id, 'Cliente sem WhatsApp'); continue; }
    // Telefone limpo antes do envio; inválido = falha com o motivo, sem chamar a API.
    const number = normalizeWhatsappNumber(phone);
    if (!number) { await fail(row.notification.id, 'Telefone inválido: ' + phone); continue; }
    try {
      await sendTextMessage(number, row.notification.message, row.notification.tenantId);
      await db.update(notifications).set({ status: 'sent', sentAt: new Date() }).where(eq(notifications.id, row.notification.id));
      console.log('[WhatsAppWorker] Enviado para ' + (row.client?.fullName ?? phone));
      await new Promise(r => setTimeout(r, 3000));
    } catch (err: any) {
      console.error('[WhatsAppWorker] Erro ao enviar:', err.message);
      await fail(row.notification.id, String(err?.message ?? err));
    }
  }

  console.log('[WhatsAppWorker] Fila processada. Total: ' + pending.length);
}
