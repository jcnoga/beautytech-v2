# -*- coding: utf-8 -*-
path = r"C:\projetos\beautytech-v2\backend\src\modules\all-modules.ts"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Adiciona helper auditLog apos os imports
helper = '''
// ============================================================
// AUDIT LOG HELPER
// ============================================================
async function auditLog(params: {
  tenantId: string;
  userId?: string;
  action: string;
  tableName?: string;
  recordId?: string;
  oldData?: any;
  newData?: any;
  ipAddress?: string;
}) {
  try {
    await db.insert(auditLogs).values({
      tenantId:  params.tenantId,
      userId:    params.userId ?? null,
      action:    params.action,
      tableName: params.tableName ?? null,
      recordId:  params.recordId ?? null,
      oldData:   params.oldData ?? null,
      newData:   params.newData ?? null,
      ipAddress: params.ipAddress ?? null,
    });
  } catch (e) {
    console.error("auditLog error:", e);
  }
}

'''

content = content.replace(
    "function paginate(page = 1, limit = 20) {",
    helper + "function paginate(page = 1, limit = 20) {"
)

# 2. Log ao criar agendamento
old_appt = "    return reply.status(201).send({ success: true, data: appt });\n  });\n\n  fastify.post(\"/appointments/:id/confirm\""
new_appt = """    auditLog({ tenantId, userId, action: "appointment.created", tableName: "appointments", recordId: appt.id, newData: { clientId: appt.clientId, scheduledAt: appt.scheduledAt, totalPrice: appt.totalPrice } });
    return reply.status(201).send({ success: true, data: appt });
  });

  fastify.post("/appointments/:id/confirm\""""
content = content.replace(old_appt, new_appt)

# 3. Log ao cancelar agendamento
old_cancel = '    return reply.send({ success: true, data: updated });\n  });\n\n  fastify.post("/appointments/:id/no-show"'
new_cancel = """    auditLog({ tenantId, userId, action: "appointment.cancelled", tableName: "appointments", recordId: req.params.id });
    return reply.send({ success: true, data: updated });
  });

  fastify.post("/appointments/:id/no-show\""""
content = content.replace(old_cancel, new_cancel)

# 4. Log ao criar cliente
old_client = "    return reply.status(201).send({ success: true, data: client });\n  });\n\n  fastify.patch(\"/clients/:id\""
new_client = """    auditLog({ tenantId, userId, action: "client.created", tableName: "clients", recordId: client.id, newData: { fullName: client.fullName, whatsapp: client.whatsapp } });
    return reply.status(201).send({ success: true, data: client });
  });

  fastify.patch("/clients/:id\""""
content = content.replace(old_client, new_client)

# 5. Log ao criar profissional
old_prof = "    return reply.status(201).send({ success: true, data: prof });"
new_prof = """    auditLog({ tenantId, userId, action: "professional.created", tableName: "professionals", recordId: prof.id, newData: { fullName: prof.fullName } });
    return reply.status(201).send({ success: true, data: prof });"""
content = content.replace(old_prof, new_prof, 1)

# 6. Endpoint GET /audit-logs para o painel do salao
audit_endpoint = '''
  // ============================================================
  // GET /audit-logs - Log de acoes do tenant
  // ============================================================
  fastify.get("/audit-logs", { preHandler: [authenticate] }, async (req: any, reply: any) => {
    const { tenantId } = req.tenantContext;
    const { page, limit } = req.query as any;
    const { limit: l, offset } = paginate(page, limit ?? 50);
    const data = await db.select().from(auditLogs)
      .where(eq(auditLogs.tenantId, tenantId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(l).offset(offset);
    return reply.send({ success: true, data, total: data.length });
  });

'''

# Insere antes do endpoint de demo/seed
content = content.replace(
    '  fastify.post("/demo/seed", { preHandler: [authenticate] }',
    audit_endpoint + '  fastify.post("/demo/seed", { preHandler: [authenticate] }'
)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("OK")
