// Super Admin, base comum (controller): marcas da conta (protegida / conta de teste) e a auditoria das operações.
// Só Super Admin (token próprio); fora do controle de nicho (não usa o login de empresa).
import type { FastifyInstance } from "fastify";
import { db } from "@db/connection";
import { requireSuperAdmin } from "@middleware/super-admin";
import { AdminOpsError, setFlags } from "./admin-ops.service";
import { listOperations } from "./admin-ops.repository";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Resposta padrão para os erros esperados das operações do Super Admin. */
export function sendAdminOpsError(reply: any, e: unknown) {
  if (e instanceof AdminOpsError) return reply.status(e.status).send({ success: false, error: e.message, code: e.code, data: e.data });
  throw e;
}

export async function adminOpsModule(fastify: FastifyInstance) {
  // Corpo: { isProtected?: boolean, isTestAccount?: boolean }
  fastify.patch("/super-admin/tenants/:id/flags", { preHandler: [requireSuperAdmin] }, async (req: any, reply) => {
    if (!UUID.test(req.params.id)) return reply.status(404).send({ success: false, error: "Conta não encontrada", code: "NOT_FOUND" });
    try { return reply.send({ success: true, data: await setFlags(db, req.params.id, req.body) }); }
    catch (e) { return sendAdminOpsError(reply, e); }
  });

  // Auditoria: últimas 100 operações (de uma conta, com ?tenantId=).
  fastify.get("/super-admin/operations", { preHandler: [requireSuperAdmin] }, async (req: any, reply) => {
    const { tenantId } = req.query as any;
    if (tenantId !== undefined && !UUID.test(String(tenantId))) return reply.send({ success: true, data: [] });
    return reply.send({ success: true, data: await listOperations(db, tenantId) });
  });
}
