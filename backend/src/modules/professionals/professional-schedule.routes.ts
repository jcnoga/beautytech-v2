// ============================================================
// PROFESSIONAL SERVICES & SCHEDULE ROUTES
// ============================================================
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { db } from "@db/connection.js";
import { authenticate } from "@middleware/auth.js";

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

    const dayOfWeek = new Date(date).getDay();

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

  // GET /professionals/:id/slots?serviceId=&date=  slots disponiveis
  fastify.get("/professionals/:id/slots", { preHandler: [authenticate] }, async (req: any, reply: any) => {
    const { tenantId } = req.tenantContext;
    const { serviceId, date } = req.query as any;
    if (!date) return reply.status(400).send({ success: false, error: "date obrigatorio" });

    const dayOfWeek = new Date(date).getDay();

    // Busca jornada
    const schedResult = await db.execute(sql`
      SELECT * FROM professional_schedules
      WHERE professional_id = ${req.params.id}
      AND tenant_id = ${tenantId}
      AND day_of_week = ${dayOfWeek}
    `);
    const schedRows = (schedResult as any).rows ?? [];
    const sched = schedRows[0] ?? { is_working: true, start_time: "08:00", end_time: "18:00", slot_minutes: 30 };

    if (!sched.is_working) return reply.send({ success: true, data: [] });

    // Busca duracao do servico
    let duration = sched.slot_minutes ?? 30;
    if (serviceId) {
      const svcResult = await db.execute(sql`
        SELECT duration_minutes FROM professional_services
        WHERE professional_id = ${req.params.id}
        AND service_id = ${serviceId}
        AND tenant_id = ${tenantId}
      `);
      const svcRows = (svcResult as any).rows ?? [];
      if (svcRows[0]) duration = svcRows[0].duration_minutes;
    }

    // Busca agendamentos existentes
    const dateStart = date + "T00:00:00Z";
    const dateEnd   = date + "T23:59:59Z";
    const appResult = await db.execute(sql`
      SELECT scheduled_at, ends_at FROM appointments
      WHERE professional_id = ${req.params.id}
      AND tenant_id = ${tenantId}
      AND scheduled_at >= ${dateStart}
      AND scheduled_at <= ${dateEnd}
      AND status NOT IN ('cancelled','no_show')
    `);
    const appointments = (appResult as any).rows ?? [];

    // Busca bloqueios
    const blockResult = await db.execute(sql`
      SELECT starts_at, ends_at FROM professional_blocks
      WHERE professional_id = ${req.params.id}
      AND tenant_id = ${tenantId}
      AND starts_at >= ${dateStart}
      AND ends_at <= ${dateEnd}
    `);
    const blocks = (blockResult as any).rows ?? [];

    // Gera slots
    const [startH, startM] = sched.start_time.split(":").map(Number);
    const [endH, endM]     = sched.end_time.split(":").map(Number);
    const startMins = startH * 60 + startM;
    const endMins   = endH * 60 + endM;
    const slots: string[] = [];

    for (let m = startMins; m + duration <= endMins; m += sched.slot_minutes ?? 30) {
      const slotStart = new Date(`${date}T${String(Math.floor(m/60)).padStart(2,"0")}:${String(m%60).padStart(2,"0")}:00`);
      const slotEnd   = new Date(slotStart.getTime() + duration * 60000);

      // Verifica conflito com agendamentos
      const hasConflict = appointments.some((a: any) => {
        const aStart = new Date(a.scheduled_at);
        const aEnd   = new Date(a.ends_at ?? new Date(aStart.getTime() + 60*60000));
        return slotStart < aEnd && slotEnd > aStart;
      });

      // Verifica bloqueios
      const isBlocked = blocks.some((b: any) => {
        const bStart = new Date(b.starts_at);
        const bEnd   = new Date(b.ends_at);
        return slotStart < bEnd && slotEnd > bStart;
      });

      if (!hasConflict && !isBlocked) {
        slots.push(`${String(Math.floor(m/60)).padStart(2,"0")}:${String(m%60).padStart(2,"0")}`);
      }
    }

    return reply.send({ success: true, data: slots, duration });
  });
}
