// Super Admin, base comum (service) de "Excluir conta" e "Dados de teste":
// - ordem de exclusão calculada pelas ligações reais do banco (filhos antes dos pais), recusando ligação circular;
// - prévia com impressão digital (previewHash): a exclusão só roda se os números ainda forem os da prévia;
// - nova conferência da senha do Super Admin, com trava após 5 erros seguidos por 15 minutos (por IP);
// - marcas da conta (protegida / conta de teste) e auditoria em admin_operations.
import { createHash, timingSafeEqual } from "node:crypto";
import * as repo from "./admin-ops.repository";
import type { FkEdge } from "./admin-ops.repository";

export class AdminOpsError extends Error {
  constructor(public status: number, public code: string, message: string, public data?: unknown) { super(message); }
}

/**
 * Ordem para apagar as linhas de `tables`: uma tabela só vem depois de todas as que apontam para ela (dentro do
 * conjunto). Ligação de uma tabela com ela mesma não conta (um DELETE só resolve). Ciclo entre tabelas = erro.
 */
export function deletionOrder(tables: string[], edges: FkEdge[]): string[] {
  const set = new Set(tables);
  const children = new Map<string, Set<string>>(tables.map((t) => [t, new Set<string>()]));
  for (const e of edges) if (set.has(e.child) && set.has(e.parent) && e.child !== e.parent) children.get(e.parent)!.add(e.child);
  const order: string[] = [];
  const done = new Set<string>();
  while (order.length < tables.length) {
    const ready = tables.filter((t) => !done.has(t) && [...children.get(t)!].every((c) => done.has(c))).sort();
    if (ready.length === 0) {
      const stuck = tables.filter((t) => !done.has(t));
      throw new AdminOpsError(409, "FK_CYCLE", `Ligação circular entre tabelas: ${stuck.join(", ")}`, { tables: stuck });
    }
    for (const t of ready) { order.push(t); done.add(t); }
  }
  return order;
}

/** Ligações que vêm de FORA do conjunto para dentro dele (bloqueariam o DELETE se forem NO ACTION/RESTRICT). */
export function incomingFromOutside(tables: string[], edges: FkEdge[]): FkEdge[] {
  const set = new Set(tables);
  return edges.filter((e) => set.has(e.parent) && !set.has(e.child));
}

/** Impressão digital das contagens (chaves em ordem): muda se qualquer número mudar. */
export function previewHash(counts: Record<string, unknown>): string {
  const sorted = Object.fromEntries(Object.keys(counts).sort().map((k) => [k, counts[k]]));
  return createHash("sha256").update(JSON.stringify(sorted)).digest("hex").slice(0, 32);
}

export function assertPreviewHash(expected: unknown, counts: Record<string, unknown>) {
  if (typeof expected !== "string" || expected !== previewHash(counts)) {
    throw new AdminOpsError(409, "PREVIEW_CHANGED", "Os números mudaram desde a prévia. Abra a prévia de novo antes de confirmar.");
  }
}

// ─── nova conferência da senha do Super Admin ───────────────────────────────
const MAX_FAILS = 5, LOCK_MS = 15 * 60_000;
const fails = new Map<string, { n: number; until: number }>();
const digest = (s: string) => createHash("sha256").update(s).digest();

/** Confere a senha do Super Admin de novo. 5 erros seguidos travam o IP por 15 minutos. */
export function checkSuperAdminPassword(password: unknown, ip: string, now = Date.now()) {
  const f = fails.get(ip);
  if (f && f.until > now) throw new AdminOpsError(429, "LOCKED", "Muitas tentativas erradas. Tente de novo em 15 minutos.");
  const expected = process.env.SUPER_ADMIN_PASSWORD ?? "";
  const ok = typeof password === "string" && expected !== "" && timingSafeEqual(digest(password), digest(expected));
  if (ok) { fails.delete(ip); return; }
  const n = (f && f.until <= now && f.until !== 0 ? 0 : f?.n ?? 0) + 1;
  fails.set(ip, { n, until: n >= MAX_FAILS ? now + LOCK_MS : 0 });
  throw new AdminOpsError(403, "WRONG_PASSWORD", "Senha do Super Admin incorreta.");
}
/** Só para testes: zera as tentativas. */
export function resetPasswordLocks() { fails.clear(); }

/** Nome digitado igual ao da conta, sem tolerância (maiúsculas, acentos e espaços contam). */
export function assertConfirmName(typed: unknown, tenantName: string) {
  if (typed !== tenantName) throw new AdminOpsError(400, "NAME_MISMATCH", "O nome digitado não é igual ao nome da conta.");
}

// ─── marcas da conta ───────────────────────────────────────────────────────────
export async function setFlags(exec: any, tenantId: string, body: any) {
  const flags: { isProtected?: boolean; isTestAccount?: boolean } = {};
  for (const k of ["isProtected", "isTestAccount"] as const) {
    if (body?.[k] === undefined) continue;
    if (typeof body[k] !== "boolean") throw new AdminOpsError(400, "VALIDATION_ERROR", `${k} deve ser verdadeiro ou falso`);
    flags[k] = body[k];
  }
  if (Object.keys(flags).length === 0) throw new AdminOpsError(400, "VALIDATION_ERROR", "Nada para mudar");
  const t = await repo.setTenantFlags(exec, tenantId, flags);
  if (!t) throw new AdminOpsError(404, "NOT_FOUND", "Conta não encontrada");
  return t;
}
