content = '''import { FastifyInstance } from "fastify";
import { authenticate } from "../../middleware/auth.js";
import { db } from "../../db/connection.js";
import { tenants } from "../../db/schema/index.js";
import { eq } from "drizzle-orm";
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

      // Atualiza status no banco conforme retorno da Evolution API
      if (data && data.state) {
        const isConnected = data.state === "open";
        await db.update(tenants)
          .set({
            whatsappStatus: isConnected ? "connected" : "disconnected",
            whatsappPhone: data.number ?? null,
            whatsappConnectedAt: isConnected ? new Date() : null,
          })
          .where(eq(tenants.id, tenantId));
      }

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

      // Limpa status no banco
      await db.update(tenants)
        .set({
          whatsappStatus: "disconnected",
          whatsappPhone: null,
          whatsappConnectedAt: null,
        })
        .where(eq(tenants.id, tenantId));

      return reply.send({ success: true, data });
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  fastify.delete("/whatsapp/instance", { preHandler: [authenticate] }, async (req: any, reply) => {
    try {
      const tenantId = req.tenantContext.tenantId;
      const data = await deleteInstance(tenantId);

      // Limpa status no banco
      await db.update(tenants)
        .set({
          whatsappStatus: "disconnected",
          whatsappPhone: null,
          whatsappConnectedAt: null,
        })
        .where(eq(tenants.id, tenantId));

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
'''

path = r"C:\projetos\beautytech-v2\backend\src\modules\whatsapp\whatsapp.routes.ts"
with open(path, "w", encoding="utf-8", newline="\n") as f:
    f.write(content)
print("OK - whatsapp.routes.ts atualizado")
