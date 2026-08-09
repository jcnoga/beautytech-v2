#!/usr/bin/env node
/**
 * add-auto-reply-schema.cjs
 *
 * Adiciona as definicoes Drizzle para as 3 tabelas de Recepcao Automatica
 * (auto_reply_settings, auto_reply_messages, auto_reply_conversations),
 * ja criadas manualmente via SQL no Supabase.
 *
 * Uso: node add-auto-reply-schema.cjs [caminho/para/schema/index.ts]
 */

const fs = require("fs");
const path = require("path");

const targetPath = process.argv[2] || path.join("src", "db", "schema", "index.ts");

if (!fs.existsSync(targetPath)) {
  console.error(`[ERRO] Arquivo nao encontrado: ${targetPath}`);
  process.exit(1);
}

const original = fs.readFileSync(targetPath, "utf8");

if (original.includes("autoReplySettings")) {
  console.log("[SKIP] 'autoReplySettings' ja existe no arquivo. Nada a fazer.");
  process.exit(0);
}

const usesCRLF = original.includes("\r\n");
const EOL = usesCRLF ? "\r\n" : "\n";

const anchor = `export const messageTemplates = pgTable("message_templates", {`;

if (!original.includes(anchor)) {
  console.error("[ERRO] Linha ancora 'export const messageTemplates' nao encontrada.");
  process.exit(1);
}

const newTables = [
  "// ─────────────────────────────────────────────────────────",
  "// RECEPCAO AUTOMATICA (auto-reply WhatsApp)",
  "// ─────────────────────────────────────────────────────────",
  'export const autoReplySettings = pgTable("auto_reply_settings", {',
  '  tenantId:      uuid("tenant_id").primaryKey().references(() => tenants.id),',
  '  isEnabled:     boolean("is_enabled").notNull().default(false),',
  '  linkTarget:    varchar("link_target", { length: 20 }).notNull().default("booking"),',
  '  cooldownHours: integer("cooldown_hours").notNull().default(24),',
  '  updatedAt:     timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),',
  "});",
  "",
  'export const autoReplyMessages = pgTable("auto_reply_messages", {',
  '  id:        uuid("id").primaryKey().defaultRandom(),',
  '  tenantId:  uuid("tenant_id").notNull().references(() => tenants.id),',
  '  audience:  varchar("audience", { length: 20 }).notNull(), // \'existing_client\' | \'new_contact\'',
  '  message:   text("message").notNull(),',
  '  sortOrder: integer("sort_order").notNull().default(0),',
  '  isActive:  boolean("is_active").notNull().default(true),',
  '  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),',
  "});",
  "",
  'export const autoReplyConversations = pgTable("auto_reply_conversations", {',
  '  tenantId:      uuid("tenant_id").notNull().references(() => tenants.id),',
  '  contactPhone:  varchar("contact_phone", { length: 30 }).notNull(),',
  '  lastMessageId: uuid("last_message_id").references(() => autoReplyMessages.id),',
  '  lastRepliedAt: timestamp("last_replied_at", { withTimezone: true }),',
  "}, (table) => ({",
  '  pk: unique("auto_reply_conversations_pk").on(table.tenantId, table.contactPhone),',
  "}));",
  "",
];

const insertion = newTables.join(EOL) + EOL;
const updated = original.replace(anchor, insertion + anchor);

let backupPath = `${targetPath}.bak`;
let counter = 1;
while (fs.existsSync(backupPath)) {
  backupPath = `${targetPath}.bak${counter}`;
  counter += 1;
}
fs.writeFileSync(backupPath, original, "utf8");
console.log(`[OK] Backup criado: ${backupPath}`);

fs.writeFileSync(targetPath, updated, "utf8");
console.log(`[OK] 3 tabelas adicionadas antes de 'messageTemplates' em: ${targetPath}`);
