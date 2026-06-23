import type { FastifyInstance } from "fastify";
import { db } from "../db/connection.js";
import { sql } from "drizzle-orm";
import { requireSuperAdmin } from "../middleware/auth.js";

export async function prospectModule(fastify: FastifyInstance) {
async function requireSuperAdmin(req: any, reply: any) {
    const auth = req.headers.authorization?.replace("Bearer ", "");
    if (!auth) return reply.status(401).send({ success: false, error: "Nao autorizado" });
    try {
      const payload = jwt.verify(auth, process.env.SUPER_ADMIN_SECRET ?? "super_secret") as any;
      if (payload.role !== "super_admin") return reply.status(403).send({ success: false, error: "Acesso negado" });
    } catch {
      return reply.status(401).send({ success: false, error: "Token invalido" });
    }
  }
  fastify.get("/super-admin/prospects", { preHandler: [requireSuperAdmin] }, async (req: any, reply) => {
    const { niche, status, city, page = 1, limit = 50 } = req.query as any;
    const offset = (Number(page) - 1) * Number(limit);
    let where = "WHERE 1=1";
    if (niche) where += ` AND niche = '${niche}'`;
    if (status) where += ` AND status = '${status}'`;
    if (city) where += ` AND LOWER(city) LIKE '%${city.toLowerCase()}%'`;
    const [data, total] = await Promise.all([
      db.execute(sql.raw(`SELECT * FROM prospect_leads ${where} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`)),
      db.execute(sql.raw(`SELECT COUNT(*) as total FROM prospect_leads ${where}`)),
    ]);
    return reply.send({ success: true, data: (data as any).rows, total: Number((total as any).rows[0]?.total ?? 0) });
  });

  fastify.post("/super-admin/prospects/import", { preHandler: [requireSuperAdmin] }, async (req: any, reply) => {
    const { leads } = req.body as any;
    if (!leads?.length) return reply.status(400).send({ success: false, error: "Nenhum lead enviado" });
    let inserted = 0, skipped = 0;
    for (const lead of leads) {
      const phone = (lead.phone ?? lead.telefone ?? "").toString().replace(/\D/g, "");
      if (!phone || phone.length < 10) { skipped++; continue; }
      const exists = await db.execute(sql.raw(`SELECT id FROM prospect_leads WHERE phone = '${phone}' LIMIT 1`));
      if ((exists as any).rows?.length > 0) { skipped++; continue; }
      const bn = (lead.business_name ?? lead.nome ?? "").toString().replace(/'/g, "");
      const ct = (lead.city ?? lead.cidade ?? "").toString().replace(/'/g, "");
      const st = (lead.state ?? lead.estado ?? "").toString().replace(/'/g, "");
      const ni = (lead.niche ?? lead.nicho ?? "").toString().replace(/'/g, "");
      const em = (lead.email ?? "").toString().replace(/'/g, "");
      const wb = (lead.website ?? "").toString().replace(/'/g, "");
      const ad = (lead.address ?? lead.endereco ?? "").toString().replace(/'/g, "");
      const tp = (lead.type ?? lead.tipo ?? "").toString().replace(/'/g, "");
      const rt = parseFloat(lead.rating ?? lead.avaliacao ?? "0") || 0;
      const rc = parseInt(lead.review_count ?? lead.avaliacoes ?? "0") || 0;
      const gm = (lead.google_maps_link ?? lead.maps ?? "").toString().replace(/'/g, "");
      await db.execute(sql.raw(`INSERT INTO prospect_leads (state,city,niche,business_name,phone,email,website,address,type,rating,review_count,google_maps_link) VALUES ('${st}','${ct}','${ni}','${bn}','${phone}','${em}','${wb}','${ad}','${tp}',${rt},${rc},'${gm}')`));
      inserted++;
    }
    return reply.send({ success: true, data: { inserted, skipped } });
  });

  fastify.delete("/super-admin/prospects/:id", { preHandler: [requireSuperAdmin] }, async (req: any, reply) => {
    await db.execute(sql.raw(`DELETE FROM prospect_leads WHERE id = '${req.params.id}'`));
    return reply.send({ success: true });
  });

  fastify.patch("/super-admin/prospects/:id/status", { preHandler: [requireSuperAdmin] }, async (req: any, reply) => {
    const { status } = req.body as any;
    await db.execute(sql.raw(`UPDATE prospect_leads SET status = '${status}', updated_at = NOW() WHERE id = '${req.params.id}'`));
    return reply.send({ success: true });
  });

  fastify.get("/super-admin/prospect-templates", { preHandler: [requireSuperAdmin] }, async (req: any, reply) => {
    const data = await db.execute(sql.raw("SELECT * FROM prospect_templates ORDER BY niche, created_at"));
    return reply.send({ success: true, data: (data as any).rows });
  });

  fastify.post("/super-admin/prospect-templates", { preHandler: [requireSuperAdmin] }, async (req: any, reply) => {
    const { niche, name, message } = req.body as any;
    const result = await db.execute(sql.raw(`INSERT INTO prospect_templates (niche, name, message) VALUES ('${niche}','${name.replace(/'/g,"")}','${message.replace(/'/g,"")}') RETURNING *`));
    return reply.send({ success: true, data: (result as any).rows[0] });
  });

  fastify.delete("/super-admin/prospect-templates/:id", { preHandler: [requireSuperAdmin] }, async (req: any, reply) => {
    await db.execute(sql.raw(`DELETE FROM prospect_templates WHERE id = '${req.params.id}'`));
    return reply.send({ success: true });
  });

  fastify.post("/super-admin/prospects/send", { preHandler: [requireSuperAdmin] }, async (req: any, reply) => {
    const { niche, daily_limit = 50, min_interval = 30, max_interval = 60 } = req.body as any;
    const nicheFilter = niche ? `AND niche = '${niche}'` : "";
    const leadsResult = await db.execute(sql.raw(`SELECT * FROM prospect_leads WHERE status = 'pending' ${nicheFilter} ORDER BY created_at ASC LIMIT ${daily_limit}`));
    const leads = (leadsResult as any).rows ?? [];
    if (!leads.length) return reply.send({ success: true, data: { message: "Nenhum lead pendente", sent: 0 } });
    const tmplResult = await db.execute(sql.raw(`SELECT * FROM prospect_templates WHERE is_active = true ${nicheFilter} ORDER BY RANDOM()`));
    const templates = (tmplResult as any).rows ?? [];
    if (!templates.length) return reply.status(400).send({ success: false, error: "Nenhum template ativo" });
    const { sendTextMessage } = await import("./whatsapp/whatsapp.service.js");
    const tenantResult = await db.execute(sql.raw(`SELECT id FROM tenants WHERE whatsapp_status = 'connected' LIMIT 1`));
    const tenantId = (tenantResult as any).rows[0]?.id;
    if (!tenantId) return reply.status(400).send({ success: false, error: "Nenhum WhatsApp conectado" });
    reply.send({ success: true, data: { message: `Disparando para ${leads.length} leads...`, total: leads.length } });
    let sent = 0;
    for (const lead of leads) {
      const template = templates[Math.floor(Math.random() * templates.length)];
      const msg = template.message.replace("{nome}", lead.business_name ?? "").replace("{cidade}", lead.city ?? "").replace("{nicho}", lead.niche ?? "");
      const phone = lead.phone.toString().replace(/\D/g, "");
      const fullPhone = phone.startsWith("55") ? phone : "55" + phone;
      try {
        await sendTextMessage(fullPhone, msg, tenantId);
        await db.execute(sql.raw(`UPDATE prospect_leads SET status = 'sent', sent_count = sent_count + 1, last_sent_at = NOW(), updated_at = NOW() WHERE id = '${lead.id}'`));
        await db.execute(sql.raw(`UPDATE prospect_templates SET sent_count = sent_count + 1 WHERE id = '${template.id}'`));
        sent++;
        console.log("[PROSPECT] Enviado para:", fullPhone);
      } catch(e: any) { console.error("[PROSPECT] Erro:", fullPhone, e.message); }
      const interval = (Math.floor(Math.random() * (max_interval - min_interval + 1)) + min_interval) * 1000;
      await new Promise(r => setTimeout(r, interval));
    }
    console.log("[PROSPECT] Finalizado. Enviados:", sent);
  });

  fastify.get("/super-admin/prospects/stats", { preHandler: [requireSuperAdmin] }, async (req: any, reply) => {
    const stats = await db.execute(sql.raw(`SELECT COUNT(*) as total, COUNT(CASE WHEN status='pending' THEN 1 END) as pending, COUNT(CASE WHEN status='sent' THEN 1 END) as sent, COUNT(CASE WHEN status='replied' THEN 1 END) as replied, COUNT(CASE WHEN status='converted' THEN 1 END) as converted, COUNT(CASE WHEN status='blacklist' THEN 1 END) as blacklist FROM prospect_leads`));
    const byNiche = await db.execute(sql.raw(`SELECT niche, COUNT(*) as total, COUNT(CASE WHEN status='sent' THEN 1 END) as sent FROM prospect_leads GROUP BY niche ORDER BY total DESC`));
    return reply.send({ success: true, data: { totals: (stats as any).rows[0], by_niche: (byNiche as any).rows } });
  });
}
