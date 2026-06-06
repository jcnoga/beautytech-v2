import { FastifyInstance } from "fastify";
import { authenticate } from "../../middleware/auth.js";
import {
  sendTextMessage,
  sendTemplateMessage,
  getInstanceStatus,
  connectInstance,
  
  disconnectInstance,
  deleteInstance,
} from "./whatsapp.service.js";

export async function whatsappModule(fastify: FastifyInstance) {

  fastify.get("/whatsapp/status", { preHandler: [authenticate] }, async (req: any, reply) => {
    try {
      const tenantId = req.tenantContext.tenantId;
      const data = await getInstanceStatus(tenantId);
      return reply.send({ success: true, data });
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  fastify.post("/whatsapp/connect", { preHandler: [authenticate] }, async (req: any, reply) => {
    try {
      const tenantId = req.tenantContext.tenantId;
      const qr = await connectInstance(tenantId);
      return reply.send({ success: true, data: qr });
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  fastify.get("/whatsapp/qrcode", { preHandler: [authenticate] }, async (req: any, reply) => {
    try {
      const tenantId = req.tenantContext.tenantId;
      const qr = await connectInstance(tenantId);
      return reply.send({ success: true, data: qr });
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  fastify.post("/whatsapp/disconnect", { preHandler: [authenticate] }, async (req: any, reply) => {
    try {
      const tenantId = req.tenantContext.tenantId;
      const data = await disconnectInstance(tenantId);
      return reply.send({ success: true, data });
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  fastify.delete("/whatsapp/instance", { preHandler: [authenticate] }, async (req: any, reply) => {
    try {
      const tenantId = req.tenantContext.tenantId;
      const data = await deleteInstance(tenantId);
      return reply.send({ success: true, data });
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  fastify.post("/whatsapp/send-text", { preHandler: [authenticate] }, async (req: any, reply) => {
    const { number, text } = req.body as { number: string; text: string };
    if (!number || !text) {
      return reply.status(400).send({ success: false, error: "number e text sao obrigatorios" });
    }
    try {
      const tenantId = req.tenantContext.tenantId;
      const data = await sendTextMessage(number, text, tenantId);
      return reply.send({ success: true, data });
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  fastify.post("/whatsapp/send-template", { preHandler: [authenticate] }, async (req: any, reply) => {
    const { number, template, variables } = req.body as { number: string; template: string; variables: Record<string, string> };
    if (!number || !template) {
      return reply.status(400).send({ success: false, error: "number e template sao obrigatorios" });
    }
    try {
      const tenantId = req.tenantContext.tenantId;
      const data = await sendTemplateMessage(number, template, variables || {}, tenantId);
      return reply.send({ success: true, data });
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });
}
