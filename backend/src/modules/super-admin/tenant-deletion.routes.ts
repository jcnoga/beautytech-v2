// Super Admin, "Excluir conta" (controller). Só Super Admin; a regra fica em tenant-deletion.service.ts.
//   GET  /super-admin/tenants/:id/deletion-preview   só lê: contagens, logins, arquivos, WhatsApp, bloqueios e previewHash
//   POST /super-admin/tenants/:id/delete             { confirmName, password, previewHash }
//   POST /super-admin/operations/:id/retry-cleanup   repete a limpeza de fora do banco que falhou
import type { FastifyInstance } from "fastify";
import { requireSuperAdmin } from "@middleware/super-admin";
import { sendAdminOpsError } from "./admin-ops.routes";
import { deleteTenant, deletionPreview, retryCleanup } from "./tenant-deletion.service";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const notFound = (reply: any) => reply.status(404).send({ success: false, error: "Não encontrado", code: "NOT_FOUND" });

export async function tenantDeletionModule(fastify: FastifyInstance) {
  fastify.get("/super-admin/tenants/:id/deletion-preview", { preHandler: [requireSuperAdmin] }, async (req: any, reply) => {
    if (!UUID.test(req.params.id)) return notFound(reply);
    try { return reply.send({ success: true, data: await deletionPreview(req.params.id) }); }
    catch (e) { return sendAdminOpsError(reply, e); }
  });

  fastify.post("/super-admin/tenants/:id/delete", { preHandler: [requireSuperAdmin] }, async (req: any, reply) => {
    if (!UUID.test(req.params.id)) return notFound(reply);
    try {
      const actor = String(req.superAdmin?.email ?? "super_admin");
      return reply.send({ success: true, data: await deleteTenant(req.params.id, req.body, actor, req.ip) });
    } catch (e) { return sendAdminOpsError(reply, e); }
  });

  fastify.post("/super-admin/operations/:id/retry-cleanup", { preHandler: [requireSuperAdmin] }, async (req: any, reply) => {
    if (!UUID.test(req.params.id)) return notFound(reply);
    try { return reply.send({ success: true, data: await retryCleanup(req.params.id) }); }
    catch (e) { return sendAdminOpsError(reply, e); }
  });
}
