// Upload de imagens do tenant (logo, capa, foto de profissional...).
// Os arquivos vão para UPLOADS_DIR/<tenantId>/ — um volume da VPS que o nginx
// do container web publica em /uploads. Substitui o bucket tenant-assets do Supabase.
import type { FastifyInstance } from "fastify";
import multipart from "@fastify/multipart";
import { mkdir, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import path from "node:path";
import { env } from "../config/env.js";
import { authenticate } from "../middleware/auth.js";

const MAX_BYTES = 5 * 1024 * 1024;
const KINDS = new Set(["logo", "cover", "professional", "gallery", "photo"]);

/** Extensão pelo conteúdo (não pelo nome nem pelo Content-Type do cliente). SVG fica de fora. */
function imageExt(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "webp";
  if (buf.toString("ascii", 0, 4) === "GIF8") return "gif";
  return null;
}

export async function uploadsModule(fastify: FastifyInstance) {
  await fastify.register(multipart, { limits: { fileSize: MAX_BYTES, files: 1, fields: 0 } });

  // POST /uploads?kind=logo  (multipart, campo "file")
  fastify.post("/uploads", { preHandler: [authenticate] }, async (req: any, reply) => {
    const { tenantId } = req.tenantContext;
    const kind = String(req.query?.kind ?? "photo");
    if (!KINDS.has(kind)) return reply.status(400).send({ success: false, error: "Tipo de upload invalido" });

    let buf: Buffer;
    try {
      const file = await req.file({ limits: { fileSize: MAX_BYTES, files: 1, fields: 0 } });
      if (!file) return reply.status(400).send({ success: false, error: "Envie um arquivo no campo 'file'" });
      buf = await file.toBuffer();
      if (file.file.truncated || buf.length > MAX_BYTES) return reply.status(413).send({ success: false, error: "Imagem maior que 5 MB" });
    } catch (err: any) {
      if (err?.code === "FST_REQ_FILE_TOO_LARGE") return reply.status(413).send({ success: false, error: "Imagem maior que 5 MB" });
      if (err?.code === "FST_INVALID_MULTIPART_CONTENT_TYPE") return reply.status(400).send({ success: false, error: "Envie multipart/form-data" });
      throw err;
    }

    const ext = imageExt(buf);
    if (!ext) return reply.status(415).send({ success: false, error: "Formato nao suportado (use JPG, PNG, WEBP ou GIF)" });

    const name = `${kind}-${Date.now()}-${randomBytes(4).toString("hex")}.${ext}`;
    const dir = path.join(env.UPLOADS_DIR, tenantId);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, name), buf, { flag: "wx" });

    return reply.status(201).send({ success: true, data: { url: `${env.PUBLIC_UPLOADS_URL}/${tenantId}/${name}` } });
  });
}
