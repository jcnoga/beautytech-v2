import type { FastifyInstance } from "fastify";
import { eq, and } from "drizzle-orm";
import { db } from "@db/connection";
import { userProfiles, tenants } from "@db/schema/index";
import { authenticate, requireOwner } from "@middleware/auth";

export async function teamModule(fastify: FastifyInstance) {

  // GET /team - Lista usuarios do tenant
  fastify.get("/team", { preHandler: [authenticate] }, async (req: any, reply) => {
    const { tenantId } = req.tenantContext;

    const data = await db
      .select({
        id:        userProfiles.id,
        name:      userProfiles.fullName,
        email:     userProfiles.email,
        role:      userProfiles.role,
        isActive:  userProfiles.isActive,
        createdAt: userProfiles.createdAt,
        authUserId: userProfiles.authUserId,
      })
      .from(userProfiles)
      .where(eq(userProfiles.tenantId, tenantId))
      .orderBy(userProfiles.createdAt);

    // Mapeia status: owner sempre ativo, outros podem ser pending
    const mapped = data.map((u: any) => ({
      ...u,
      status: u.role === "owner" ? "active" : (u.isActive ? "active" : "pending"),
    }));

    return reply.send({ success: true, data: mapped, total: mapped.length });
  });

  // POST /team/invite - Convida novo usuario
  fastify.post("/team/invite", { preHandler: [authenticate, requireOwner] }, async (req: any, reply) => {
    const { tenantId, userId } = req.tenantContext;
    const { email, role, name } = req.body as any;

    if (!email) {
      return reply.status(400).send({ success: false, error: "E-mail obrigatorio" });
    }

    const validRoles = ["admin", "receptionist", "professional"];
    if (!validRoles.includes(role)) {
      return reply.status(400).send({ success: false, error: "Perfil invalido" });
    }

    // Verifica se o email ja existe no tenant
    const existing = await db
      .select({ id: userProfiles.id })
      .from(userProfiles)
      .where(and(eq(userProfiles.tenantId, tenantId), eq(userProfiles.email, email)))
      .limit(1);

    if (existing.length > 0) {
      return reply.status(400).send({ success: false, error: "Este e-mail ja possui acesso ao sistema" });
    }

    // Busca dados do tenant para o email de convite
    const [tenant] = await db
      .select({ name: tenants.name })
      .from(tenants)
      .where(eq(tenants.id, tenantId));

    const supabaseUrl  = process.env.SUPABASE_URL!;
    const serviceKey   = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const frontendUrl  = process.env.FRONTEND_URL ?? "https://zensalon.com.br";
    const resendApiKey = process.env.RESEND_API_KEY!;

    try {
      // Cria usuario no Supabase com senha temporaria
      const tempPassword = Math.random().toString(36).slice(2) + Math.random().toString(36).toUpperCase().slice(2) + "!1";

      const authRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${serviceKey}`,
          "apikey": serviceKey,
        },
        body: JSON.stringify({ email, password: tempPassword, email_confirm: true }),
      });

      const authData = await authRes.json() as any;

      // Se usuario ja existe no Supabase, usa o ID existente
      let authUserId: string;
      if (!authRes.ok) {
        if (authData.message?.includes("already registered")) {
          // Busca o usuario existente
          const listRes = await fetch(`${supabaseUrl}/auth/v1/admin/users?email=${encodeURIComponent(email)}&per_page=1`, {
            headers: { "Authorization": `Bearer ${serviceKey}`, "apikey": serviceKey },
          });
          const listData = await listRes.json() as any;
          authUserId = listData?.users?.[0]?.id;
          if (!authUserId) {
            return reply.status(400).send({ success: false, error: "Erro ao processar convite" });
          }
        } else {
          return reply.status(400).send({ success: false, error: authData.message ?? "Erro ao criar usuario" });
        }
      } else {
        authUserId = authData.id;
      }

      // Cria perfil no tenant
      const roleMap: Record<string, string> = { admin: "manager", receptionist: "receptionist", professional: "professional" };
      const [profile] = await db.insert(userProfiles).values({
        tenantId,
        authUserId,
        fullName: name || email.split("@")[0],
        email,
        role: roleMap[role] ?? "receptionist",
        isActive: false, // pendente ate o primeiro login
      }).returning();

      // Gera link de reset de senha para o convite
      const { randomUUID } = await import("crypto");
      const token = randomUUID();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 dias

      // Salva token de convite
      await fetch(`${supabaseUrl}/rest/v1/password_resets`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${serviceKey}`,
          "apikey": serviceKey,
          "Content-Type": "application/json",
          "Prefer": "return=minimal",
        },
        body: JSON.stringify({ user_id: authUserId, token, expires_at: expiresAt.toISOString() }),
      });

      const inviteLink = `${frontendUrl}/reset-senha?token=${token}&convite=1`;
      const roleLabel = role === "admin" ? "Administrador" : role === "professional" ? "Profissional" : "Recepcionista";

      // Envia email de convite via Resend
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "ZenSalon <noreply@zensalon.com.br>",
          to: [email],
          subject: `Voce foi convidado para o ${tenant?.name ?? "ZenSalon"}`,
          html: `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f8f4f0;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f4f0;padding:40px 0;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08);">
        <tr><td style="background:linear-gradient(135deg,#c9a96e,#8b5e7e);padding:36px 40px;text-align:center;">
          <h1 style="margin:0;color:#fff;font-size:26px;">ZenSalon</h1>
          <p style="margin:6px 0 0;color:rgba(255,255,255,.85);font-size:13px;">Gestao inteligente para saloes</p>
        </td></tr>
        <tr><td style="padding:40px;">
          <h2 style="margin:0 0 12px;color:#3d2b1f;font-size:20px;">Voce foi convidado!</h2>
          <p style="margin:0 0 16px;color:#666;font-size:15px;line-height:1.6;">
            <strong>${name || email}</strong>, voce foi convidado para acessar o sistema <strong>${tenant?.name ?? "ZenSalon"}</strong> como <strong>${roleLabel}</strong>.
          </p>
          <p style="margin:0 0 24px;color:#666;font-size:15px;line-height:1.6;">
            Clique no botao abaixo para criar sua senha e comecar a usar o sistema. O link expira em <strong>7 dias</strong>.
          </p>
          <div style="text-align:center;margin:32px 0;">
            <a href="${inviteLink}" style="background:linear-gradient(135deg,#c9a96e,#8b5e7e);color:#fff;text-decoration:none;padding:14px 36px;border-radius:8px;font-size:16px;font-weight:600;display:inline-block;">
              Criar minha senha
            </a>
          </div>
          <p style="margin:24px 0 0;color:#999;font-size:13px;">
            Ou copie o link: <a href="${inviteLink}" style="color:#8b5e7e;word-break:break-all;">${inviteLink}</a>
          </p>
        </td></tr>
        <tr><td style="background:#f8f4f0;padding:20px 40px;text-align:center;">
          <p style="margin:0;color:#bbb;font-size:12px;">© 2025 ZenSalon</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
        }),
      });

      console.log(`[TEAM] Convite enviado para ${email} no tenant ${tenantId}`);

      return reply.status(201).send({
        success: true,
        data: { ...profile, status: "pending" },
      });

    } catch (err: any) {
      console.error("[TEAM] Erro ao convidar:", err.message);
      return reply.status(500).send({ success: false, error: "Erro ao processar convite" });
    }
  });

  // DELETE /team/:id - Remove acesso de usuario
  fastify.delete("/team/:id", { preHandler: [authenticate, requireOwner] }, async (req: any, reply) => {
    const { tenantId, userId } = req.tenantContext;
    const targetId = req.params.id;

    // Nao pode remover a si mesmo
    if (targetId === userId) {
      return reply.status(400).send({ success: false, error: "Voce nao pode remover seu proprio acesso" });
    }

    // Verifica se o usuario pertence ao tenant
    const [profile] = await db
      .select({ id: userProfiles.id, role: userProfiles.role })
      .from(userProfiles)
      .where(and(eq(userProfiles.id, targetId), eq(userProfiles.tenantId, tenantId)));

    if (!profile) {
      return reply.status(404).send({ success: false, error: "Usuario nao encontrado" });
    }

    // Nao pode remover o owner
    if (profile.role === "owner") {
      return reply.status(400).send({ success: false, error: "Nao e possivel remover o proprietario" });
    }

    await db
      .delete(userProfiles)
      .where(and(eq(userProfiles.id, targetId), eq(userProfiles.tenantId, tenantId)));

    console.log(`[TEAM] Usuario ${targetId} removido do tenant ${tenantId}`);

    return reply.status(204).send();
  });

  // PATCH /team/:id - Atualiza perfil de usuario
  fastify.patch("/team/:id", { preHandler: [authenticate, requireOwner] }, async (req: any, reply) => {
    const { tenantId } = req.tenantContext;
    const { role, isActive } = req.body as any;

    const updates: any = { updatedAt: new Date() };
    if (role !== undefined) {
      const roleMap: Record<string, string> = { admin: "manager", receptionist: "receptionist", professional: "professional" };
      updates.role = roleMap[role] ?? role;
    }
    if (isActive !== undefined) updates.isActive = isActive;

    const [updated] = await db
      .update(userProfiles)
      .set(updates)
      .where(and(eq(userProfiles.id, req.params.id), eq(userProfiles.tenantId, tenantId)))
      .returning();

    if (!updated) {
      return reply.status(404).send({ success: false, error: "Usuario nao encontrado" });
    }

    return reply.send({ success: true, data: updated });
  });
}
