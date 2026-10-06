// Super Admin, "Excluir conta" (service). Apaga TODOS os registros de uma conta:
// 1. Prévia (só lê): contagem por tabela, logins, arquivos, WhatsApp e bloqueios, com impressão digital (previewHash).
// 2. Confirmação: nome exato da conta + senha do Super Admin de novo (trava após 5 erros) + previewHash da prévia.
// 3. Bloqueios: conta protegida; assinatura ativa no Asaas (consultada na hora; Asaas fora do ar = recusa).
// 4. Backup só daquela conta em TENANT_BACKUPS_DIR/<data>_<slug>_<id8>/ (manifest, dados, logins, arquivos e
//    sha256sums). Se o backup falhar, nada é apagado.
// 5. Uma transação: trava a conta, confere de novo os números, apaga tabela por tabela (ordem pelas ligações do
//    banco) e marca a auditoria. Qualquer erro desfaz tudo.
// 6. Depois do COMMIT, a limpeza de fora do banco: logins no GoTrue, instância do WhatsApp e pasta de arquivos.
//    Cada passo fica registrado; o que falhar pode ser repetido (retryCleanup). Login que sobra não entra em
//    nada (sem perfil, a autenticação recusa).
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { gzipSync } from "node:zlib";
import { db } from "@db/connection";
import { env } from "@config/env";
import { gotrueAdmin } from "@config/gotrue";
import { WhatsappDisabledError, deleteInstanceWith, whatsappConfigOf } from "../whatsapp/whatsapp.service";
import * as ops from "./admin-ops.repository";
import * as repo from "./tenant-deletion.repository";
import {
  AdminOpsError, assertConfirmName, assertPreviewHash, checkSuperAdminPassword, deletionOrder, incomingFromOutside, previewHash,
} from "./admin-ops.service";

type Block = { code: string; message: string };

/** Assinatura ativa no Asaas? Consulta na hora. Asaas sem chave ou fora do ar = erro (a exclusão recusa). */
async function asaasSubscriptionActive(subscriptionId: string): Promise<boolean> {
  const raw = process.env.ASAAS_API_KEY ?? "";
  if (!raw) throw new Error("Asaas não configurado neste ambiente");
  const key = raw.startsWith("$") ? raw : `$${raw}`;
  const base = process.env.ASAAS_BASE_URL ?? "https://api.asaas.com/v3";
  const res = await fetch(`${base}/subscriptions/${encodeURIComponent(subscriptionId)}`, { headers: { access_token: key } });
  if (res.status === 404) return false;
  if (!res.ok) throw new Error(`Asaas respondeu ${res.status}`);
  const s = await res.json() as { status?: string; deleted?: boolean };
  return !s.deleted && s.status === "ACTIVE";
}

async function dirStats(dir: string): Promise<{ files: number; bytes: number }> {
  let files = 0, bytes = 0;
  const walk = async (d: string) => {
    let entries: import("node:fs").Dirent[];
    try { entries = await fs.readdir(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) await walk(p);
      else { files++; bytes += (await fs.stat(p)).size; }
    }
  };
  await walk(dir);
  return { files, bytes };
}

const uploadsDirOf = (tenantId: string) => path.join(env.UPLOADS_DIR, tenantId);

/** Tudo que a prévia mostra e a exclusão usa (lido na hora). */
async function collect(exec: any, tenantId: string) {
  const tenant = await ops.findTenant(exec, tenantId);
  if (!tenant) throw new AdminOpsError(404, "NOT_FOUND", "Conta não encontrada");
  const tables = await ops.tenantTables(exec);
  const edges = await ops.fkEdges(exec);
  const order = deletionOrder([...tables, "tenants"], edges);
  const outside = incomingFromOutside([...tables, "tenants"], edges);
  const userIds = await repo.tenantAuthUserIds(exec, tenantId);
  const counts: Record<string, number> = { ...(await ops.countByTenant(exec, tenantId, tables)), tenants: 1,
    password_resets: await repo.countPasswordResets(exec, userIds) };
  return { tenant, tables, order, outside, userIds, counts };
}

export async function deletionPreview(tenantId: string) {
  const c = await collect(db, tenantId);
  const blocks: Block[] = [];
  if (c.tenant.isProtected) blocks.push({ code: "PROTECTED", message: "Conta marcada como protegida: desmarque antes de excluir." });
  if (c.tenant.asaasSubscriptionId) {
    try {
      if (await asaasSubscriptionActive(c.tenant.asaasSubscriptionId)) {
        blocks.push({ code: "SUBSCRIPTION_ACTIVE", message: "Assinatura ativa no Asaas: cancele a assinatura antes de excluir." });
      }
    } catch (e: any) {
      blocks.push({ code: "ASAAS_UNREACHABLE", message: `Não foi possível confirmar a assinatura no Asaas (${e.message}).` });
    }
  }
  if (c.outside.length > 0) {
    blocks.push({ code: "OUTSIDE_REFERENCES", message: `Tabelas de fora apontam para dados da conta: ${c.outside.map((e) => `${e.child}.${e.childColumn}`).join(", ")}` });
  }
  const wa = await whatsappConfigOf(tenantId);
  const nonZero = Object.fromEntries(Object.entries(c.counts).filter(([, n]) => n > 0));
  return {
    tenant: { id: c.tenant.id, name: c.tenant.name, slug: c.tenant.slug, businessType: c.tenant.businessType, isProtected: c.tenant.isProtected },
    counts: nonZero,
    totalRows: Object.values(c.counts).reduce((s, n) => s + n, 0),
    authUsers: c.userIds.length,
    uploads: await dirStats(uploadsDirOf(tenantId)),
    whatsapp: { mode: wa.mode, instance: wa.instance ?? null },
    blocks,
    previewHash: previewHash(c.counts),
  };
}

// ─── backup ──────────────────────────────────────────────────────────────────
const stampSP = () => {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit",
    day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(new Date()).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}_${p.hour}${p.minute}${p.second}`;
};
const sha256 = (b: Buffer) => createHash("sha256").update(b).digest("hex");

/** Logins da conta como o GoTrue devolve (sem a senha: a API admin não expõe; na restauração, "esqueci minha senha"). */
async function exportAuthUsers(userIds: string[]) {
  const users: unknown[] = [], missing: string[] = [];
  for (const id of userIds) {
    const res = await gotrueAdmin(`/admin/users/${id}`);
    if (res.status === 404) { missing.push(id); continue; }
    if (!res.ok) throw new Error(`GoTrue respondeu ${res.status} ao ler o login ${id}`);
    users.push(await res.json());
  }
  return { users, missing };
}

async function writeBackup(c: Awaited<ReturnType<typeof collect>>, actor: string, wa: { mode: string | null; instance: string | null }) {
  const dir = path.resolve(env.TENANT_BACKUPS_DIR, `${stampSP()}_${String(c.tenant.slug).replace(/[^a-z0-9-]/gi, "")}_${c.tenant.id.slice(0, 8)}`);
  await fs.mkdir(dir, { recursive: true });
  const dados = gzipSync(Buffer.from(JSON.stringify(await repo.exportRows(db, c.tenant.id, c.tables, c.userIds))));
  const auth = await exportAuthUsers(c.userIds);
  const logins = gzipSync(Buffer.from(JSON.stringify(auth)));
  const uploadsSrc = uploadsDirOf(c.tenant.id);
  const uploads = await dirStats(uploadsSrc);
  if (uploads.files > 0) await fs.cp(uploadsSrc, path.join(dir, "uploads"), { recursive: true });
  const manifest = Buffer.from(JSON.stringify({
    format: "zensalon-backup-conta/1", createdAt: new Date().toISOString(), actor,
    tenant: { id: c.tenant.id, name: c.tenant.name, slug: c.tenant.slug, businessType: c.tenant.businessType },
    lastMigration: await ops.lastMigration(db), deletionOrder: c.order, counts: c.counts,
    authUsers: { exported: auth.users.length, missing: auth.missing }, uploads, whatsapp: wa,
    restore: "backend/scripts/restaurar-conta.ts (ZS_CONFIRMAR_RESTAURACAO=sim)",
  }, null, 2));
  const files: [string, Buffer][] = [["manifest.json", manifest], ["dados.json.gz", dados], ["gotrue-usuarios.json.gz", logins]];
  for (const [name, buf] of files) await fs.writeFile(path.join(dir, name), buf, { mode: 0o600 });
  await fs.writeFile(path.join(dir, "sha256sums"), files.map(([n, b]) => `${sha256(b)}  ${n}`).join("\n") + "\n", { mode: 0o600 });
  return { dir, uploads, authUsers: auth.users.length };
}

// ─── limpeza de fora do banco (depois do COMMIT) ───────────────────────────
type Pending = { userIds: string[]; whatsapp: { mode: string | null; apiUrl: string | null; instance: string | null } | null; uploadsDir: string | null };
type StepResult = { ok: boolean; skipped?: string; error?: string; failedUserIds?: string[] };

async function cleanupOutside(tenantId: string, p: Pending, waCfg?: any) {
  const result: Record<string, StepResult> = {};
  const failedUserIds: string[] = [];
  for (const id of p.userIds) {
    try {
      const res = await gotrueAdmin(`/admin/users/${id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 404) failedUserIds.push(id);
    } catch { failedUserIds.push(id); }
  }
  result.gotrue = failedUserIds.length ? { ok: false, error: "logins não apagados", failedUserIds } : { ok: true };

  if (!p.whatsapp || !p.whatsapp.mode || p.whatsapp.mode === "manual") result.whatsapp = { ok: true, skipped: "sem WhatsApp" };
  else {
    // Só o modo "cloud" pode ser repetido sem as credenciais da conta (que não ficam guardadas na auditoria).
    const cfg = waCfg ?? (p.whatsapp.mode === "cloud" ? { mode: "cloud", apiUrl: null, apiKey: null, instance: p.whatsapp.instance } : null);
    if (!cfg) result.whatsapp = { ok: false, error: "credenciais da conta não guardadas: apague a instância à mão na Evolution" };
    else {
      try { await deleteInstanceWith(cfg, tenantId); result.whatsapp = { ok: true }; }
      catch (e: any) {
        result.whatsapp = e instanceof WhatsappDisabledError ? { ok: true, skipped: "WhatsApp desligado neste ambiente" } : { ok: false, error: e.message };
      }
    }
  }

  if (!p.uploadsDir) result.uploads = { ok: true, skipped: "sem arquivos" };
  else {
    try { await fs.rm(p.uploadsDir, { recursive: true, force: true }); result.uploads = { ok: true }; }
    catch (e: any) { result.uploads = { ok: false, error: e.message }; }
  }
  const remaining: Pending = {
    userIds: failedUserIds,
    whatsapp: result.whatsapp.ok ? null : p.whatsapp,
    uploadsDir: result.uploads.ok ? null : p.uploadsDir,
  };
  const ok = Object.values(result).every((r) => r.ok);
  return { result, remaining, ok };
}

// ─── exclusão ────────────────────────────────────────────────────────────────
export async function deleteTenant(tenantId: string, body: any, actor: string, ip: string) {
  checkSuperAdminPassword(body?.password, ip);
  const tenant = await ops.findTenant(db, tenantId);
  if (!tenant) throw new AdminOpsError(404, "NOT_FOUND", "Conta não encontrada");
  assertConfirmName(body?.confirmName, tenant.name);
  const preview = await deletionPreview(tenantId);
  if (preview.blocks.length > 0) throw new AdminOpsError(409, preview.blocks[0].code, preview.blocks.map((b) => b.message).join(" "), { blocks: preview.blocks });
  const c = await collect(db, tenantId);
  assertPreviewHash(body?.previewHash, c.counts); // números iguais aos da prévia que o Super Admin viu
  const waCfg = await whatsappConfigOf(tenantId);
  const wa = { mode: waCfg.mode ?? null, instance: waCfg.instance ?? null };
  const opId = await ops.insertOperation(db, { operation: "tenant_delete", tenantId, tenantName: tenant.name, actor, ip, counts: c.counts });

  let backup: Awaited<ReturnType<typeof writeBackup>>;
  try { backup = await writeBackup(c, actor, wa); }
  catch (e: any) {
    await ops.finishOperation(db, opId, { status: "failed", details: { step: "backup", error: e.message } });
    throw new AdminOpsError(500, "BACKUP_FAILED", `Backup falhou, nada foi apagado (${e.message}).`);
  }

  const pending: Pending = {
    userIds: c.userIds,
    whatsapp: wa.mode && wa.mode !== "manual" ? { mode: wa.mode, apiUrl: waCfg.mode === "cloud" ? null : waCfg.apiUrl ?? null, instance: wa.instance } : null,
    uploadsDir: backup.uploads.files > 0 ? uploadsDirOf(tenantId) : null,
  };
  let deleted: Record<string, number>;
  try {
    deleted = await db.transaction(async (tx) => {
      if (!(await repo.lockTenant(tx, tenantId))) throw new AdminOpsError(404, "NOT_FOUND", "Conta não encontrada");
      // Sob a trava: confere de novo que os números são os da prévia (nada entrou entre a prévia e agora).
      assertPreviewHash(body.previewHash, { ...(await ops.countByTenant(tx, tenantId, c.tables)), tenants: 1,
        password_resets: await repo.countPasswordResets(tx, c.userIds) });
      const d = await repo.deleteInOrder(tx, tenantId, c.order, c.userIds);
      // Auditoria marcada na MESMA transação: se a exclusão foi gravada, o registro dela também foi.
      await ops.finishOperation(tx, opId, { status: "partial", counts: d, finished: false,
        details: { backupDir: backup.dir, step: "cleanup", pending } });
      return d;
    });
  } catch (e: any) {
    await ops.finishOperation(db, opId, { status: "failed", details: { step: "transaction", error: e.message, backupDir: backup.dir } });
    if (e instanceof AdminOpsError) throw e;
    throw new AdminOpsError(500, "DELETE_FAILED", `A exclusão falhou e foi desfeita; nada foi apagado (${e.message}).`);
  }

  const clean = await cleanupOutside(tenantId, pending, waCfg);
  await ops.finishOperation(db, opId, { status: clean.ok ? "done" : "partial",
    details: { cleanup: clean.result, pending: clean.remaining, step: clean.ok ? "done" : "cleanup" } });
  return { operationId: opId, backupDir: backup.dir, deleted, cleanup: clean.result, complete: clean.ok };
}

/** Repete só os passos de fora do banco que falharam numa exclusão. Pode ser chamado várias vezes. */
export async function retryCleanup(operationId: string) {
  const op = await ops.getOperation(db, operationId);
  if (!op || op.operation !== "tenant_delete") throw new AdminOpsError(404, "NOT_FOUND", "Operação não encontrada");
  if (op.status === "done") return { complete: true, cleanup: op.details?.cleanup ?? {} };
  if (op.status !== "partial" || !op.details?.pending) throw new AdminOpsError(409, "NOTHING_TO_RETRY", "Esta exclusão não tem limpeza pendente.");
  const clean = await cleanupOutside(op.tenantId, op.details.pending);
  await ops.finishOperation(db, operationId, { status: clean.ok ? "done" : "partial",
    details: { cleanup: clean.result, pending: clean.remaining, step: clean.ok ? "done" : "cleanup" } });
  return { complete: clean.ok, cleanup: clean.result };
}
