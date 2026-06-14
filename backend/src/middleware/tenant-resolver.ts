import { db } from "../db/connection";
import { tenants } from "../db/schema";
import { eq, or } from "drizzle-orm";

export async function resolveTenantByHostname(hostname: string) {
  // Remove porta se existir (ex: localhost:3000)
  const host = hostname.split(":")[0];

  // 1. Verifica domínio próprio (ex: www.salaobeleza.com.br)
  // 2. Verifica subdomínio (ex: salon1.zensalon.com.br → slug = salon1)
  const slug = extractSlugFromHost(host);

  const result = await db
    .select()
    .from(tenants)
    .where(
      or(
        eq(tenants.customDomain, host),
        slug ? eq(tenants.slug, slug) : undefined
      )
    )
    .limit(1);

  return result[0] ?? null;
}

function extractSlugFromHost(host: string): string | null {
  const baseDomains = ["zensalon.com.br", "beautytech.com.br"];
  for (const base of baseDomains) {
    if (host.endsWith(`.${base}`)) {
      return host.replace(`.${base}`, "");
    }
  }
  return null;
}
