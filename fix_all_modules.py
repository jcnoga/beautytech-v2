
import re

content = open("C:/projetos/beautytech-v2/backend/src/modules/all-modules.ts", encoding="utf-8").read()

# Remove os 4 modulos corrompidos
import re
start = content.find("\n// CONSENT FORMS MODULE")
end = content.find("export { whatsappModule }")
middle = content[start:end]
print("Removendo", len(middle), "chars corrompidos")

new_modules = '''

// CONSENT FORMS MODULE
export async function consentFormsModule(fastify: any) {
  fastify.get("/consent-forms/:clientId", { preHandler: [authenticate] }, async (req: any, reply: any) => {
    const { tenantId } = req.tenantContext;
    const data = await db.execute(sqlSELECT * FROM consent_forms WHERE tenant_id =  AND client_id =  ORDER BY created_at DESC);
    return reply.send({ success: true, data: (data as any).rows ?? [] });
  });
  fastify.post("/consent-forms", { preHandler: [authenticate] }, async (req: any, reply: any) => {
    const { tenantId, userId } = req.tenantContext;
    const b = req.body as any;
    const data = await db.execute(sqlINSERT INTO consent_forms (tenant_id,client_id,type,content,created_by) VALUES (,,,,) RETURNING *);
    return reply.status(201).send({ success: true, data: ((data as any).rows??[])[0] });
  });
  fastify.post("/consent-forms/:id/sign", { preHandler: [authenticate] }, async (req: any, reply: any) => {
    const { tenantId } = req.tenantContext;
    const b = req.body as any;
    const data = await db.execute(sqlUPDATE consent_forms SET is_signed=true,signed_at=NOW(),signed_by_name=,ip_address=,updated_at=NOW() WHERE id= AND tenant_id= RETURNING *);
    return reply.send({ success: true, data: ((data as any).rows??[])[0] });
  });
  fastify.delete("/consent-forms/:id", { preHandler: [authenticate] }, async (req: any, reply: any) => {
    const { tenantId } = req.tenantContext;
    await db.execute(sqlDELETE FROM consent_forms WHERE id= AND tenant_id=);
    return reply.status(204).send();
  });
}

// APPOINTMENT PHOTOS MODULE
export async function appointmentPhotosModule(fastify: any) {
  fastify.get("/appointment-photos/:clientId", { preHandler: [authenticate] }, async (req: any, reply: any) => {
    const { tenantId } = req.tenantContext;
    const data = await db.execute(sqlSELECT * FROM appointment_photos WHERE tenant_id =  AND client_id =  ORDER BY taken_at DESC);
    return reply.send({ success: true, data: (data as any).rows ?? [] });
  });
  fastify.post("/appointment-photos", { preHandler: [authenticate] }, async (req: any, reply: any) => {
    const { tenantId, userId } = req.tenantContext;
    const b = req.body as any;
    const data = await db.execute(sqlINSERT INTO appointment_photos (tenant_id,client_id,appointment_id,type,storage_path,public_url,description,created_by) VALUES (,,,,,,,) RETURNING *);
    return reply.status(201).send({ success: true, data: ((data as any).rows??[])[0] });
  });
  fastify.delete("/appointment-photos/:id", { preHandler: [authenticate] }, async (req: any, reply: any) => {
    const { tenantId } = req.tenantContext;
    await db.execute(sqlDELETE FROM appointment_photos WHERE id= AND tenant_id=);
    return reply.status(204).send();
  });
}

// PROTOCOLS MODULE
export async function protocolsModule(fastify: any) {
  fastify.get("/protocols", { preHandler: [authenticate] }, async (req: any, reply: any) => {
    const { tenantId } = req.tenantContext;
    const data = await db.execute(sqlSELECT * FROM protocols WHERE tenant_id =  AND is_active = true ORDER BY name);
    return reply.send({ success: true, data: (data as any).rows ?? [] });
  });
  fastify.get("/protocols/:id/steps", { preHandler: [authenticate] }, async (req: any, reply: any) => {
    const { tenantId } = req.tenantContext;
    const data = await db.execute(sqlSELECT * FROM protocol_steps WHERE tenant_id =  AND protocol_id =  ORDER BY sort_order);
    return reply.send({ success: true, data: (data as any).rows ?? [] });
  });
  fastify.post("/protocols", { preHandler: [authenticate] }, async (req: any, reply: any) => {
    const { tenantId, userId } = req.tenantContext;
    const b = req.body as any;
    const data = await db.execute(sqlINSERT INTO protocols (tenant_id,name,description,service_id,created_by) VALUES (,,,,) RETURNING *);
    return reply.status(201).send({ success: true, data: ((data as any).rows??[])[0] });
  });
  fastify.post("/protocols/:id/steps", { preHandler: [authenticate] }, async (req: any, reply: any) => {
    const { tenantId } = req.tenantContext;
    const b = req.body as any;
    const data = await db.execute(sqlINSERT INTO protocol_steps (tenant_id,protocol_id,title,description,duration_minutes,sort_order,is_required) VALUES (,,,,,,) RETURNING *);
    return reply.status(201).send({ success: true, data: ((data as any).rows??[])[0] });
  });
  fastify.patch("/protocols/:id", { preHandler: [authenticate] }, async (req: any, reply: any) => {
    const { tenantId } = req.tenantContext;
    const b = req.body as any;
    const data = await db.execute(sqlUPDATE protocols SET name=COALESCE(,name),description=COALESCE(,description),is_active=COALESCE(,is_active),updated_at=NOW() WHERE id= AND tenant_id= RETURNING *);
    return reply.send({ success: true, data: ((data as any).rows??[])[0] });
  });
  fastify.delete("/protocols/:id", { preHandler: [authenticate] }, async (req: any, reply: any) => {
    const { tenantId } = req.tenantContext;
    await db.execute(sqlUPDATE protocols SET is_active=false,updated_at=NOW() WHERE id= AND tenant_id=);
    return reply.status(204).send();
  });
}

'''

result = content[:start] + new_modules + content[end:]
open("C:/projetos/beautytech-v2/backend/src/modules/all-modules.ts", "w", encoding="utf-8").write(result)
print("DONE")
