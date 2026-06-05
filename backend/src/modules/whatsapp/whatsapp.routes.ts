import { FastifyInstance } from 'fastify';
import { authenticate } from '../../middleware/auth.js';
import { sendTextMessage, sendTemplateMessage, getInstanceStatus } from './whatsapp.service.js';

export async function whatsappModule(fastify: FastifyInstance) {

  // Status da instancia
  fastify.get('/whatsapp/status', { preHandler: [authenticate] }, async (req, reply) => {
    try {
      const data = await getInstanceStatus();
      return reply.send({ success: true, data });
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  // Enviar mensagem de texto
  fastify.post('/whatsapp/send-text', { preHandler: [authenticate] }, async (req, reply) => {
    const { number, text } = req.body as { number: string; text: string };
    if (!number || !text) {
      return reply.status(400).send({ success: false, error: 'number e text sao obrigatorios' });
    }
    try {
      const data = await sendTextMessage(number, text);
      return reply.send({ success: true, data });
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  // Enviar mensagem com template
  fastify.post('/whatsapp/send-template', { preHandler: [authenticate] }, async (req, reply) => {
    const { number, template, variables } = req.body as { number: string; template: string; variables: Record<string, string> };
    if (!number || !template) {
      return reply.status(400).send({ success: false, error: 'number e template sao obrigatorios' });
    }
    try {
      const data = await sendTemplateMessage(number, template, variables || {});
      return reply.send({ success: true, data });
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });
}
