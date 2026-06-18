# -*- coding: utf-8 -*-
path = r"C:\projetos\beautytech-v2\backend\src\modules\all-modules.ts"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = "    const [prof] = await db.insert(professionals).values({ ...req.body, tenantId, createdBy: userId, updatedBy: userId }).returning();\n    return reply.status(201).send({ success: true, data: prof });"

new = """    const [prof] = await db.insert(professionals).values({ ...req.body, tenantId, createdBy: userId, updatedBy: userId }).returning();

    // Gera grade de horarios automaticamente baseado no businessType do tenant
    try {
      const [tenantData] = await db.select({ businessType: tenants.businessType }).from(tenants).where(eq(tenants.id, tenantId));
      const btype = tenantData?.businessType ?? "beauty_salon";
      const slotMin = btype === "barbershop" ? 30 : 45;

      // Seg-Sex: 08:00-18:00, Sab: 08:00-12:00, Dom: folga
      const schedules = [
        { dayOfWeek: 0, isWorking: false, startTime: "08:00", endTime: "18:00" }, // Dom
        { dayOfWeek: 1, isWorking: true,  startTime: "08:00", endTime: "18:00" }, // Seg
        { dayOfWeek: 2, isWorking: true,  startTime: "08:00", endTime: "18:00" }, // Ter
        { dayOfWeek: 3, isWorking: true,  startTime: "08:00", endTime: "18:00" }, // Qua
        { dayOfWeek: 4, isWorking: true,  startTime: "08:00", endTime: "18:00" }, // Qui
        { dayOfWeek: 5, isWorking: true,  startTime: "08:00", endTime: "18:00" }, // Sex
        { dayOfWeek: 6, isWorking: true,  startTime: "08:00", endTime: "12:00" }, // Sab
      ];

      for (const s of schedules) {
        await db.execute(sql`
          INSERT INTO professional_schedules (professional_id, tenant_id, day_of_week, is_working, start_time, end_time, slot_minutes, break_start, break_end)
          VALUES (${prof.id}, ${tenantId}, ${s.dayOfWeek}, ${s.isWorking}, ${s.startTime}, ${s.endTime}, ${slotMin},
            ${s.dayOfWeek >= 1 && s.dayOfWeek <= 5 ? "12:00" : null},
            ${s.dayOfWeek >= 1 && s.dayOfWeek <= 5 ? "13:00" : null})
          ON CONFLICT (professional_id, day_of_week) DO NOTHING
        `);
      }
    } catch (e) {
      console.error("Erro ao gerar grade automatica:", e);
    }

    return reply.status(201).send({ success: true, data: prof });"""

content = content.replace(old, new)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("OK")
