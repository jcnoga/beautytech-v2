# -*- coding: utf-8 -*-
path = r"C:\projetos\beautytech-v2\backend\src\modules\all-modules.ts"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old_endpoint = '''  // ============================================================
  // PUBLIC: GET /public/tenants/:slug/availability
  // ============================================================
  fastify.get("/public/tenants/:slug/availability", async (req: any, reply: any) => {
    const { slug } = req.params;
    const { date, professionalId, serviceId } = req.query as any;
    if (!date || !professionalId) {
      return reply.status(400).send({ success: false, error: "date e professionalId sao obrigatorios" });
    }
    try {
      // Busca tenant pelo slug
      const [tenant] = await db.select({ id: tenants.id }).from(tenants).where(eq(tenants.slug, slug));
      if (!tenant) return reply.status(404).send({ success: false, error: "Salao nao encontrado" });

      // Dia da semana (0=domingo, 1=segunda, ...)
      const d = new Date(date + "T12:00:00Z");
      const dow = d.getUTCDay();

      // Busca grade de horario do profissional
      const [sched] = await db.select()
        .from(professionalSchedules)
        .where(
          and(
            eq(professionalSchedules.professionalId, professionalId),
            eq(professionalSchedules.dayOfWeek, dow)
          )
        );

      if (!sched || !sched.isWorking) {
        return reply.send({ success: true, data: [] });
      }

      // Busca duracao do servico
      let serviceDuration = 60;
      if (serviceId) {
        const [svc] = await db.select({ durationMinutes: services.durationMinutes })
          .from(services)
          .where(eq(services.id, serviceId));
        if (svc?.durationMinutes) serviceDuration = svc.durationMinutes;
      }

      // Gera slots baseado na grade
      const slotMinutes = sched.slotMinutes ?? 30;
      const [startH, startM] = (sched.startTime as string).split(":").map(Number);
      const [endH, endM] = (sched.endTime as string).split(":").map(Number);
      const startTotal = startH * 60 + startM;
      const endTotal = endH * 60 + endM;

      const allSlots: string[] = [];
      for (let t = startTotal; t + serviceDuration <= endTotal; t += slotMinutes) {
        const h = Math.floor(t / 60).toString().padStart(2, "0");
        const m = (t % 60).toString().padStart(2, "0");
        allSlots.push(`${h}:${m}`);
      }

      // Busca agendamentos existentes naquele dia
      const dayStart = date + "T00:00:00.000Z";
      const dayEnd   = date + "T23:59:59.999Z";
      const existing = await db.select({ scheduledAt: appointments.scheduledAt, durationMinutes: appointments.durationMinutes })
        .from(appointments)
        .where(
          and(
            eq(appointments.professionalId, professionalId),
            eq(appointments.tenantId, tenant.id),
            sql`${appointments.scheduledAt} >= ${dayStart}::timestamptz`,
            sql`${appointments.scheduledAt} <= ${dayEnd}::timestamptz`,
            sql`${appointments.status} NOT IN ('cancelled', 'no_show')`
          )
        );

      // Filtra slots ocupados
      const available = allSlots.filter(slot => {
        const [sh, sm] = slot.split(":").map(Number);
        const slotStart = sh * 60 + sm;
        const slotEnd   = slotStart + serviceDuration;
        return !existing.some(appt => {
          const at = new Date(appt.scheduledAt as string);
          const apptStart = at.getUTCHours() * 60 + at.getUTCMinutes();
          const apptEnd   = apptStart + (appt.durationMinutes ?? 60);
          return slotStart < apptEnd && slotEnd > apptStart;
        });
      });

      return reply.send({ success: true, data: available });
    } catch (e: any) {
      return reply.status(500).send({ success: false, error: e.message });
    }
  });'''

new_endpoint = '''  // ============================================================
  // PUBLIC: GET /public/tenants/:slug/availability
  // ============================================================
  fastify.get("/public/tenants/:slug/availability", async (req: any, reply: any) => {
    const { slug } = req.params;
    const { date, professionalId, serviceId } = req.query as any;
    if (!date || !professionalId) {
      return reply.status(400).send({ success: false, error: "date e professionalId sao obrigatorios" });
    }
    try {
      // Busca tenant pelo slug usando SQL raw
      const tenantRes = await db.execute(sql`SELECT id FROM tenants WHERE slug = ${slug} LIMIT 1`);
      const tenantRow = (tenantRes as any)[0];
      if (!tenantRow) return reply.status(404).send({ success: false, error: "Salao nao encontrado" });
      const tenantId = tenantRow.id;

      // Dia da semana (0=domingo, 1=segunda, ...)
      const d = new Date(date + "T12:00:00Z");
      const dow = d.getUTCDay();

      // Busca grade de horario do profissional usando SQL raw
      const schedRes = await db.execute(sql`
        SELECT start_time, end_time, slot_minutes, is_working
        FROM professional_schedules
        WHERE professional_id = ${professionalId} AND day_of_week = ${dow}
        LIMIT 1
      `);
      const sched = (schedRes as any)[0];
      if (!sched || !sched.is_working) {
        return reply.send({ success: true, data: [] });
      }

      // Busca duracao do servico
      let serviceDuration = 60;
      if (serviceId) {
        const svcRes = await db.execute(sql`SELECT duration_minutes FROM services WHERE id = ${serviceId} LIMIT 1`);
        const svcRow = (svcRes as any)[0];
        if (svcRow?.duration_minutes) serviceDuration = Number(svcRow.duration_minutes);
      }

      // Gera slots
      const slotMinutes = Number(sched.slot_minutes ?? 30);
      const [startH, startM] = String(sched.start_time).split(":").map(Number);
      const [endH, endM] = String(sched.end_time).split(":").map(Number);
      const startTotal = startH * 60 + startM;
      const endTotal = endH * 60 + endM;

      const allSlots: string[] = [];
      for (let t = startTotal; t + serviceDuration <= endTotal; t += slotMinutes) {
        const h = Math.floor(t / 60).toString().padStart(2, "0");
        const m = (t % 60).toString().padStart(2, "0");
        allSlots.push(`${h}:${m}`);
      }

      // Busca agendamentos existentes usando SQL raw
      const existingRes = await db.execute(sql`
        SELECT scheduled_at, duration_minutes
        FROM appointments
        WHERE professional_id = ${professionalId}
          AND tenant_id = ${tenantId}
          AND scheduled_at::date = ${date}::date
          AND status NOT IN ('cancelled', 'no_show')
      `);
      const existing = existingRes as any[];

      // Filtra slots ocupados
      const available = allSlots.filter(slot => {
        const [sh, sm] = slot.split(":").map(Number);
        const slotStart = sh * 60 + sm;
        const slotEnd   = slotStart + serviceDuration;
        return !existing.some((appt: any) => {
          const at = new Date(appt.scheduled_at);
          const apptStart = at.getHours() * 60 + at.getMinutes();
          const apptEnd   = apptStart + Number(appt.duration_minutes ?? 60);
          return slotStart < apptEnd && slotEnd > apptStart;
        });
      });

      return reply.send({ success: true, data: available });
    } catch (e: any) {
      return reply.status(500).send({ success: false, error: e.message });
    }
  });'''

content = content.replace(old_endpoint, new_endpoint)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("OK")
