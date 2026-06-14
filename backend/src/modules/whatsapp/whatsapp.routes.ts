import { FastifyInstance } from "fastify";
import { authenticate } from "../../middleware/auth.js";
import { db } from "../../db/connection.js";
import { sendOwnerNotificationEmail } from "../resend.module.js";
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

        const [currentTenant] = await db.select({
          whatsappStatus: tenants.whatsappStatus,
          name: tenants.name,
        }).from(tenants).where(eq(tenants.id, tenantId));

        await db.update(tenants)
          .set({
            whatsappStatus: isConnected ? "connected" : "disconnected",
            whatsappPhone: data.number ?? null,
            whatsappConnectedAt: isConnected ? new Date() : null,
          })
          .where(eq(tenants.id, tenantId));

        // Notificar dono do SaaS quando salao conectar pela primeira vez
        if (isConnected && currentTenant?.whatsappStatus !== "connected") {
          const phone = data.number ?? "desconhecido";
          const name = currentTenant?.name ?? tenantId;
          const hora = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
          // Tentar WhatsApp
          const ownerPhone = process.env["NOTIFY_OWNER_PHONE"];
          const apiUrl = process.env["WHATSAPP_API_URL"];
          const apiKey = process.env["WHATSAPP_API_KEY"];
          const instance = process.env["WHATSAPP_INSTANCE"];
          if (ownerPhone && apiUrl && apiKey && instance) {
            try {
              const msg = "* Salao Conectado!*\n\n" +
                "*Salao:* " + name + "\n" +
                "*Numero:* " + phone + "\n" +
                "*Horario:* " + hora;
              await fetch(apiUrl + "/message/sendText/" + instance, {
                method: "POST",
                headers: { "Content-Type": "application/json", "apikey": apiKey },
                body: JSON.stringify({ number: ownerPhone, text: msg }),
              });
            } catch (e) {
              console.error("Erro ao notificar dono via WhatsApp:", e);
            }
          }
          // Sempre enviar e-mail
          await sendOwnerNotificationEmail(name, phone, hora);
        }
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
