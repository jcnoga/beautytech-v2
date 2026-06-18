# -*- coding: utf-8 -*-
path = r"C:\projetos\beautytech-v2\backend\src\modules\all-modules.ts"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Adiciona professional_schedules e services ao import
old = "  reviews, auditLogs, tenants, userProfiles,\n} from \"@db/schema/index\";"
new = "  reviews, auditLogs, tenants, userProfiles,\n  professionalSchedules, professionalServices,\n} from \"@db/schema/index\";"
content = content.replace(old, new)

# Corrige referencia no endpoint de availability
content = content.replace(
    ".from(professional_schedules)",
    ".from(professionalSchedules)"
)
content = content.replace(
    "eq(professional_schedules.professional_id, professionalId)",
    "eq(professionalSchedules.professionalId, professionalId)"
)
content = content.replace(
    "eq(professional_schedules.day_of_week, dow)",
    "eq(professionalSchedules.dayOfWeek, dow)"
)
content = content.replace(
    "sched.is_working",
    "sched.isWorking"
)
content = content.replace(
    "sched.slot_minutes",
    "sched.slotMinutes"
)
content = content.replace(
    "sched.start_time",
    "sched.startTime"
)
content = content.replace(
    "sched.end_time",
    "sched.endTime"
)
content = content.replace(
    "appointments.professional_id",
    "appointments.professionalId"
)
content = content.replace(
    "appointments.tenant_id",
    "appointments.tenantId"
)
content = content.replace(
    "appointments.scheduled_at",
    "appointments.scheduledAt"
)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("OK")
