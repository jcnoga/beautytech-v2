// Dados de teste (Super Admin), controller. Só Super Admin; a regra fica em test-data.service.ts.
//   GET    /super-admin/tenants/:id/test-data                    lotes da conta + travas para gerar (sem gerar nada)
//   POST   /super-admin/tenants/:id/test-data                    gera um lote (conta de teste, sem assinatura, dentro do plano)
//   GET    /super-admin/tenants/:id/test-data/:batchId/preview   o que o apagar remove e o que está ligado a dados fora do lote
//   DELETE /super-admin/tenants/:id/test-data/:batchId           apaga o lote (tudo ou nada)
import type { FastifyInstance } from "fastify";
import { requireSuperAdmin } from "@middleware/super-admin";
import { sendAdminOpsError } from "./admin-ops.routes";
import { deleteTestBatch, generateTestData, generationBlocks, listTestBatches, previewBatchDeletion } from "./test-data.service";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const notFound = (reply: any) => reply.status(404).send({ success: false, error: "Conta não encontrada", code: "NOT_FOUND" });

export async function testDataModule(fastify: FastifyInstance) {
  fastify.get("/super-admin/tenants/:id/test-data", { preHandler: [requireSuperAdmin] }, async (req: any, reply) => {
    if (!UUID.test(req.params.id)) return notFound(reply);
    try {
      const { blocks, needs } = await generationBlocks(req.params.id);
      return reply.send({ success: true, data: { batches: await listTestBatches(req.params.id), blocks, needs } });
    } catch (e) { return sendAdminOpsError(reply, e); }
  });

  fastify.post("/super-admin/tenants/:id/test-data", { preHandler: [requireSuperAdmin] }, async (req: any, reply) => {
    if (!UUID.test(req.params.id)) return notFound(reply);
    try {
      const actor = String(req.superAdmin?.email ?? "super_admin");
      return reply.status(201).send({ success: true, data: await generateTestData(fastify, req.params.id, actor, req.ip) });
    } catch (e) { return sendAdminOpsError(reply, e); }
  });

  fastify.get("/super-admin/tenants/:id/test-data/:batchId/preview", { preHandler: [requireSuperAdmin] }, async (req: any, reply) => {
    if (!UUID.test(req.params.id) || !UUID.test(req.params.batchId)) return notFound(reply);
    try {
      return reply.send({ success: true, data: await previewBatchDeletion(req.params.id, req.params.batchId) });
    } catch (e) { return sendAdminOpsError(reply, e); }
  });

  fastify.delete("/super-admin/tenants/:id/test-data/:batchId", { preHandler: [requireSuperAdmin] }, async (req: any, reply) => {
    if (!UUID.test(req.params.id) || !UUID.test(req.params.batchId)) return notFound(reply);
    try {
      const actor = String(req.superAdmin?.email ?? "super_admin");
      return reply.send({ success: true, data: await deleteTestBatch(req.params.id, req.params.batchId, actor, req.ip) });
    } catch (e) { return sendAdminOpsError(reply, e); }
  });
}
