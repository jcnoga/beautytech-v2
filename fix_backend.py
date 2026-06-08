
content = open("C:/projetos/beautytech-v2/backend/src/modules/all-modules.ts", encoding="utf-8").read()

old = '''// CLIENT RECORDS MODULE
export async function clientRecordsModule(fastify) {
  fastify.get("/client-records/:clientId", { preHandler: [authenticate] }, async (req, reply) => {
    const { tenantId } = req.tenantContext;
    const data = await db.execute(sqlSELECT * FROM client_records WHERE tenant_id =  AND client_id =  ORDER BY created_at DESC);
    return reply.send({ success: true, data: (data as any).rows ?? [] });
  });
  fastify.post("/client-records", { preHandler: [authenticate] }, async (req, reply) => {
    const { tenantId, userId } = req.tenantContext;
    const b = req.body as any;
    const data = await db.execute(sqlINSERT INTO client_records (tenant_id,client_id,type,allergies,medications,medical_history,previous_procedures,skin_type,contraindications,notes,created_by) VALUES (,,'anamnesis',??[],??null,??null,??null,??null,??null,??null,) RETURNING *);
    return reply.status(201).send({ success: true, data: ((data as any).rows??[])[0] });
  });
  fastify.patch("/client-records/:id", { preHandler: [authenticate] }, async (req, reply) => {
    const { tenantId } = req.tenantContext;
    const b = req.body as any;
    const data = await db.execute(sqlUPDATE client_records SET medications=COALESCE(??null,medications),medical_history=COALESCE(??null,medical_history),notes=COALESCE(??null,notes),updated_at=NOW() WHERE id= AND tenant_id= RETURNING *);
    return reply.send({ success: true, data: ((data as any).rows??[])[0] });
  });
}'''

new = '''// CLIENT RECORDS MODULE
export async function clientRecordsModule(fastify: any) {
  fastify.get("/client-records/:clientId", { preHandler: [authenticate] }, async (req: any, reply: any) => {
    const { tenantId } = req.tenantContext;
    const data = await db.execute(sqlSELECT * FROM client_records WHERE tenant_id =  AND client_id =  ORDER BY created_at DESC);
    return reply.send({ success: true, data: (data as any).rows ?? [] });
  });
  fastify.post("/client-records", { preHandler: [authenticate] }, async (req: any, reply: any) => {
    const { tenantId, userId } = req.tenantContext;
    const b = req.body as any;
    const data = await db.execute(sqlINSERT INTO client_records (tenant_id,client_id,type,medications,medical_history,previous_procedures,skin_type,contraindications,notes,created_by) VALUES (,,'anamnesis',,,,,,,) RETURNING *);
    return reply.status(201).send({ success: true, data: ((data as any).rows??[])[0] });
  });
  fastify.patch("/client-records/:id", { preHandler: [authenticate] }, async (req: any, reply: any) => {
    const { tenantId } = req.tenantContext;
    const b = req.body as any;
    const data = await db.execute(sqlUPDATE client_records SET medications=COALESCE(,medications),medical_history=COALESCE(,medical_history),notes=COALESCE(,notes),updated_at=NOW() WHERE id= AND tenant_id= RETURNING *);
    return reply.send({ success: true, data: ((data as any).rows??[])[0] });
  });
}'''

result = content.replace(old, new, 1)
open("C:/projetos/beautytech-v2/backend/src/modules/all-modules.ts", "w", encoding="utf-8").write(result)
print("DONE" if "clientRecordsModule" in result else "ERRO")
print("replaced" if old not in result else "NAO SUBSTITUIU")
