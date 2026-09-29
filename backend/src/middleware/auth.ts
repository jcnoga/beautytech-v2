// BEAUTYTECH v2 — Auth Middleware
// Tokens do GoTrue próprio: JWT HS256 assinado com GOTRUE_JWT_SECRET.
import type { FastifyRequest, FastifyReply } from "fastify";
import { jwtVerify } from "jose";
import { eq } from "drizzle-orm";
import { db } from "../db/connection.js";
import { userProfiles, tenants } from "../db/schema/index.js";
import { env } from "../config/env.js";
const JWT_KEY = new TextEncoder().encode(env.GOTRUE_JWT_SECRET);
export interface TenantContext {
  tenantId: string;
  userId:   string;
  role:     string;
  /** tenants.business_type (controle de funcionalidades por nicho, ver config/features.ts). */
  businessType?: string | null;
}
declare module "fastify" {
  interface FastifyRequest { tenantContext: TenantContext; }
}
const cache = new Map<string, { data: TenantContext; exp: number }>();
export async function authenticate(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const header = req.headers["authorization"];
  if (!header?.startsWith("Bearer ")) {
    reply.status(401).send({ success: false, error: "Token nÃ£o fornecido", code: "UNAUTHORIZED" });
    return;
  }
  const token = header.slice(7);
  try {
    // Verificar se e token de impersonation (assinado com SUPER_ADMIN_SECRET)
    try {
      const jwt = await import("jsonwebtoken");
      const imp = jwt.default.verify(token, process.env.SUPER_ADMIN_SECRET!) as any;
      if (imp?.impersonation === true && imp?.tenantId && imp?.userId) {
        const [t] = await db.select({ businessType: tenants.businessType }).from(tenants).where(eq(tenants.id, imp.tenantId)).limit(1);
        req.tenantContext = { tenantId: imp.tenantId, userId: imp.userId, role: imp.role ?? "owner", businessType: t?.businessType ?? null };
        return;
      }
    } catch (_) { /* nao e impersonation token, continuar com o GoTrue */ }

    const { payload } = await jwtVerify(token, JWT_KEY, { algorithms: ["HS256"], audience: "authenticated" });
    const userId = payload.sub as string;
    const cached = null; // cache desabilitado temporariamente
    if (cached && cached.exp > Date.now()) { req.tenantContext = cached.data; return; }
    const [profile] = await db
      .select({ tenantId: userProfiles.tenantId, role: userProfiles.role, tenantDeletedAt: tenants.deletedAt, businessType: tenants.businessType })
      .from(userProfiles)
      .leftJoin(tenants, eq(tenants.id, userProfiles.tenantId))
      .where(eq(userProfiles.authUserId, userId)).limit(1);
    if (!profile) {
      reply.status(403).send({ success: false, error: "Perfil nÃ£o encontrado", code: "FORBIDDEN" });
      return;
    }
    if (profile.tenantDeletedAt) {
      reply.status(403).send({ success: false, error: "SalÃ£o desativado", code: "TENANT_DELETED" });
      return;
    }
    const ctx: TenantContext = { tenantId: profile.tenantId, userId, role: profile.role, businessType: profile.businessType };
    // cache.set(userId, { data: ctx, exp: Date.now() + 10_000 });
    req.tenantContext = ctx;
  } catch (err: unknown) {
    console.error("JWT error:", String(err));
    reply.status(401).send({ success: false, error: "Token invÃ¡lido", code: "UNAUTHORIZED" });
  }
}
const ROLE_LEVEL: Record<string, number> = {
  owner:100, manager:80, financial:60, receptionist:50, professional:40, marketing:30, viewer:10,
};
function requireRole(min: string) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    if ((ROLE_LEVEL[req.tenantContext?.role ?? ""] ?? 0) < (ROLE_LEVEL[min] ?? 0)) {
      reply.status(403).send({ success: false, error: "PermissÃ£o insuficiente", code: "FORBIDDEN" });
    }
  };
}
export const requireOwner        = requireRole("owner");
export const requireManager      = requireRole("manager");
export const requireFinancial    = requireRole("financial");
export const requireReceptionist = requireRole("receptionist");
export const requireProfessional = requireRole("professional");
export const requireMarketing    = requireRole("marketing");
export const requireViewer       = requireRole("viewer");
