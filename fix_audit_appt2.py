# -*- coding: utf-8 -*-
path = r"C:\projetos\beautytech-v2\backend\src\modules\all-modules.ts"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = "    return reply.status(201).send({ success: true, data: appt });\n  });\n\n  fastify.post(\"/appointments/:id/confirm\""
new = """    auditLog({ tenantId, userId, action: "appointment.created", tableName: "appointments", recordId: appt.id, newData: { scheduledAt: appt.scheduledAt, totalPrice: appt.totalPrice } });
    return reply.status(201).send({ success: true, data: appt });
  });

  fastify.post("/appointments/:id/confirm\""""

if old in content:
    content = content.replace(old, new)
    print("Substituido")
else:
    # Tenta alternativa
    idx = content.find("return reply.status(201).send({ success: true, data: appt });")
    print(f"Linha encontrada em indice: {idx}")
    print(repr(content[idx:idx+200]))

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
