// Painel do studio (controller): GET /classes/dashboard. Feature-guard group_classes (só Pilates; os outros nichos
// recebem 403). A regra fica em dashboard.service.ts.
import type { FastifyInstance } from "fastify";
import { db } from "@db/connection";
import { authenticate } from "@middleware/auth";
import { studioDashboard } from "./dashboard.service";

export async function classDashboardModule(fastify: FastifyInstance) {
  fastify.get("/classes/dashboard", { preHandler: [authenticate] }, async (req: any, reply) => {
    return reply.send({ success: true, data: await studioDashboard(db, req.tenantContext.tenantId, req.tenantContext.role) });
  });
}
