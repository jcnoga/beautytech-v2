// Super Admin: token próprio (POST /super-admin/login, assinado com SUPER_ADMIN_SECRET), sem login de empresa.
// Usado pelos módulos novos do Super Admin (modules/super-admin). Mesma regra do requireSuperAdmin de all-modules.ts.
import type { FastifyReply, FastifyRequest } from "fastify";
import jwt from "jsonwebtoken";

export async function requireSuperAdmin(req: FastifyRequest, reply: FastifyReply) {
  const auth = req.headers.authorization?.replace("Bearer ", "");
  if (!auth) return reply.status(401).send({ success: false, error: "Não autorizado", code: "UNAUTHORIZED" });
  try {
    const payload = jwt.verify(auth, process.env.SUPER_ADMIN_SECRET!) as any;
    if (payload.role !== "super_admin") throw new Error("Acesso negado");
    (req as any).superAdmin = payload;
  } catch {
    return reply.status(401).send({ success: false, error: "Token Super Admin inválido", code: "UNAUTHORIZED" });
  }
}
