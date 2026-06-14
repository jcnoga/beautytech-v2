import { FastifyInstance } from "fastify";
import { db } from "../../db/connection.js";
import { tenants } from "../../db/schema/index.js";
import { eq, or } from "drizzle-orm";

function extractSlugFromHost(host: string): string | null {
  const baseDomains = ["zensalon.com.br", "beautytech.com.br"];
  for (const base of baseDomains) {
    if (host.endsWith(`.${base}`)) {
      return host.replace(`.${base}`, "");
    }
  }
  return null;
}

export async function tenantPublicModule(server: FastifyInstance) {
  server.get("/public/tenant-by-host", async (request, reply) => {
    const hostname = (request.headers["x-forwarded-host"] as string)
      || request.headers.host
      || "";

    const host = hostname.split(":")[0];
    const slug = extractSlugFromHost(host);

    if (!slug && !host) {
      return reply.status(400).send({ error: "Hostname não identificado" });
    }

    const conditions = [];
    if (host) conditions.push(eq(tenants.customDomain, host));
    if (slug)  conditions.push(eq(tenants.slug, slug));

    const result = await db
      .select({
        id:           tenants.id,
        name:         tenants.name,
        slug:         tenants.slug,
        businessType: tenants.businessType,
        primaryColor: tenants.primaryColor,
        logoUrl:      tenants.logoUrl,
        coverUrl:     tenants.coverUrl,
        galleryImages: tenants.galleryImages,
        whatsapp:     tenants.whatsapp,
        instagram:    tenants.instagram,
        facebook:     tenants.facebook,
        addressCity:  tenants.addressCity,
        addressState: tenants.addressState,
        businessHours: tenants.businessHours,
        customDomain: tenants.customDomain,
      })
      .from(tenants)
      .where(or(...conditions))
      .limit(1);

    if (!result[0]) {
      return reply.status(404).send({ error: "Tenant não encontrado" });
    }

    return reply.send({ tenant: result[0] });
  });

  server.get("/public/tenant/:slug", async (request, reply) => {
    const { slug } = request.params as { slug: string };

    const result = await db
      .select({
        id:           tenants.id,
        name:         tenants.name,
        slug:         tenants.slug,
        businessType: tenants.businessType,
        primaryColor: tenants.primaryColor,
        logoUrl:      tenants.logoUrl,
        coverUrl:     tenants.coverUrl,
        galleryImages: tenants.galleryImages,
        whatsapp:     tenants.whatsapp,
        instagram:    tenants.instagram,
        facebook:     tenants.facebook,
        addressCity:  tenants.addressCity,
        addressState: tenants.addressState,
        businessHours: tenants.businessHours,
        customDomain: tenants.customDomain,
      })
      .from(tenants)
      .where(eq(tenants.slug, slug))
      .limit(1);

    if (!result[0]) {
      return reply.status(404).send({ error: "Tenant não encontrado" });
    }

    return reply.send({ tenant: result[0] });
  });
}
