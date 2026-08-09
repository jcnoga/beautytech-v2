#!/usr/bin/env node
/**
 * patch-schema-auto-reply-delay.cjs
 *
 * Corrige o patch do schema (src/db/schema/index.ts), normalizando CRLF/LF
 * antes de comparar a ancora, ja que esse arquivo usa quebra de linha \r\n.
 *
 * Rode a partir da raiz do backend: /c/projetos/beautytech-v2/backend
 *   node patch-schema-auto-reply-delay.cjs
 */

const fs = require("fs");
const path = require("path");

function log(status, msg) {
  console.log(`[${status}] ${msg}`);
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

const filePath = path.join("src", "db", "schema", "index.ts");

if (!fs.existsSync(filePath)) {
  log("SKIP", `Arquivo nao encontrado: ${filePath}`);
  process.exit(0);
}

const original = fs.readFileSync(filePath, "utf8");
const eol = original.includes("\r\n") ? "\r\n" : "\n";

// Normaliza para LF só para fazer a busca/substituicao com seguranca
const normalized = original.replace(/\r\n/g, "\n");

const find =
  `  cooldownHours: integer("cooldown_hours").notNull().default(24),\n` +
  `  updatedAt:     timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),\n` +
  `});`;

const replace =
  `  cooldownHours: integer("cooldown_hours").notNull().default(24),\n` +
  `  replyDelayMinSeconds: integer("reply_delay_min_seconds").notNull().default(5),\n` +
  `  replyDelayMaxSeconds: integer("reply_delay_max_seconds").notNull().default(8),\n` +
  `  updatedAt:     timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),\n` +
  `});`;

if (!normalized.includes(find)) {
  log("SKIP", `${filePath} :: ancora ainda nao encontrada mesmo apos normalizar CRLF/LF`);
  process.exit(0);
}

if (normalized.includes(replace)) {
  log("SKIP", `${filePath} :: patch ja aplicado anteriormente`);
  process.exit(0);
}

let patched = normalized.split(find).join(replace);

// Restaura o EOL original do arquivo
if (eol === "\r\n") {
  patched = patched.replace(/\n/g, "\r\n");
}

const bak = backupPath(filePath);
fs.writeFileSync(bak, original, "utf8");
fs.writeFileSync(filePath, patched, "utf8");

log("OK", `${filePath} :: colunas replyDelayMinSeconds/MaxSeconds aplicadas`);
log("OK", `Backup salvo em ${bak}`);
