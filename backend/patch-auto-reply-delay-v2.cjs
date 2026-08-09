#!/usr/bin/env node
/**
 * patch-auto-reply-delay-v2.cjs
 *
 * Adiciona delay configuravel (default 5-8s) na Recepcao Automatica do ZenSalon/BeautyTech v2,
 * com configuracao exclusiva do Super Admin (reaproveitando requireSuperAdmin ja existente).
 *
 * Rode a partir da raiz do backend: /c/projetos/beautytech-v2/backend
 *   node patch-auto-reply-delay-v2.cjs
 */

const fs = require("fs");
const path = require("path");

function log(status, msg) {
  console.log(`[${status}] ${msg}`);
}

function detectEOL(content) {
  return content.includes("\r\n") ? "\r\n" : "\n";
}

function backupPath(filePath) {
  let n = 1;
  let candidate = `${filePath}.bak${n}`;
  while (fs.existsSync(candidate)) {
    n += 1;
    candidate = `${filePath}.bak${n}`;
  }
  return candidate;
}

function applyPatch(filePath, patches) {
  if (!fs.existsSync(filePath)) {
    log("SKIP", `Arquivo nao encontrado: ${filePath}`);
    return;
  }
  const original = fs.readFileSync(filePath, "utf8");
  const eol = detectEOL(original);
  let content = original;
  let changed = false;

  for (const { label, find, replace } of patches) {
    if (content.includes(find)) {
      if (content.includes(replace)) {
        log("SKIP", `${filePath} :: "${label}" ja aplicado anteriormente`);
        continue;
      }
      content = content.split(find).join(replace);
      changed = true;
      log("OK", `${filePath} :: "${label}" aplicado`);
    } else {
      log("SKIP", `${filePath} :: "${label}" ancora nao encontrada`);
    }
  }

  if (!changed) {
    log("SKIP", `Nenhuma alteracao aplicada em ${filePath}`);
    return;
  }

  if (eol === "\r\n") {
    content = content.replace(/\r?\n/g, "\r\n");
  }

  const bak = backupPath(filePath);
  fs.writeFileSync(bak, original, "utf8");
  fs.writeFileSync(filePath, content, "utf8");
  log("OK", `Backup salvo em ${bak}`);
  log("OK", `${filePath} atualizado`);
}

// ---------------------------------------------------------------------------
// 1) SCHEMA (src/db/schema/index.ts) - adiciona colunas de delay na tabela
// ---------------------------------------------------------------------------
const schemaFile = path.join("src", "db", "schema", "index.ts");
applyPatch(schemaFile, [
  {
    label: "colunas replyDelayMinSeconds/MaxSeconds em autoReplySettings",
    find:
      `  cooldownHours: integer("cooldown_hours").notNull().default(24),\n` +
      `  updatedAt:     timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),\n` +
      `});`,
    replace:
      `  cooldownHours: integer("cooldown_hours").notNull().default(24),\n` +
      `  replyDelayMinSeconds: integer("reply_delay_min_seconds").notNull().default(5),\n` +
      `  replyDelayMaxSeconds: integer("reply_delay_max_seconds").notNull().default(8),\n` +
      `  updatedAt:     timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),\n` +
      `});`,
  },
]);

// ---------------------------------------------------------------------------
// 2) REPOSITORY (src/modules/auto-reply/auto-reply.repository.ts)
//    upsertSettings ja aceita "data" generico -> so precisa estender o tipo
// ---------------------------------------------------------------------------
const repoFile = path.join("src", "modules", "auto-reply", "auto-reply.repository.ts");
applyPatch(repoFile, [
  {
    label: "estender tipo de upsertSettings com campos de delay",
    find: `  async upsertSettings(tenantId: string, data: { isEnabled?: boolean; linkTarget?: string; cooldownHours?: number }) {`,
    replace:
      `  async upsertSettings(tenantId: string, data: { isEnabled?: boolean; linkTarget?: string; cooldownHours?: number; replyDelayMinSeconds?: number; replyDelayMaxSeconds?: number }) {`,
  },
]);

// ---------------------------------------------------------------------------
// 3) SERVICE (src/modules/auto-reply/auto-reply.service.ts)
//    adiciona randomDelayMs + aplica delay antes do envio
// ---------------------------------------------------------------------------
const serviceFile = path.join("src", "modules", "auto-reply", "auto-reply.service.ts");
applyPatch(serviceFile, [
  {
    label: "funcao randomDelayMs",
    find: `function pickRandomExcluding<T extends { id: string }>(items: T[], excludeId?: string | null): T | null {
  if (items.length === 0) return null;
  const pool = items.length > 1 && excludeId ? items.filter((i) => i.id !== excludeId) : items;
  const chosen = pool.length > 0 ? pool : items;
  return chosen[Math.floor(Math.random() * chosen.length)];
}`,
    replace: `function pickRandomExcluding<T extends { id: string }>(items: T[], excludeId?: string | null): T | null {
  if (items.length === 0) return null;
  const pool = items.length > 1 && excludeId ? items.filter((i) => i.id !== excludeId) : items;
  const chosen = pool.length > 0 ? pool : items;
  return chosen[Math.floor(Math.random() * chosen.length)];
}

function randomDelayMs(minSeconds: number, maxSeconds: number): number {
  const minMs = minSeconds * 1000;
  const maxMs = maxSeconds * 1000;
  return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
}`,
  },
  {
    label: "aplicar delay antes do envio em handleIncomingMessage",
    find: `    const { sendTextMessage } = await import("../whatsapp/whatsapp.service.js");
    await sendTextMessage(normalizedPhone, finalText, tenant.id);`,
    replace: `    const delayMs = randomDelayMs(settings.replyDelayMinSeconds ?? 5, settings.replyDelayMaxSeconds ?? 8);
    await new Promise((resolve) => setTimeout(resolve, delayMs));

    const { sendTextMessage } = await import("../whatsapp/whatsapp.service.js");
    await sendTextMessage(normalizedPhone, finalText, tenant.id);`,
  },
]);

// ---------------------------------------------------------------------------
// 4) ALL-MODULES.TS - import da tabela + rota exclusiva de Super Admin
// ---------------------------------------------------------------------------
const allModulesFile = path.join("src", "modules", "all-modules.ts");
applyPatch(allModulesFile, [
  {
    label: "import autoReplySettings no bloco de schema",
    find: `  reviews, auditLogs, tenants, userProfiles,
} from "@db/schema/index";`,
    replace: `  reviews, auditLogs, tenants, userProfiles,
  autoReplySettings,
} from "@db/schema/index";`,
  },
  {
    label: "rota Super Admin PATCH auto-reply-delay",
    find: `      updatedAt: new Date(),
    }).where(eq(tenants.id, req.params.id)).returning();
    return reply.send({ success: true, data: tenant });
  });

  // ============================================================
// COLE ISSO logo depois da rota /super-admin/tenants/:id/whatsapp-mode`,
    replace: `      updatedAt: new Date(),
    }).where(eq(tenants.id, req.params.id)).returning();
    return reply.send({ success: true, data: tenant });
  });

  fastify.patch("/super-admin/tenants/:id/auto-reply-delay", { preHandler: [requireSuperAdmin] }, async (req: any, reply: any) => {
    const { replyDelayMinSeconds, replyDelayMaxSeconds } = req.body as { replyDelayMinSeconds: number; replyDelayMaxSeconds: number };
    if (replyDelayMinSeconds === undefined || replyDelayMaxSeconds === undefined) {
      return reply.status(400).send({ success: false, error: "replyDelayMinSeconds e replyDelayMaxSeconds sao obrigatorios" });
    }
    if (Number(replyDelayMinSeconds) > Number(replyDelayMaxSeconds)) {
      return reply.status(400).send({ success: false, error: "O minimo nao pode ser maior que o maximo" });
    }
    const existing = await db.select().from(autoReplySettings).where(eq(autoReplySettings.tenantId, req.params.id)).limit(1);
    let updated;
    if (existing.length > 0) {
      [updated] = await db.update(autoReplySettings)
        .set({ replyDelayMinSeconds: Number(replyDelayMinSeconds), replyDelayMaxSeconds: Number(replyDelayMaxSeconds), updatedAt: new Date() })
        .where(eq(autoReplySettings.tenantId, req.params.id))
        .returning();
    } else {
      [updated] = await db.insert(autoReplySettings)
        .values({ tenantId: req.params.id, replyDelayMinSeconds: Number(replyDelayMinSeconds), replyDelayMaxSeconds: Number(replyDelayMaxSeconds) })
        .returning();
    }
    return reply.send({ success: true, data: updated });
  });

  // ============================================================
// COLE ISSO logo depois da rota /super-admin/tenants/:id/whatsapp-mode`,
  },
]);

console.log("\n=== Patch finalizado. Revise os [SKIP] acima antes de rodar npm run dev. ===");
