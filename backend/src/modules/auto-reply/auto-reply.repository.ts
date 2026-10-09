import { db } from "../../db/connection.js";
import { autoReplySettings, autoReplyMessages, autoReplyConversations, tenants, clients } from "../../db/schema/index.js";
import { eq, and, sql } from "drizzle-orm";
import { NEW_CONTACT_DEFAULTS, phoneVariants } from "./auto-reply.text.js";

export const autoReplyRepository = {
  async findTenantByInstance(instanceName: string) {
    const [tenant] = await db
      .select({ id: tenants.id, slug: tenants.slug, customDomain: tenants.customDomain })
      .from(tenants)
      .where(eq(tenants.whatsappInstance, instanceName))
      .limit(1);
    return tenant ?? null;
  },

  async getSettings(tenantId: string) {
    const [settings] = await db
      .select()
      .from(autoReplySettings)
      .where(eq(autoReplySettings.tenantId, tenantId))
      .limit(1);
    return settings ?? null;
  },

  async upsertSettings(tenantId: string, data: { isEnabled?: boolean; linkTarget?: string; cooldownHours?: number; replyDelayMinSeconds?: number; replyDelayMaxSeconds?: number }) {
    const existing = await this.getSettings(tenantId);
    if (existing) {
      const [updated] = await db
        .update(autoReplySettings)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(autoReplySettings.tenantId, tenantId))
        .returning();
      return updated;
    }
    const [created] = await db
      .insert(autoReplySettings)
      .values({ tenantId, ...data })
      .returning();
    return created;
  },

  async listMessages(tenantId: string, audience?: "existing_client" | "new_contact") {
    const conditions = [eq(autoReplyMessages.tenantId, tenantId)];
    if (audience) conditions.push(eq(autoReplyMessages.audience, audience));
    return db
      .select()
      .from(autoReplyMessages)
      .where(and(...conditions))
      .orderBy(autoReplyMessages.sortOrder);
  },

  async createMessage(tenantId: string, data: { audience: string; message: string; sortOrder?: number }) {
    const [created] = await db
      .insert(autoReplyMessages)
      .values({ tenantId, ...data })
      .returning();
    return created;
  },

  async updateMessage(tenantId: string, id: string, data: { message?: string; isActive?: boolean; sortOrder?: number }) {
    const [updated] = await db
      .update(autoReplyMessages)
      .set(data)
      .where(and(eq(autoReplyMessages.id, id), eq(autoReplyMessages.tenantId, tenantId)))
      .returning();
    return updated ?? null;
  },

  async deleteMessage(tenantId: string, id: string) {
    await db
      .delete(autoReplyMessages)
      .where(and(eq(autoReplyMessages.id, id), eq(autoReplyMessages.tenantId, tenantId)));
  },

  /** phone vem do WhatsApp (só dígitos, com 55; às vezes sem o 9 do celular). O cadastro costuma ter "(34) 9xxxx-xxxx":
   *  compara com e sem 55 e com e sem o 9. */
  async findClientByPhone(tenantId: string, phone: string) {
    const variants = phoneVariants(phone);
    if (!variants.length) return null;
    const [client] = await db
      .select({ id: clients.id, fullName: clients.fullName })
      .from(clients)
      .where(and(eq(clients.tenantId, tenantId),
        sql`regexp_replace(${clients.whatsapp}, '\\D', '', 'g') IN (${sql.join(variants.map((v) => sql`${v}`), sql`, `)})`))
      .limit(1);
    return client ?? null;
  },

  async seedDefaultMessages(tenantId: string) {
    const existingCount = await this.listMessages(tenantId, "existing_client");
    const newContactCount = await this.listMessages(tenantId, "new_contact");

    const defaultExisting = [
      "Olá {nome}! Que bom te ver por aqui de novo. Quer agendar seu próximo horário? {link}",
      "Oi {nome}, tudo bem? Separei um espacinho pra você — dá uma olhada nos horários disponíveis: {link}",
      "Olá {nome}! Faz tempo que você não aparece por aqui. Que tal agendar um horário? {link}",
      "Oi {nome}! Vi sua mensagem por aqui. Pra agendar rapidinho, é só acessar: {link}",
      "Olá {nome}, tudo certo? Se quiser marcar um horário, é só clicar aqui: {link}",
      "Oi {nome}! Sempre bom te ter por aqui. Confira os horários disponíveis: {link}",
      "Olá {nome}! Recebemos sua mensagem. Pra agendar seu atendimento, acesse: {link}",
      "Oi {nome}, como vai? Deixei o link do agendamento aqui pra facilitar: {link}",
      "Olá {nome}! Obrigado por entrar em contato. Escolha seu horário por aqui: {link}",
      "Oi {nome}! Que ótimo falar com você de novo. Agende seu horário quando quiser: {link}",
    ];

    // {nome} = nome do WhatsApp de quem escreveu (some do texto quando não há nome utilizável).
    const defaultNewContact = NEW_CONTACT_DEFAULTS;

    let insertedExisting = 0;
    let insertedNewContact = 0;

    if (existingCount.length === 0) {
      for (let i = 0; i < defaultExisting.length; i++) {
        await this.createMessage(tenantId, { audience: "existing_client", message: defaultExisting[i], sortOrder: i });
      }
      insertedExisting = defaultExisting.length;
    }

    if (newContactCount.length === 0) {
      for (let i = 0; i < defaultNewContact.length; i++) {
        await this.createMessage(tenantId, { audience: "new_contact", message: defaultNewContact[i], sortOrder: i });
      }
      insertedNewContact = defaultNewContact.length;
    }

    return { insertedExisting, insertedNewContact };
  },

  async getConversationState(tenantId: string, contactPhone: string) {
    const [state] = await db
      .select()
      .from(autoReplyConversations)
      .where(and(eq(autoReplyConversations.tenantId, tenantId), eq(autoReplyConversations.contactPhone, contactPhone)))
      .limit(1);
    return state ?? null;
  },

  async upsertConversationState(tenantId: string, contactPhone: string, lastMessageId: string) {
    const existing = await this.getConversationState(tenantId, contactPhone);
    if (existing) {
      await db
        .update(autoReplyConversations)
        .set({ lastMessageId, lastRepliedAt: new Date() })
        .where(and(eq(autoReplyConversations.tenantId, tenantId), eq(autoReplyConversations.contactPhone, contactPhone)));
      return;
    }
    await db.insert(autoReplyConversations).values({
      tenantId,
      contactPhone,
      lastMessageId,
      lastRepliedAt: new Date(),
    });
  },
};
