// ============================================================
// PROFESSIONAL SERVICES & SCHEDULE ROUTES
// ============================================================
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { db } from "@db/connection.js";
import { authenticate } from "@middleware/auth.js";
import { rejectForeignRefs } from "../tenant-guard.js";
import { rows } from "../group-classes/rules";
import { localToUtc, OCCUPYING_STATUSES } from "../appointments/agenda-rules";

export async function professionalScheduleRoutes(fastify: any) {

  // GET /professionals/:id/services  lista servicos do profissional
  fastify.get("/professionals/:id/services", { preHandler: [authenticate] }, async (req: any, reply: any) => {
    const { tenantId } = req.tenantContext;
    const result = await db.execute(sql`
      SELECT ps.*, s.name as service_name, s.price as service_price
      FROM professional_services ps
      JOIN services s ON s.id = ps.service_id
      WHERE ps.professional_id = ${req.params.id}
      AND ps.tenant_id = ${tenantId}
      ORDER BY s.name
    `);
    const rows = (result as any).rows ?? (Array.isArray(result) ? result : []);
    return reply.send({ success: true, data: rows });
  });

  // POST /professionals/:id/services  vincula servico ao profissional
  fastify.post("/professionals/:id/services", { preHandler: [authenticate] }, async (req: any, reply: any) => {
    const { tenantId } = req.tenantContext;
    const { serviceId, commissionType = "percent", commissionValue = 0, durationMinutes = 60, isEnabled = true } = req.body as any;
    if (!serviceId) return reply.status(400).send({ success: false, error: "serviceId obrigatorio" });
    if (await rejectForeignRefs(reply, tenantId, { professionals: [req.params.id], services: [serviceId] })) return;
    await db.execute(sql`
      INSERT INTO professional_services (tenant_id, professional_id, service_id, commission_type, commission_value, duration_minutes, is_enabled)
      VALUES (${tenantId}, ${req.params.id}, ${serviceId}, ${commissionType}, ${commissionValue}, ${durationMinutes}, ${isEnabled})
      ON CONFLICT (professional_id, service_id) DO UPDATE SET
        commission_type = EXCLUDED.commission_type,
        commission_value = EXCLUDED.commission_value,
        duration_minutes = EXCLUDED.duration_minutes,
        is_enabled = EXCLUDED.is_enabled,
        updated_at = now()
    `);
    return reply.send({ success: true });
  });

  // DELETE /professionals/:id/services/:serviceId
  fastify.delete("/professionals/:id/services/:serviceId", { preHandler: [authenticate] }, async (req: any, reply: any) => {
    const { tenantId } = req.tenantContext;
    await db.execute(sql`
      DELETE FROM professional_services
      WHERE professional_id = ${req.params.id}
      AND service_id = ${req.params.serviceId}
      AND tenant_id = ${tenantId}
    `);
    return reply.send({ success: true });
  });

  // GET /professionals/:id/schedules  jornada de trabalho
  fastify.get("/professionals/:id/schedules", { preHandler: [authenticate] }, async (req: any, reply: any) => {
    const { tenantId } = req.tenantContext;
    const result = await db.execute(sql`
      SELECT * FROM professional_schedules
      WHERE professional_id = ${req.params.id}
      AND tenant_id = ${tenantId}
      ORDER BY day_of_week
    `);
    const rows = (result as any).rows ?? (Array.isArray(result) ? result : []);
    // Retorna 7 dias, preenchendo defaults para dias nao configurados
    const days: any[] = [];
    for (let d = 0; d <= 6; d++) {
      const existing = rows.find((r: any) => r.day_of_week === d);
      days.push(existing ?? { day_of_week: d, is_working: d >= 1 && d <= 6, start_time: "08:00", end_time: "18:00", slot_minutes: 30 });
    }
    return reply.send({ success: true, data: days });
  });

  // POST /professionals/:id/schedules  salva jornada
  fastify.post("/professionals/:id/schedules", { preHandler: [authenticate] }, async (req: any, reply: any) => {
    const { tenantId } = req.tenantContext;
    const { days } = req.body as any; // array de { dayOfWeek, isWorking, startTime, endTime, slotMinutes }
    if (await rejectForeignRefs(reply, tenantId, { professionals: [req.params.id] })) return;
    for (const day of days) {
      await db.execute(sql`
        INSERT INTO professional_schedules (tenant_id, professional_id, day_of_week, is_working, start_time, end_time, slot_minutes, break_start, break_end)
        VALUES (${tenantId}, ${req.params.id}, ${day.dayOfWeek}, ${day.isWorking}, ${day.startTime}, ${day.endTime}, ${day.slotMinutes ?? 30}, ${day.breakStart ?? null}, ${day.breakEnd ?? null})
        ON CONFLICT (professional_id, day_of_week) DO UPDATE SET
          is_working = EXCLUDED.is_working,
          start_time = EXCLUDED.start_time,
          end_time = EXCLUDED.end_time,
          slot_minutes = EXCLUDED.slot_minutes,
          break_start = EXCLUDED.break_start,
          break_end = EXCLUDED.break_end,
          updated_at = now()
      `);
    }
    return reply.send({ success: true });
  });

  // GET /professionals/:id/blocks  bloqueios
  fastify.get("/professionals/:id/blocks", { preHandler: [authenticate] }, async (req: any, reply: any) => {
    const { tenantId } = req.tenantContext;
    const result = await db.execute(sql`
      SELECT * FROM professional_blocks
      WHERE professional_id = ${req.params.id}
      AND tenant_id = ${tenantId}
      AND ends_at > now()
      ORDER BY starts_at
    `);
    const rows = (result as any).rows ?? (Array.isArray(result) ? result : []);
    return reply.send({ success: true, data: rows });
  });

  // POST /professionals/:id/blocks  cria bloqueio
  fastify.post("/professionals/:id/blocks", { preHandler: [authenticate] }, async (req: any, reply: any) => {
    const { tenantId } = req.tenantContext;
    const { startsAt, endsAt, reason } = req.body as any;
    if (await rejectForeignRefs(reply, tenantId, { professionals: [req.params.id] })) return;
    await db.execute(sql`
      INSERT INTO professional_blocks (tenant_id, professional_id, starts_at, ends_at, reason)
      VALUES (${tenantId}, ${req.params.id}, ${startsAt}, ${endsAt}, ${reason ?? null})
    `);
    return reply.send({ success: true });
  });

  // DELETE /professionals/:id/blocks/:blockId
  fastify.delete("/professionals/:id/blocks/:blockId", { preHandler: [authenticate] }, async (req: any, reply: any) => {
    const { tenantId } = req.tenantContext;
    await db.execute(sql`
      DELETE FROM professional_blocks
      WHERE id = ${req.params.blockId}
      AND professional_id = ${req.params.id}
      AND tenant_id = ${tenantId}
    `);
    return reply.send({ success: true });
  });

  // GET /professionals/available?serviceId=&date=  profissionais disponiveis
  fastify.get("/professionals/available", { preHandler: [authenticate] }, async (req: any, reply: any) => {
    const { tenantId } = req.tenantContext;
    const { serviceId, date } = req.query as any;
    if (!serviceId || !date) return reply.status(400).send({ success: false, error: "serviceId e date sao obrigatorios" });

    const dayOfWeek = new Date(date + "T00:00:00Z").getUTCDay(); // dia da data (sem fuso)

    const result = await db.execute(sql`
      SELECT p.id, p.full_name, p.color, ps.duration_minutes, ps.commission_type, ps.commission_value,
             sch.start_time, sch.end_time, sch.slot_minutes
      FROM professional_services ps
      JOIN professionals p ON p.id = ps.professional_id
      LEFT JOIN professional_schedules sch ON sch.professional_id = p.id AND sch.day_of_week = ${dayOfWeek}
      WHERE ps.service_id = ${serviceId}
      AND ps.tenant_id = ${tenantId}
      AND ps.is_enabled = true
      AND p.is_active = true
      AND (sch.is_working = true OR sch.id IS NULL)
      ORDER BY p.full_name
    `);
    const rows = (result as any).rows ?? (Array.isArray(result) ? result : []);
    return reply.send({ success: true, data: rows });
  });

  // GET /professionals/:id/slots?serviceId=&date=  horários livres (data e horas de Brasília)
  // Mesmas regras do cadastro (agenda-rules): jornada e intervalo do dia, bloqueios e agendamentos que ocupam.
  fastify.get("/professionals/:id/slots", { preHandler: [authenticate] }, async (req: any, reply: any) => {
    const { tenantId } = req.tenantContext;
    const { serviceId, date } = req.query as any;
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(String(date))) return reply.status(400).send({ success: false, error: "date obrigatorio (AAAA-MM-DD)" });
    const q = async (s: any) => rows(await db.execute(s)) as any[];
    const dayOfWeek = new Date(date + "T00:00:00Z").getUTCDay();

    const [sched] = await q(sql`SELECT is_working, start_time, end_time, slot_minutes, break_start, break_end FROM professional_schedules
      WHERE professional_id = ${req.params.id} AND tenant_id = ${tenantId} AND day_of_week = ${dayOfWeek} LIMIT 1`);
    const day = sched ?? { is_working: true, start_time: "08:00", end_time: "18:00", slot_minutes: 30 };
    if (!day.is_working) return reply.send({ success: true, data: [], duration: 0 });
    const step = Number(day.slot_minutes) || 30;

    // Duração: a do profissional para o serviço; senão a do serviço; senão o passo da jornada
    let duration = step;
    if (serviceId) {
      const [ps] = await q(sql`SELECT ps.duration_minutes AS d, s.duration_minutes AS sd FROM services s
        LEFT JOIN professional_services ps ON ps.service_id = s.id AND ps.professional_id = ${req.params.id} AND ps.tenant_id = ${tenantId}
        WHERE s.id = ${serviceId} AND s.tenant_id = ${tenantId}`);
      duration = Number(ps?.d ?? ps?.sd ?? step) || step;
    }

    const dayStart = localToUtc(date, "00:00"), dayEnd = new Date(dayStart.getTime() + 24 * 3600000);
    const busy = await q(sql`SELECT scheduled_at AS s, coalesce(ends_at, scheduled_at + make_interval(mins => coalesce(duration_minutes, 60))) AS e
      FROM appointments WHERE professional_id = ${req.params.id} AND tenant_id = ${tenantId} AND deleted_at IS NULL
        AND status IN ${sql.raw(`(${OCCUPYING_STATUSES.map((s) => `'${s}'`).join(",")})`)}
        AND scheduled_at < ${dayEnd.toISOString()} AND coalesce(ends_at, scheduled_at + make_interval(mins => coalesce(duration_minutes, 60))) > ${dayStart.toISOString()}
      UNION ALL
      SELECT starts_at, ends_at FROM professional_blocks WHERE professional_id = ${req.params.id} AND tenant_id = ${tenantId}
        AND starts_at < ${dayEnd.toISOString()} AND ends_at > ${dayStart.toISOString()}`);

    const toMin = (v: any) => { if (!v) return null; const [h, m] = String(v).split(":").map(Number); return h * 60 + (m || 0); };
    const hm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
    const ws = toMin(day.start_time) ?? 480, we = toMin(day.end_time) ?? 1080;
    const bs = toMin(day.break_start), be = toMin(day.break_end);
    const slots: string[] = [];
    for (let m = ws; m + duration <= we; m += step) {
      if (bs !== null && be !== null && m < be && m + duration > bs) continue; // intervalo
      const s = localToUtc(date, hm(m)), e = new Date(s.getTime() + duration * 60000);
      if (busy.some((b: any) => s < new Date(b.e) && e > new Date(b.s))) continue;
      slots.push(hm(m));
    }
    return reply.send({ success: true, data: slots, duration });
  });
}
