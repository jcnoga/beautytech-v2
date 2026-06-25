import type { FastifyInstance } from "fastify";
import { db } from "../db/connection.js";
import { sql } from "drizzle-orm";
import jwt from "jsonwebtoken";

export async function prospectModule(fastify: FastifyInstance) {

  // ── Auth ──────────────────────────────────────────────────────────────────
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

  // ── Helpers ───────────────────────────────────────────────────────────────
  // Remove acentos para busca accent-insensitive
  function stripAccents(str: string): string {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  }

  // Escapa aspas simples para SQL
  function esc(v: any): string {
    return (v ?? "").toString().replace(/'/g, "''");
  }

  // ── GET /super-admin/prospects ────────────────────────────────────────────
  // Paginação: page + limit | Ordenação: mais recente primeiro
  // Filtros: niche, status, state, city (case+accent insensitive), search
  fastify.get("/super-admin/prospects", { preHandler: [requireSuperAdmin] }, async (req: any, reply) => {
    const {
      niche, status, city, state,
      search,
      page  = 1,
      limit = 50,
    } = req.query as any;

    const pg  = Math.max(1, Number(page));
    const lim = Math.min(500, Math.max(1, Number(limit)));
    const offset = (pg - 1) * lim;

    let where = "WHERE 1=1";

    if (niche)  where += ` AND LOWER(UNACCENT(niche))  = LOWER(UNACCENT('${esc(niche)}'))`;
    if (status) where += ` AND status = '${esc(status)}'`;
    if (state)  where += ` AND LOWER(UNACCENT(state))  LIKE '%' || LOWER(UNACCENT('${esc(state)}'))  || '%'`;
    if (city)   where += ` AND LOWER(UNACCENT(city))   LIKE '%' || LOWER(UNACCENT('${esc(city)}'))   || '%'`;
    if (search) {
      const q = esc(search);
      where += ` AND (
        LOWER(UNACCENT(business_name)) LIKE '%' || LOWER(UNACCENT('${q}')) || '%'
        OR LOWER(UNACCENT(city))         LIKE '%' || LOWER(UNACCENT('${q}')) || '%'
        OR phone LIKE '%${q}%'
      )`;
    }

    const [data, total] = await Promise.all([
      db.execute(sql.raw(`SELECT * FROM prospect_leads ${where} ORDER BY created_at DESC LIMIT ${lim} OFFSET ${offset}`)),
      db.execute(sql.raw(`SELECT COUNT(*) as total FROM prospect_leads ${where}`)),
    ]);

    const rows      = Array.isArray(data)  ? data  : (data  as any).rows ?? [];
    const totalRows = Array.isArray(total) ? total : (total as any).rows ?? [];
    const totalCount = Number(totalRows[0]?.total ?? 0);

    return reply.send({
      success: true,
      data: rows,
      total: totalCount,
      page: pg,
      limit: lim,
      pages: Math.ceil(totalCount / lim),
    });
  });

  // ── POST /super-admin/prospects/import ───────────────────────────────────
  // Deduplicação por phone (normalizado) E por business_name+city
  fastify.post("/super-admin/prospects/import", { preHandler: [requireSuperAdmin] }, async (req: any, reply) => {
    const { leads } = req.body as any;
    if (!leads?.length) return reply.status(400).send({ success: false, error: "Nenhum lead enviado" });

    let inserted = 0, skipped = 0;

    for (const lead of leads) {
      // Normaliza telefone — apenas dígitos
      const phone = (lead.phone ?? lead.telefone ?? "").toString().replace(/\D/g, "");
      if (!phone || phone.length < 10) { skipped++; continue; }

      const bn = esc(lead.business_name ?? lead.nome ?? "");
      const ct = esc(lead.city ?? lead.cidade ?? "");
      const st = esc(lead.state ?? lead.estado ?? "");
      const ni = esc(lead.niche ?? lead.nicho ?? "");
      const em = esc(lead.email ?? "");
      const wb = esc(lead.website ?? "");
      const ad = esc(lead.address ?? lead.endereco ?? "");
      const tp = esc(lead.type ?? lead.tipo ?? "");
      const rt = parseFloat(lead.rating ?? lead.avaliacao ?? "0") || 0;
      const rc = parseInt(lead.review_count ?? lead.avaliacoes ?? "0") || 0;
      const gm = esc(lead.google_maps_link ?? lead.maps ?? "");

      // Deduplicação 1: telefone
      const byPhone = await db.execute(sql.raw(
        `SELECT id FROM prospect_leads WHERE phone = '${phone}' LIMIT 1`
      ));
      const phoneRows = Array.isArray(byPhone) ? byPhone : (byPhone as any).rows ?? [];
      if (phoneRows.length > 0) { skipped++; continue; }

      // Deduplicação 2: nome + cidade (accent+case insensitive)
      if (bn && ct) {
        const byName = await db.execute(sql.raw(
          `SELECT id FROM prospect_leads
           WHERE LOWER(UNACCENT(business_name)) = LOWER(UNACCENT('${bn}'))
             AND LOWER(UNACCENT(city))          = LOWER(UNACCENT('${ct}'))
           LIMIT 1`
        ));
        const nameRows = Array.isArray(byName) ? byName : (byName as any).rows ?? [];
        if (nameRows.length > 0) { skipped++; continue; }
      }

      await db.execute(sql.raw(
        `INSERT INTO prospect_leads
          (state,city,niche,business_name,phone,email,website,address,type,rating,review_count,google_maps_link)
         VALUES
          ('${st}','${ct}','${ni}','${bn}','${phone}','${em}','${wb}','${ad}','${tp}',${rt},${rc},'${gm}')`
      ));
      inserted++;
    }

    return reply.send({ success: true, data: { inserted, skipped } });
  });

  // ── DELETE /super-admin/prospects/:id ────────────────────────────────────
  fastify.delete("/super-admin/prospects/:id", { preHandler: [requireSuperAdmin] }, async (req: any, reply) => {
    await db.execute(sql.raw(`DELETE FROM prospect_leads WHERE id = '${esc(req.params.id)}'`));
    return reply.send({ success: true });
  });

  // ── PATCH /super-admin/prospects/:id/status ──────────────────────────────
  fastify.patch("/super-admin/prospects/:id/status", { preHandler: [requireSuperAdmin] }, async (req: any, reply) => {
    const { status } = req.body as any;
    const allowed = ["pending","sent","replied","converted","blacklist","error","no_whatsapp"];
    if (!allowed.includes(status)) return reply.status(400).send({ success: false, error: "Status invalido" });
    await db.execute(sql.raw(
      `UPDATE prospect_leads SET status = '${status}', updated_at = NOW() WHERE id = '${esc(req.params.id)}'`
    ));
    return reply.send({ success: true });
  });

  // ── GET /super-admin/prospect-templates ──────────────────────────────────
  fastify.get("/super-admin/prospect-templates", { preHandler: [requireSuperAdmin] }, async (_req: any, reply) => {
    const data = await db.execute(sql.raw("SELECT * FROM prospect_templates ORDER BY niche, created_at"));
    const rows = Array.isArray(data) ? data : (data as any).rows ?? [];
    return reply.send({ success: true, data: rows });
  });

  // ── POST /super-admin/prospect-templates ─────────────────────────────────
  fastify.post("/super-admin/prospect-templates", { preHandler: [requireSuperAdmin] }, async (req: any, reply) => {
    const { niche, name, message } = req.body as any;
    if (!niche || !name || !message) return reply.status(400).send({ success: false, error: "Campos obrigatorios: niche, name, message" });
    const result = await db.execute(sql.raw(
      `INSERT INTO prospect_templates (niche, name, message) VALUES ('${esc(niche)}','${esc(name)}','${esc(message)}') RETURNING *`
    ));
    const rows = Array.isArray(result) ? result : (result as any).rows ?? [];
    return reply.send({ success: true, data: rows[0] });
  });

  // ── DELETE /super-admin/prospect-templates/:id ───────────────────────────
  fastify.delete("/super-admin/prospect-templates/:id", { preHandler: [requireSuperAdmin] }, async (req: any, reply) => {
    await db.execute(sql.raw(`DELETE FROM prospect_templates WHERE id = '${esc(req.params.id)}'`));
    return reply.send({ success: true });
  });

  // ── POST /super-admin/prospects/send ─────────────────────────────────────
  fastify.post("/super-admin/prospects/send", { preHandler: [requireSuperAdmin] }, async (req: any, reply) => {
    const { niche, daily_limit = 50, min_interval = 30, max_interval = 60 } = req.body as any;
    const nicheFilter = niche ? `AND LOWER(UNACCENT(niche)) = LOWER(UNACCENT('${esc(niche)}'))` : "";

    const leadsResult = await db.execute(sql.raw(
      `SELECT * FROM prospect_leads WHERE status = 'pending' ${nicheFilter} ORDER BY created_at ASC LIMIT ${Number(daily_limit)}`
    ));
    const leads = Array.isArray(leadsResult) ? leadsResult : (leadsResult as any).rows ?? [];
    if (!leads.length) return reply.send({ success: true, data: { message: "Nenhum lead pendente", sent: 0 } });

    const tmplResult = await db.execute(sql.raw(
      `SELECT * FROM prospect_templates WHERE is_active = true ${nicheFilter} ORDER BY RANDOM()`
    ));
    const templates = Array.isArray(tmplResult) ? tmplResult : (tmplResult as any).rows ?? [];
    if (!templates.length) return reply.status(400).send({ success: false, error: "Nenhum template ativo para este nicho" });

    const { sendTextMessage } = await import("./whatsapp/whatsapp.service.js");
    const tenantResult = await db.execute(sql.raw(`SELECT id FROM tenants WHERE whatsapp_status = 'connected' LIMIT 1`));
    const tenantRows = Array.isArray(tenantResult) ? tenantResult : (tenantResult as any).rows ?? [];
    const tenantId = tenantRows[0]?.id;
    if (!tenantId) return reply.status(400).send({ success: false, error: "Nenhum WhatsApp conectado" });

    // Responde imediatamente e processa em background
    reply.send({ success: true, data: { message: `Disparando para ${leads.length} leads...`, total: leads.length } });

    let sent = 0;
    for (const lead of leads) {
      const template = templates[Math.floor(Math.random() * templates.length)];
      const msg = template.message
        .replace("{nome}", lead.business_name ?? "")
        .replace("{cidade}", lead.city ?? "")
        .replace("{nicho}", lead.niche ?? "");

      const phone = lead.phone.toString().replace(/\D/g, "");
      const fullPhone = phone.startsWith("55") ? phone : "55" + phone;

      try {
        await sendTextMessage(fullPhone, msg, tenantId);
        await db.execute(sql.raw(
          `UPDATE prospect_leads SET status = 'sent', sent_count = sent_count + 1, last_sent_at = NOW(), updated_at = NOW() WHERE id = '${lead.id}'`
        ));
        await db.execute(sql.raw(`UPDATE prospect_templates SET sent_count = sent_count + 1 WHERE id = '${template.id}'`));
        sent++;
        console.log("[PROSPECT] Enviado para:", fullPhone);
      } catch (e: any) {
        const errMsg = e.message?.toLowerCase() ?? "";
        const novoStatus = (errMsg.includes("not registered") || errMsg.includes("invalid phone") || errMsg.includes("does not exist"))
          ? "no_whatsapp" : "error";
        await db.execute(sql.raw(
          `UPDATE prospect_leads SET status = '${novoStatus}', updated_at = NOW() WHERE id = '${lead.id}'`
        ));
        console.error("[PROSPECT] Erro:", fullPhone, e.message);
      }

      const interval = (Math.floor(Math.random() * (Number(max_interval) - Number(min_interval) + 1)) + Number(min_interval)) * 1000;
      await new Promise(r => setTimeout(r, interval));
    }
    console.log("[PROSPECT] Finalizado. Enviados:", sent);
  });

  // ── GET /super-admin/prospects/stats ─────────────────────────────────────
  fastify.get("/super-admin/prospects/stats", { preHandler: [requireSuperAdmin] }, async (_req: any, reply) => {
    const [stats, byNiche] = await Promise.all([
      db.execute(sql.raw(`
        SELECT
          COUNT(*) as total,
          COUNT(CASE WHEN status='pending'   THEN 1 END) as pending,
          COUNT(CASE WHEN status='sent'      THEN 1 END) as sent,
          COUNT(CASE WHEN status='replied'   THEN 1 END) as replied,
          COUNT(CASE WHEN status='converted' THEN 1 END) as converted,
          COUNT(CASE WHEN status='blacklist' THEN 1 END) as blacklist
        FROM prospect_leads
      `)),
      db.execute(sql.raw(`
        SELECT niche, COUNT(*) as total,
          COUNT(CASE WHEN status='sent' THEN 1 END) as sent
        FROM prospect_leads
        GROUP BY niche
        ORDER BY total DESC
      `)),
    ]);

    const statsRows = Array.isArray(stats)   ? stats   : (stats   as any).rows ?? [];
    const nicheRows = Array.isArray(byNiche) ? byNiche : (byNiche as any).rows ?? [];
    return reply.send({ success: true, data: { totals: statsRows[0] ?? {}, by_niche: nicheRows } });
  });

  // WhatsApp prospecção
  fastify.post("/super-admin/prospects/whatsapp/connect", { preHandler: [requireSuperAdmin] }, async (req: any, reply) => {
    const evolutionUrl = process.env.EVOLUTION_API_URL ?? "https://evolution.zensalon.com.br";
    const evolutionKey = process.env.EVOLUTION_API_KEY ?? "zensalon123";
    const instance = "prospeccao";
    try {
      // Tenta criar instancia se nao existir
      await fetch(`${evolutionUrl}/instance/create`, { method: "POST", headers: { "Content-Type": "application/json", "apikey": evolutionKey }, body: JSON.stringify({ instanceName: instance, qrcode: true, integration: "WHATSAPP-BAILEYS" }) });
    } catch {}
    try {
      const r = await fetch(`${evolutionUrl}/instance/connect/${instance}`, { headers: { "apikey": evolutionKey } });
      const d = await r.json() as any;
      if (d?.base64) return reply.send({ qrcode: d.base64 });
      if (d?.instance?.state === "open") return reply.send({ connected: true, phone: d?.instance?.profileName ?? "" });
      return reply.send({ qrcode: null, connected: false });
    } catch (e: any) {
      return reply.status(500).send({ error: e.message });
    }
  });

  fastify.get("/super-admin/prospects/whatsapp/status", { preHandler: [requireSuperAdmin] }, async (req: any, reply) => {
    const evolutionUrl = process.env.EVOLUTION_API_URL ?? "https://evolution.zensalon.com.br";
    const evolutionKey = process.env.EVOLUTION_API_KEY ?? "zensalon123";
    const instance = "prospeccao";
    try {
      const r = await fetch(`${evolutionUrl}/instance/fetchInstances?instanceName=${instance}`, { headers: { "apikey": evolutionKey } });
      const d = await r.json() as any;
      const inst = Array.isArray(d) ? d[0] : d;
      const state = inst?.instance?.state ?? inst?.state ?? "";
      const connected = state === "open";
      const phone = inst?.instance?.owner ?? inst?.owner ?? inst?.instance?.profileName ?? inst?.profileName ?? "";
      return reply.send({ connected, phone });
    } catch {
      return reply.send({ connected: false });
    }
  });

  fastify.post("/super-admin/prospects/whatsapp/disconnect", { preHandler: [requireSuperAdmin] }, async (req: any, reply) => {
    const evolutionUrl = process.env.EVOLUTION_API_URL ?? "https://evolution.zensalon.com.br";
    const evolutionKey = process.env.EVOLUTION_API_KEY ?? "zensalon123";
    const instance = "prospeccao";
    try {
      await fetch(`${evolutionUrl}/instance/logout/${instance}`, { method: "DELETE", headers: { "apikey": evolutionKey } });
      return reply.send({ success: true });
    } catch {
      return reply.send({ success: false });
    }
  });

}
