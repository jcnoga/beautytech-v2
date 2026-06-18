# -*- coding: utf-8 -*-
path = r"C:\projetos\beautytech-v2\backend\src\modules\all-modules.ts"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = '    return reply.status(201).send({ success: true, data: appt });\n  });\n\n  fastify.patch("/appointments/:id"'
new = '    auditLog({ tenantId, userId, action: "appointment.created", tableName: "appointments", recordId: appt.id, newData: { scheduledAt: appt.scheduledAt, totalPrice: appt.totalPrice } });\n    return reply.status(201).send({ success: true, data: appt });\n  });\n\n  fastify.patch("/appointments/:id"'

if old in content:
    content = content.replace(old, new)
    print("OK - substituido")
else:
    print("ERRO - nao encontrado")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
