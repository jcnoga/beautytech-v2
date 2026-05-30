// BEAUTYTECH v2 — Auth Middleware
// ⚠️ JWKS — Supabase ECC P-256
// ⚠️ NUNCA usar supabase.auth.getUser() — falha com novos tokens
// ⚠️ SEMPRE jose + createRemoteJWKSet
 
import type { FastifyRequest, FastifyReply } from "fastify";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { eq } from "drizzle-orm";
import { db } from "@db/connection";
import { userProfiles } from "@db/schema/index";
 
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
    reply.status(401).send({ success: false, error: "Token não fornecido", code: "UNAUTHORIZED" });
    return;
  }
  const token = header.slice(7);
  try {
    const { payload } = await jwtVerify(token, JWKS);
    const userId = payload.sub;
    if (!userId) { reply.status(401).send({ success: false, error: "Token inválido", code: "UNAUTHORIZED" }); return; }
    const cached = cache.get(userId);
    if (cached && cached.exp > Date.now()) { req.tenantContext = cached.data; return; }
    const [profile] = await db
      .select({ tenantId: userProfiles.tenantId, role: userProfiles.role })
      .from(userProfiles).where(eq(userProfiles.authUserId, userId)).limit(1);
    if (!profile) { reply.status(403).send({ success: false, error: "Perfil não encontrado", code: "FORBIDDEN" }); return; }
    const ctx: TenantContext = { tenantId: profile.tenantId, userId, role: profile.role };
    cache.set(userId, { data: ctx, exp: Date.now() + 60_000 });
    req.tenantContext = ctx;
  } catch {
    reply.status(401).send({ success: false, error: "Token inválido", code: "UNAUTHORIZED" });
  }
}
 
const ROLE_LEVEL: Record<string, number> = {
  owner:100, manager:80, financial:60, receptionist:50, professional:40, marketing:30, viewer:10,
};
 
function requireRole(min: string) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    if ((ROLE_LEVEL[req.tenantContext?.role ?? ""] ?? 0) < (ROLE_LEVEL[min] ?? 0)) {
      reply.status(403).send({ success: false, error: "Permissão insuficiente", code: "FORBIDDEN" });
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
