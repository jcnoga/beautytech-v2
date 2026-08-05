import { autoReplyRepository } from "./auto-reply.repository";

const DEFAULT_FRONTEND_URL = "https://www.zensalon.com.br";

function pickRandomExcluding<T extends { id: string }>(items: T[], excludeId?: string | null): T | null {
  if (items.length === 0) return null;
  const pool = items.length > 1 && excludeId ? items.filter((i) => i.id !== excludeId) : items;
  const chosen = pool.length > 0 ? pool : items;
  return chosen[Math.floor(Math.random() * chosen.length)];
}

function randomDelayMs(minSeconds: number, maxSeconds: number): number {
  const minMs = minSeconds * 1000;
  const maxMs = maxSeconds * 1000;
  return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
}

export const autoReplyService = {
  async handleIncomingMessage(instanceName: string, fromPhone: string) {
    const tenant = await autoReplyRepository.findTenantByInstance(instanceName);
    if (!tenant) return { skipped: true, reason: "tenant_not_found" };

    const settings = await autoReplyRepository.getSettings(tenant.id);
    if (!settings || !settings.isEnabled) return { skipped: true, reason: "disabled" };

    const normalizedPhone = fromPhone.replace(/\D/g, "");

    const conversation = await autoReplyRepository.getConversationState(tenant.id, normalizedPhone);
    if (conversation?.lastRepliedAt) {
      const cooldownMs = settings.cooldownHours * 60 * 60 * 1000;
      const elapsed = Date.now() - new Date(conversation.lastRepliedAt).getTime();
      if (elapsed < cooldownMs) return { skipped: true, reason: "cooldown" };
    }

    const client = await autoReplyRepository.findClientByPhone(tenant.id, normalizedPhone);
    const audience = client ? "existing_client" : "new_contact";

    const messages = await autoReplyRepository.listMessages(tenant.id, audience);
    const activeMessages = messages.filter((m) => m.isActive);
    const chosen = pickRandomExcluding(activeMessages, conversation?.lastMessageId);
    if (!chosen) return { skipped: true, reason: "no_messages_configured" };

    const bookingLink = `${process.env.FRONTEND_URL ?? DEFAULT_FRONTEND_URL}/agendar/${tenant.slug}/booking`;

    const finalText = chosen.message
      .replace(/{nome}/g, client?.fullName?.split(" ")[0] ?? "")
      .replace(/{link}/g, bookingLink);

    const delayMs = randomDelayMs(settings.replyDelayMinSeconds ?? 5, settings.replyDelayMaxSeconds ?? 8);
    await new Promise((resolve) => setTimeout(resolve, delayMs));

    const { sendTextMessage } = await import("../whatsapp/whatsapp.service.js");
    await sendTextMessage(normalizedPhone, finalText, tenant.id);

    await autoReplyRepository.upsertConversationState(tenant.id, normalizedPhone, chosen.id);

    return { skipped: false, audience, messageId: chosen.id };
  },
};
