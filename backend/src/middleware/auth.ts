// BEAUTYTECH v2 â€” Auth Middleware
// âš ï¸ JWKS â€” Supabase ECC P-256
// âš ï¸ NUNCA usar supabase.auth.getUser() â€” falha com novos tokens
// âš ï¸ SEMPRE jose + createRemoteJWKSet
import type { FastifyRequest, FastifyReply } from "fastify";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { eq } from "drizzle-orm";
import { db } from "../db/connection.js";
import { userProfiles, tenants } from "../db/schema/index.js";
const SUPABASE_URL = process.env["SUPABASE_URL"] ?? "";
const JWKS = createRemoteJWKSet(
  new URL(`${SUPABASE_URL}/auth/v1/.well-known/jwks.json`)
);
export interface TenantContext {
  tenantId: string;
  userId:   string;
  role:     string;
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
    const { payload } = await jwtVerify(token, JWKS);
    const userId = payload.sub as string;
    const cached = null; // cache desabilitado temporariamente
    if (cached && cached.exp > Date.now()) { req.tenantContext = cached.data; return; }
    const [profile] = await db
      .select({ tenantId: userProfiles.tenantId, role: userProfiles.role, tenantDeletedAt: tenants.deletedAt })
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
    const ctx: TenantContext = { tenantId: profile.tenantId, userId, role: profile.role };
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
