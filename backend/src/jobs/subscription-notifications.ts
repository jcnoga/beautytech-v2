// ============================================================
// JOB - Notificacoes de Vencimento de Plano
// Roda diariamente: avisa 7, 3 e 1 dia antes do vencimento
// ============================================================
import { db } from "../db/connection.js";
import { tenants } from "../db/schema/index.js";
import { eq, and, lte, gte, isNull, sql } from "drizzle-orm";

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

async function alreadySentToday(tenantId: string, type: string): Promise<boolean> {
  const today = startOfDay(new Date()).toISOString();
  const result = await db.execute(
    sql`SELECT id FROM subscription_notifications
        WHERE tenant_id = ${tenantId}
          AND type = ${type}
          AND sent_at >= ${today}
        LIMIT 1`
  );
  return (result.rows?.length ?? 0) > 0;
}

async function registerNotification(tenantId: string, subscriptionId: string | null, type: string) {
  await db.execute(
    sql`INSERT INTO subscription_notifications (id, tenant_id, subscription_id, type, sent_at, channel)
        VALUES (gen_random_uuid(), ${tenantId}, ${subscriptionId ?? null}, ${type}, NOW(), 'email')`
  );
}

export async function checkSubscriptionNotifications() {
  console.log("[SubNotif] Verificando vencimentos de planos...");

  const now = new Date();

  // Busca tenants ativos com plano pago e data de vencimento definida
  const activeTenants = await db.execute(
    sql`SELECT id, name, email, plan_tier, plan_period, plan_status, plan_expires_at, plan_cancel_at_period_end
        FROM tenants
        WHERE is_active = true
          AND deleted_at IS NULL
          AND plan_status IN ('active', 'canceled')
          AND plan_expires_at IS NOT NULL
          AND plan_tier != 'free'`
  );

  const rows = activeTenants.rows as any[];
  console.log(`[SubNotif] ${rows.length} tenants com plano ativo encontrados.`);

  for (const tenant of rows) {
    const expiresAt  = new Date(tenant.plan_expires_at);
    const tenantId   = tenant.id;
    const tenantName = tenant.name ?? "";
    const email      = tenant.email ?? "";

    if (!email) continue;

    const daysUntil = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    try {
      const { sendPlanExpiringEmail, sendPlanExpiredEmail } = await import("../modules/resend.module.js");

      // 7 dias antes
      if (daysUntil === 7) {
        const alreadySent = await alreadySentToday(tenantId, "expiring_7d");
        if (!alreadySent) {
          await sendPlanExpiringEmail(email, tenantName, 7, expiresAt, tenant.plan_cancel_at_period_end);
          await registerNotification(tenantId, null, "expiring_7d");
          console.log(`[SubNotif] Aviso 7d enviado para ${tenantName}`);
        }
      }

      // 3 dias antes
      if (daysUntil === 3) {
        const alreadySent = await alreadySentToday(tenantId, "expiring_3d");
        if (!alreadySent) {
          await sendPlanExpiringEmail(email, tenantName, 3, expiresAt, tenant.plan_cancel_at_period_end);
          await registerNotification(tenantId, null, "expiring_3d");
          console.log(`[SubNotif] Aviso 3d enviado para ${tenantName}`);
        }
      }

      // 1 dia antes
      if (daysUntil === 1) {
        const alreadySent = await alreadySentToday(tenantId, "expiring_1d");
        if (!alreadySent) {
          await sendPlanExpiringEmail(email, tenantName, 1, expiresAt, tenant.plan_cancel_at_period_end);
          await registerNotification(tenantId, null, "expiring_1d");
          console.log(`[SubNotif] Aviso 1d enviado para ${tenantName}`);
        }
      }

      // Plano expirado hoje
      if (daysUntil <= 0) {
        const alreadySent = await alreadySentToday(tenantId, "expired");
        if (!alreadySent) {
          // Rebaixa para free
          await db.execute(
            sql`UPDATE tenants
                SET plan_tier = 'free',
                    plan_status = 'expired',
                    updated_at = NOW()
                WHERE id = ${tenantId}
                  AND plan_status NOT IN ('expired')`
          );
          await sendPlanExpiredEmail(email, tenantName);
          await registerNotification(tenantId, null, "expired");
          console.log(`[SubNotif] Plano expirado processado para ${tenantName}`);
        }
      }

    } catch (e: any) {
      console.error(`[SubNotif] Erro ao processar tenant ${tenantName}:`, e.message);
    }
  }

  console.log("[SubNotif] Verificacao concluida.");
}
