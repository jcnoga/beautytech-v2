// Interessados do Pilates (controller): funil interessado → experimental → matriculado (+ perdido).
// Rotas sob /class-leads, protegidas pelo feature-guard (class_leads: só Pilates; os outros nichos recebem 403).
// Reaproveita a tabela leads do CRM do salão; as rotas /leads do salão continuam separadas e iguais.
// Aqui: DTO, permissão, transação e Log de ações; a regra fica em leads.service.ts.
import type { FastifyInstance } from "fastify";
import { db } from "@db/connection";
import { authenticate } from "@middleware/auth";
import { parseBody } from "../dtos";
import { auditLog } from "../all-modules";
import { ClassError } from "./classes.service";
import { run, requireFrontDesk } from "./classes.routes";
import { classLeadCreateDto, classLeadUpdateDto } from "./group-classes.dto";
import * as svc from "./leads.service";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const notFound = (reply: any) => reply.status(404).send({ success: false, error: "Interessado não encontrado", code: "NOT_FOUND" });

export async function classLeadsModule(fastify: FastifyInstance) {
  fastify.get("/class-leads/stages", { preHandler: [authenticate] }, async (_req: any, reply) => {
    return reply.send({ success: true, data: svc.listStages() });
  });

  fastify.get("/class-leads", { preHandler: [authenticate] }, async (req: any, reply) => {
    const { tenantId } = req.tenantContext;
    const status = (req.query as any)?.status || undefined;
    try {
      const r = await svc.listLeads(db, tenantId, status);
      return reply.send({ success: true, data: r.data, counts: r.counts });
    } catch (e: any) {
      if (e instanceof ClassError) return reply.status(e.status).send({ success: false, error: e.message, code: e.code });
      throw e;
    }
  });

  fastify.get("/class-leads/:id", { preHandler: [authenticate] }, async (req: any, reply) => {
    if (!UUID.test(req.params.id)) return notFound(reply);
    return run(reply, (tx) => svc.getLead(tx, req.tenantContext.tenantId, req.params.id));
  });

  fastify.post("/class-leads", { preHandler: [authenticate, requireFrontDesk] }, async (req: any, reply) => {
    const { tenantId, userId } = req.tenantContext;
    const body = parseBody(classLeadCreateDto, req, reply); if (!body) return;
    return run(reply, async (tx) => {
      const lead = await svc.createLead(tx, tenantId, userId, body);
      auditLog({ tenantId, userId, action: "classes.lead.created", tableName: "leads", recordId: lead.id, newData: { name: lead.name, status: lead.status } });
      return lead;
    }, 201);
  });

  fastify.patch("/class-leads/:id", { preHandler: [authenticate, requireFrontDesk] }, async (req: any, reply) => {
    const { tenantId, userId } = req.tenantContext;
    if (!UUID.test(req.params.id)) return notFound(reply);
    const body = parseBody(classLeadUpdateDto, req, reply); if (!body) return;
    return run(reply, async (tx) => {
      const lead = await svc.updateLead(tx, tenantId, userId, req.params.id, body);
      auditLog({ tenantId, userId, action: "classes.lead.updated", tableName: "leads", recordId: lead.id, newData: body });
      return lead;
    });
  });
}
