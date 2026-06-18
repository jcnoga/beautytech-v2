# -*- coding: utf-8 -*-
path = r"C:\projetos\beautytech-v2\backend\src\modules\all-modules.ts"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Encontra o endpoint de booking publico para inserir antes dele
insert_after = 'fastify.post("/demo/seed", { preHandler: [authenticate] }'

availability_endpoint = '''
  // ============================================================
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
        .from(professional_schedules)
        .where(
          and(
            eq(professional_schedules.professional_id, professionalId),
            eq(professional_schedules.day_of_week, dow)
          )
        );

      if (!sched || !sched.is_working) {
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
      const slotMinutes = sched.slot_minutes ?? 30;
      const [startH, startM] = (sched.start_time as string).split(":").map(Number);
      const [endH, endM] = (sched.end_time as string).split(":").map(Number);
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
            eq(appointments.professional_id, professionalId),
            eq(appointments.tenant_id, tenant.id),
            sql`${appointments.scheduled_at} >= ${dayStart}::timestamptz`,
            sql`${appointments.scheduled_at} <= ${dayEnd}::timestamptz`,
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
  });

'''

content = content.replace(
    'fastify.post("/demo/seed", { preHandler: [authenticate] }',
    availability_endpoint + '  fastify.post("/demo/seed", { preHandler: [authenticate] }'
)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("OK")
