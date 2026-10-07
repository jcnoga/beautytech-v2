// Dados de teste (Super Admin), controller. Só Super Admin; a regra fica em test-data.service.ts.
//   GET  /super-admin/tenants/:id/test-data          lotes da conta + travas para gerar (sem gerar nada)
//   POST /super-admin/tenants/:id/test-data          gera um lote (conta de teste, sem assinatura, dentro do plano)
import type { FastifyInstance } from "fastify";
import { requireSuperAdmin } from "@middleware/super-admin";
import { sendAdminOpsError } from "./admin-ops.routes";
import { generateTestData, generationBlocks, listTestBatches } from "./test-data.service";

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
}
