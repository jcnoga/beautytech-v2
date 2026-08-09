#!/usr/bin/env node
/**
 * patch-auto-reply-delay.cjs
 *
 * Adiciona delay configuravel (default 5-8s) na Recepcao Automatica do ZenSalon/BeautyTech v2.
 * Segue o padrao do projeto: backup .bakN, deteccao CRLF/LF, feedback [OK]/[SKIP], sem quebrar
 * se uma ancora nao bater (so reporta e segue pros proximos patches).
 *
 * Uso:
 *   node patch-auto-reply-delay.cjs
 *
 * Rode a partir da raiz do backend (onde fica src/).
 */

const fs = require("fs");
const path = require("path");

const SLASH = String.fromCharCode(47); // protege contra corrupcao de barra no Git Bash/MINGW64

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

function readFile(filePath) {
  if (!fs.existsSync(filePath)) {
    log("SKIP", `Arquivo nao encontrado: ${filePath}`);
    return null;
  }
  return fs.readFileSync(filePath, "utf8");
}

function applyPatch(filePath, patches) {
  const original = readFile(filePath);
  if (original === null) return;

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
      log("SKIP", `${filePath} :: "${label}" ancora nao encontrada (envie o trecho real para eu ajustar)`);
    }
  }

  if (!changed) {
    log("SKIP", `Nenhuma alteracao aplicada em ${filePath}`);
    return;
  }

  // normaliza EOL de volta pro padrao original do arquivo
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
// 1) SCHEMA DRIZZLE (src/db/schema/auto-reply.ts)
// ---------------------------------------------------------------------------
const schemaFile = path.join("src", "db", "schema", "auto-reply.ts");
applyPatch(schemaFile, [
  {
    label: "colunas de delay no schema",
    find: `export const autoReplySettings = pgTable('auto_reply_settings', {`,
    replace:
      `export const autoReplySettings = pgTable('auto_reply_settings', {` +
      `\n  replyDelayMinSeconds: integer('reply_delay_min_seconds').notNull().default(5),` +
      `\n  replyDelayMaxSeconds: integer('reply_delay_max_seconds').notNull().default(8),`,
  },
]);

// ---------------------------------------------------------------------------
// 2) REPOSITORY (src/modules/auto-reply/repository.ts)
// ---------------------------------------------------------------------------
const repoFile = path.join("src", "modules", "auto-reply", "repository.ts");
const repoAddition = `
export async function updateSettings(
  tenantId${SLASH.length ? ":" : ":"} string,
  data: Partial<{
    enabled: boolean;
    cooldownSeconds: number;
    replyDelayMinSeconds: number;
    replyDelayMaxSeconds: number;
  }>
) {
  const [updated] = await db
    .update(autoReplySettings)
    .set(data)
    .where(eq(autoReplySettings.tenantId, tenantId))
    .returning();
  return updated;
}
`;
applyPatch(repoFile, [
  {
    label: "funcao updateSettings (delay)",
    find: `export async function getSettingsByTenantId(tenantId: string) {`,
    replace: `${repoAddition}\nexport async function getSettingsByTenantId(tenantId: string) {`,
  },
]);

// ---------------------------------------------------------------------------
// 3) SERVICE (src/modules/auto-reply/service.ts)
// ---------------------------------------------------------------------------
const serviceFile = path.join("src", "modules", "auto-reply", "service.ts");
const serviceAddition = `
function randomDelayMs(minSeconds: number, maxSeconds: number): number {
  const minMs = minSeconds * 1000;
  const maxMs = maxSeconds * 1000;
  return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
}

export async function updateAutoReplySettings(
  tenantId: string,
  input: {
    enabled?: boolean;
    cooldownSeconds?: number;
    replyDelayMinSeconds?: number;
    replyDelayMaxSeconds?: number;
  }
) {
  if (
    input.replyDelayMinSeconds !== undefined &&
    input.replyDelayMaxSeconds !== undefined &&
    input.replyDelayMinSeconds > input.replyDelayMaxSeconds
  ) {
    throw new Error('reply_delay_min_seconds nao pode ser maior que reply_delay_max_seconds');
  }

  return repository.updateSettings(tenantId, input);
}
`;
applyPatch(serviceFile, [
  {
    label: "funcoes randomDelayMs + updateAutoReplySettings",
    find: `export async function sendAutoReply(`,
    replace: `${serviceAddition}\nexport async function sendAutoReply(`,
  },
  {
    label: "aplicar delay antes do envio em sendAutoReply",
    find: `  await whatsappService.sendTextMessage(instanceName, to, message);\n}`,
    replace:
      `  const settings = await repository.getSettingsByTenantId(tenantId);\n` +
      `  const minSeconds = settings?.replyDelayMinSeconds ?? 5;\n` +
      `  const maxSeconds = settings?.replyDelayMaxSeconds ?? 8;\n` +
      `  const delay = randomDelayMs(minSeconds, maxSeconds);\n` +
      `  await new Promise((resolve) => setTimeout(resolve, delay));\n\n` +
      `  await whatsappService.sendTextMessage(instanceName, to, message);\n}`,
  },
]);

// ---------------------------------------------------------------------------
// 4) CONTROLLER (src/modules/auto-reply/controller.ts)
// ---------------------------------------------------------------------------
const controllerFile = path.join("src", "modules", "auto-reply", "controller.ts");
const controllerAddition = `
export async function updateDelaySettingsAsAdmin(request: FastifyRequest, reply: FastifyReply) {
  if (!request.user?.isSuperAdmin) {
    return reply.status(403).send({ error: 'Acesso restrito ao Super Admin' });
  }

  const { tenantId } = request.params as { tenantId: string };
  const { replyDelayMinSeconds, replyDelayMaxSeconds } = request.body as {
    replyDelayMinSeconds: number;
    replyDelayMaxSeconds: number;
  };

  try {
    const updated = await autoReplyService.updateAutoReplySettings(tenantId, {
      replyDelayMinSeconds,
      replyDelayMaxSeconds,
    });
    return reply.send(updated);
  } catch (err: any) {
    return reply.status(400).send({ error: err.message });
  }
}
`;
applyPatch(controllerFile, [
  {
    label: "controller updateDelaySettingsAsAdmin",
    find: `// __AUTO_REPLY_CONTROLLER_END__`,
    replace: `${controllerAddition}\n// __AUTO_REPLY_CONTROLLER_END__`,
  },
]);

// ---------------------------------------------------------------------------
// 5) ROTA no server.ts (ou onde o plugin auto-reply registra as rotas)
// ---------------------------------------------------------------------------
const serverFile = "server.ts";
applyPatch(serverFile, [
  {
    label: "rota PATCH admin/tenants/:tenantId/auto-reply-settings",
    find: `// __AUTO_REPLY_ROUTES_END__`,
    replace:
      `  fastify.patch(\n` +
      `    '${SLASH}admin${SLASH}tenants${SLASH}:tenantId${SLASH}auto-reply-settings',\n` +
      `    { preHandler: [authenticate] },\n` +
      `    updateDelaySettingsAsAdmin\n` +
      `  );\n// __AUTO_REPLY_ROUTES_END__`,
  },
]);

console.log("\n=== Patch finalizado. Revise os [SKIP] acima antes de rodar npm run dev. ===");
