// ============================================================
// BEAUTYTECH v2 — Job Scheduler
// Roda a cada hora e verifica gatilhos automáticos
// ============================================================

import cron from "node-cron";
import { db } from "../db/connection.js";
import { appointments, clients, tenants, messageTemplates, notifications } from "../db/schema/index.js";
import { eq, and, gte, lte, isNull, sql } from "drizzle-orm";

// ─── HELPER: formatar mensagem ────────────────────────────────
function formatMessage(template: string, data: Record<string, string>): string {
  return template
    .replace(/{nome}/g,  data.nome  ?? "")
    .replace(/{data}/g,  data.data  ?? "")
    .replace(/{hora}/g,  data.hora  ?? "")
    .replace(/{valor}/g, data.valor ?? "");
}

// ─── HELPER: gerar link WhatsApp ─────────────────────────────
function waLink(phone: string, message: string): string {
  const clean = phone.replace(/\D/g, "");
  return `https://wa.me/55${clean}?text=${encodeURIComponent(message)}`;
}

// ─── JOB 1: Lembretes de agendamento ─────────────────────────
async function checkAppointmentReminders() {
  console.log("[Scheduler] Verificando lembretes de agendamento...");
  const now = new Date();

  // Buscar tenants ativos
  const activeTenants = await db.select({ id: tenants.id })
    .from(tenants)
    .where(and(eq(tenants.isActive, true), isNull(tenants.deletedAt)));

  for (const tenant of activeTenants) {
    // Templates de lembrete desse tenant
    const [tmpl24h, tmpl2h] = await Promise.all([
      db.select().from(messageTemplates).where(and(eq(messageTemplates.tenantId, tenant.id), eq(messageTemplates.trigger, "appointment_reminder_24h"), eq(messageTemplates.isActive, true))).limit(1),
      db.select().from(messageTemplates).where(and(eq(messageTemplates.tenantId, tenant.id), eq(messageTemplates.trigger, "appointment_reminder_2h"),  eq(messageTemplates.isActive, true))).limit(1),
    ]);

    // Janela 24h (entre 23h e 25h a partir de agora)
    if (tmpl24h.length) {
      const from24 = new Date(now.getTime() + 23 * 3600000);
      const to24   = new Date(now.getTime() + 25 * 3600000);
      const appts24 = await db.select({
        id: appointments.id,
        scheduledAt: appointments.scheduledAt,
        clientId: appointments.clientId,
      }).from(appointments)
        .where(and(
          eq(appointments.tenantId, tenant.id),
          eq(appointments.status, "confirmed"),
          gte(appointments.scheduledAt, from24),
          lte(appointments.scheduledAt, to24),
          isNull(appointments.deletedAt),
          isNull(appointments.reminderSentAt),
        ));

      for (const appt of appts24) {
        const [client] = await db.select().from(clients).where(eq(clients.id, appt.clientId));
        if (!client?.whatsapp) continue;
        const msg = formatMessage(tmpl24h[0].message, {
          nome: client.fullName.split(" ")[0],
          data: new Date(appt.scheduledAt).toLocaleDateString("pt-BR"),
          hora: new Date(appt.scheduledAt).toLocaleTimeString("pt-BR", { hour:"2-digit", minute:"2-digit" }),
        });
        await db.insert(notifications).values({
          tenantId: tenant.id,
          clientId: client.id,
          channel: "whatsapp",
          message: msg,
          status: "pending",
          referenceId: appt.id,
        });
        await db.update(appointments).set({ reminderSentAt: now }).where(eq(appointments.id, appt.id));
        console.log(`[Scheduler] Lembrete 24h gerado para ${client.fullName}`);
      }
    }

    // Janela 2h (entre 1h50 e 2h10 a partir de agora)
    if (tmpl2h.length) {
      const from2 = new Date(now.getTime() + 110 * 60000);
      const to2   = new Date(now.getTime() + 130 * 60000);
      const appts2 = await db.select({
        id: appointments.id,
        scheduledAt: appointments.scheduledAt,
        clientId: appointments.clientId,
      }).from(appointments)
        .where(and(
          eq(appointments.tenantId, tenant.id),
          eq(appointments.status, "confirmed"),
          gte(appointments.scheduledAt, from2),
          lte(appointments.scheduledAt, to2),
          isNull(appointments.deletedAt),
        ));

      for (const appt of appts2) {
        const [client] = await db.select().from(clients).where(eq(clients.id, appt.clientId));
        if (!client?.whatsapp) continue;
        const msg = formatMessage(tmpl2h[0].message, {
          nome: client.fullName.split(" ")[0],
          hora: new Date(appt.scheduledAt).toLocaleTimeString("pt-BR", { hour:"2-digit", minute:"2-digit" }),
        });
        await db.insert(notifications).values({
          tenantId: tenant.id,
          clientId: client.id,
          channel: "whatsapp",
          message: msg,
          status: "pending",
          referenceId: appt.id,
        });
        console.log(`[Scheduler] Lembrete 2h gerado para ${client.fullName}`);
      }
    }
  }
}

// ─── JOB 2: Aniversariantes do dia ───────────────────────────
async function checkBirthdays() {
  console.log("[Scheduler] Verificando aniversariantes...");
  const now   = new Date();
  const month = now.getMonth() + 1;
  const day   = now.getDate();

  const activeTenants = await db.select({ id: tenants.id })
    .from(tenants).where(and(eq(tenants.isActive, true), isNull(tenants.deletedAt)));

  for (const tenant of activeTenants) {
    const [tmpl] = await db.select().from(messageTemplates)
      .where(and(eq(messageTemplates.tenantId, tenant.id), eq(messageTemplates.trigger, "birthday"), eq(messageTemplates.isActive, true)))
      .limit(1);
    if (!tmpl) continue;

    const birthdayClients = await db.select().from(clients)
      .where(and(
        eq(clients.tenantId, tenant.id),
        eq(clients.isActive, true),
        isNull(clients.deletedAt),
        sql`EXTRACT(MONTH FROM ${clients.birthDate}) = ${month}`,
        sql`EXTRACT(DAY FROM ${clients.birthDate}) = ${day}`,
      ));

    for (const client of birthdayClients) {
      if (!client.whatsapp) continue;
      const msg = formatMessage(tmpl.message, { nome: client.fullName.split(" ")[0] });
      await db.insert(notifications).values({
        tenantId: tenant.id,
        clientId: client.id,
        channel: "whatsapp",
        message: msg,
        status: "pending",
      });
      console.log(`[Scheduler] Aniversário gerado para ${client.fullName}`);
    }
  }
}

// ─── JOB 3: Reativação de clientes inativos ──────────────────
async function checkReactivation() {
  console.log("[Scheduler] Verificando clientes inativos...");
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);

  const activeTenants = await db.select({ id: tenants.id })
    .from(tenants).where(and(eq(tenants.isActive, true), isNull(tenants.deletedAt)));

  for (const tenant of activeTenants) {
    const [tmpl] = await db.select().from(messageTemplates)
      .where(and(eq(messageTemplates.tenantId, tenant.id), eq(messageTemplates.trigger, "client_reactivation"), eq(messageTemplates.isActive, true)))
      .limit(1);
    if (!tmpl) continue;

    const inactiveClients = await db.select().from(clients)
      .where(and(
        eq(clients.tenantId, tenant.id),
        eq(clients.isActive, true),
        eq(clients.segment, "at_risk"),
        isNull(clients.deletedAt),
      )).limit(20);

    for (const client of inactiveClients) {
      if (!client.whatsapp) continue;
      const msg = formatMessage(tmpl.message, { nome: client.fullName.split(" ")[0] });
      await db.insert(notifications).values({
        tenantId: tenant.id,
        clientId: client.id,
        channel: "whatsapp",
        message: msg,
        status: "pending",
      });
    }
  }
}

// ─── INICIAR SCHEDULER ───────────────────────────────────────
export function startScheduler() {
  console.log("[Scheduler] Iniciando jobs automáticos...");

  // A cada hora
  cron.schedule("0 * * * *", async () => {
    try { await checkAppointmentReminders(); } catch(e) { console.error("[Scheduler] Erro lembretes:", e); }
  });

  // Todo dia às 9h
  cron.schedule("0 9 * * *", async () => {
    try { await checkBirthdays(); } catch(e) { console.error("[Scheduler] Erro aniversários:", e); }
    try { await checkReactivation(); } catch(e) { console.error("[Scheduler] Erro reativação:", e); }
  });

  console.log("[Scheduler] Jobs registrados com sucesso.");
}