import { FastifyInstance } from "fastify";
import { autoReplyService } from "./auto-reply.service";
import { autoReplyRepository } from "./auto-reply.repository";

interface WebhookParams {
  instanceName: string;
}

interface EvolutionWebhookBody {
  event?: string;
  instance?: string;
  data?: {
    key?: { remoteJid?: string; fromMe?: boolean };
    pushName?: string;
    message?: unknown;
  };
}

export async function autoReplyController(fastify: FastifyInstance) {
  // ── Webhook publico (chamado pela Evolution API, sem autenticacao de usuario) ──
  fastify.post<{ Params: WebhookParams; Body: EvolutionWebhookBody }>(
    "/webhooks/evolution/:instanceName",
    async (request, reply) => {
      // Responde 200 sempre e rapido, para a Evolution API nao ficar reenviando.
      reply.status(200).send({ received: true });

      const { instanceName } = request.params;
      const body = request.body;

      // So processa mensagem recebida (nao enviada por nos mesmos), evento de upsert.
      if (body?.event !== "messages.upsert") return;
      if (body?.data?.key?.fromMe) return;

      const remoteJid = body?.data?.key?.remoteJid;
      if (!remoteJid) return;

      // remoteJid vem tipo "5534997824990@s.whatsapp.net" (ou "...@lid" em alguns casos)
      const phone = remoteJid.split("@")[0];
      if (!phone) return;

      try {
        await autoReplyService.handleIncomingMessage(instanceName, phone);
      } catch (err) {
        console.error("[AUTO-REPLY] Erro ao processar webhook:", err);
      }
    }
  );

  // ── Rotas autenticadas do tenant para configurar a Recepcao Automatica ──
  const { authenticate } = await import("../../middleware/auth.js");

  fastify.get("/auto-reply/settings", { preHandler: [authenticate] }, async (request: any, reply) => {
    const { tenantId } = request.tenantContext;
    const settings = await autoReplyRepository.getSettings(tenantId);
    return reply.send({
      success: true,
      data: settings ?? { tenantId, isEnabled: false, linkTarget: "booking", cooldownHours: 24 },
    });
  });

  fastify.patch("/auto-reply/settings", { preHandler: [authenticate] }, async (request: any, reply) => {
    const { tenantId } = request.tenantContext;
    const { isEnabled, linkTarget, cooldownHours } = request.body as {
      isEnabled?: boolean;
      linkTarget?: string;
      cooldownHours?: number;
    };
    const updated = await autoReplyRepository.upsertSettings(tenantId, { isEnabled, linkTarget, cooldownHours });
    return reply.send({ success: true, data: updated });
  });

  fastify.get("/auto-reply/messages", { preHandler: [authenticate] }, async (request: any, reply) => {
    const { tenantId } = request.tenantContext;
    const { audience } = request.query as { audience?: "existing_client" | "new_contact" };
    const messages = await autoReplyRepository.listMessages(tenantId, audience);
    return reply.send({ success: true, data: messages });
  });

  fastify.post("/auto-reply/messages/seed", { preHandler: [authenticate] }, async (request: any, reply) => {
    const { tenantId } = request.tenantContext;
    const result = await autoReplyRepository.seedDefaultMessages(tenantId);
    return reply.status(201).send({ success: true, data: result });
  });

  fastify.post("/auto-reply/messages", { preHandler: [authenticate] }, async (request: any, reply) => {
    const { tenantId } = request.tenantContext;
    const { audience, message, sortOrder } = request.body as { audience: string; message: string; sortOrder?: number };
    if (!audience || !message) {
      return reply.status(400).send({ success: false, error: "audience e message sao obrigatorios" });
    }
    const created = await autoReplyRepository.createMessage(tenantId, { audience, message, sortOrder });
    return reply.status(201).send({ success: true, data: created });
  });

  fastify.patch<{ Params: { id: string } }>(
    "/auto-reply/messages/:id",
    { preHandler: [authenticate] },
    async (request: any, reply) => {
      const { tenantId } = request.tenantContext;
      const { message, isActive, sortOrder } = request.body as { message?: string; isActive?: boolean; sortOrder?: number };
      const updated = await autoReplyRepository.updateMessage(tenantId, request.params.id, { message, isActive, sortOrder });
      if (!updated) return reply.status(404).send({ success: false, error: "Mensagem nao encontrada" });
      return reply.send({ success: true, data: updated });
    }
  );

  fastify.delete<{ Params: { id: string } }>(
    "/auto-reply/messages/:id",
    { preHandler: [authenticate] },
    async (request: any, reply) => {
      const { tenantId } = request.tenantContext;
      await autoReplyRepository.deleteMessage(tenantId, request.params.id);
      return reply.status(204).send();
    }
  );
}
