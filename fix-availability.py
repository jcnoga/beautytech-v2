import re

path = r'C:\projetos\beautytech-v2\backend\src\modules\appointments\appointments.routes.ts'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old = '''      const dayNames = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
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
          return reply.send({ success: true, data: [], message: "Profissional nao trabalha neste dia"
});
        }
        [startH, startM] = sched.start_time.split(":").map(Number);
        [endH, endM]     = sched.end_time.split(":").map(Number);
        slotSize         = sched.slot_minutes ?? 30;
      } else {
        // Fallback para workingHours antigo
        const wh = (professional.workingHours as any) ?? {};
        const dayConfig = wh[dayName];
        if (!dayConfig || !dayConfig.enabled) {
          return reply.send({ success: true, data: [], message: "Profissional nao trabalha neste dia"
});
        }
        [startH, startM] = (dayConfig.start ?? "08:00").split(":").map(Number);
        [endH, endM]     = (dayConfig.end   ?? "18:00").split(":").map(Number);
        slotSize         = 30;
      }'''

new = '''      // Busca jornada: tenta por numero do dia (0-6) no working_hours
      const wh = (professional.workingHours as any) ?? {};
      // Suporta chave numerica ("0"-"6") e chave por nome ("sunday"-"saturday")
      const dayNames = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
      const dayName = dayNames[dayOfWeek];
      const dayConfig = wh[String(dayOfWeek)] ?? wh[dayOfWeek] ?? wh[dayName];
      let startH: number, startM: number, endH: number, endM: number, slotSize: number;
      if (!dayConfig || (!dayConfig.enabled && !dayConfig.isWorking)) {
        return reply.send({ success: true, data: [], message: "Profissional nao trabalha neste dia" });
      }
      [startH, startM] = (dayConfig.start ?? "08:00").split(":").map(Number);
      [endH, endM]     = (dayConfig.end   ?? "18:00").split(":").map(Number);
      slotSize         = dayConfig.slotMinutes ?? 30;'''

if old in content:
    content = content.replace(old, new)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("OK: availability corrigido - working_hours por numero do dia")
else:
    print("ERRO: trecho nao encontrado - verifique o arquivo")
