content = open('backend/src/modules/appointments/appointments.routes.ts', 'r', encoding='latin-1').read()

old = '''    const targetDate = new Date(date + "T12:00:00");
    const dayNames = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
    const dayName = dayNames[targetDate.getDay()];
    const wh = (professional.workingHours as any) ?? {};
    const dayConfig = wh[dayName];

    if (!dayConfig || !dayConfig.enabled)
      return reply.send({ success: true, data: [], message: "Profissional nao trabalha neste dia" });

    const [startH, startM] = (dayConfig.start ?? "08:00").split(":").map(Number);
    const [endH, endM]     = (dayConfig.end   ?? "18:00").split(":").map(Number);'''

new = '''    const targetDate = new Date(date + "T12:00:00");
    const dayOfWeek = targetDate.getDay();
    const dayNames = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
    const dayName = dayNames[dayOfWeek];

    // Busca jornada da nova tabela professional_schedules
    const schedResult = await db.execute(sql`
      SELECT * FROM professional_schedules
      WHERE professional_id = ${professionalId}
      AND tenant_id = ${tenant.id}
      AND day_of_week = ${dayOfWeek}
    `);
    const schedRows = (schedResult as any).rows ?? (Array.isArray(schedResult) ? schedResult : []);

    let startH: number, startM: number, endH: number, endM: number, slotSize: number;

    if (schedRows.length > 0) {
      // Usa nova tabela
      const sched = schedRows[0];
      if (!sched.is_working) {
        return reply.send({ success: true, data: [], message: "Profissional nao trabalha neste dia" });
      }
      [startH, startM] = sched.start_time.split(":").map(Number);
      [endH, endM]     = sched.end_time.split(":").map(Number);
      slotSize         = sched.slot_minutes ?? 30;
    } else {
      // Fallback para workingHours antigo
      const wh = (professional.workingHours as any) ?? {};
      const dayConfig = wh[dayName];
      if (!dayConfig || !dayConfig.enabled) {
        return reply.send({ success: true, data: [], message: "Profissional nao trabalha neste dia" });
      }
      [startH, startM] = (dayConfig.start ?? "08:00").split(":").map(Number);
      [endH, endM]     = (dayConfig.end   ?? "18:00").split(":").map(Number);
      slotSize         = 30;
    }'''

content = content.replace(old, new, 1)

# Atualiza referencia de slotDuration no loop
old2 = '''    const slotDuration = service.durationMinutes;
    const slots: string[] = [];
    let current = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    while (current + slotDuration <= endMinutes) {
      slots.push(String(Math.floor(current / 60)).padStart(2,"0") + ":" + String(current % 60).padStart(2,"0"));
      current += slotDuration;
    }'''
new2 = '''    const slotDuration = service.durationMinutes;
    const slots: string[] = [];
    let current = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    while (current + slotDuration <= endMinutes) {
      slots.push(String(Math.floor(current / 60)).padStart(2,"0") + ":" + String(current % 60).padStart(2,"0"));
      current += (slotSize ?? slotDuration);
    }'''
content = content.replace(old2, new2, 1)

open('backend/src/modules/appointments/appointments.routes.ts', 'w', encoding='latin-1').write(content)
print('OK - schedules:', content.count('professional_schedules'))
