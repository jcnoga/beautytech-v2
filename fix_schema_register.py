import re

# 1. Atualiza schema Drizzle
schema = open('C:/projetos/beautytech-v2/backend/src/db/schema/index.ts', encoding='utf-8').read()

old_schema = '  addressZip:   varchar("address_zip", { length: 10 }),\n  website:      varchar("website", { length: 255 }),'
new_schema = '  addressZip:   varchar("address_zip", { length: 10 }),\n  lat:          decimal("lat", { precision: 10, scale: 7 }),\n  lng:          decimal("lng", { precision: 10, scale: 7 }),\n  hasWifi:      boolean("has_wifi").notNull().default(false),\n  hasParking:   boolean("has_parking").notNull().default(false),\n  website:      varchar("website", { length: 255 }),'

if old_schema in schema:
    schema = schema.replace(old_schema, new_schema, 1)
    open('C:/projetos/beautytech-v2/backend/src/db/schema/index.ts', 'w', encoding='utf-8').write(schema)
    print("OK - schema atualizado")
else:
    print("NAO ENCONTRADO no schema")

# 2. Atualiza rota de registro no all-modules.ts para aceitar novos campos e fazer geocoding
modules = open('C:/projetos/beautytech-v2/backend/src/modules/all-modules.ts', encoding='utf-8').read()

old_register = """    const { salonName, ownerName, email, password, whatsapp, businessType, cpfCnpj } = req.body as any;"""
new_register = """    const { salonName, ownerName, email, password, whatsapp, businessType, cpfCnpj,
      addressStreet, addressCity, addressState, addressZip, hasWifi, hasParking } = req.body as any;"""

if old_register in modules:
    modules = modules.replace(old_register, new_register, 1)
    print("OK - destructuring atualizado")
else:
    print("NAO ENCONTRADO no destructuring")

old_insert = """        name: salonName,
        slug: salonName.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") + "-" + Math.random().toString(36).slice(2,7),
        email,
        whatsapp: whatsapp ?? null,
        planTier: "trial",
        isActive: true,
        trialEndsAt,
        businessType: resolvedBusinessType,
        settings: cpfCnpj ? { cpfCnpj } : {},"""

new_insert = """        name: salonName,
        slug: salonName.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") + "-" + Math.random().toString(36).slice(2,7),
        email,
        whatsapp: whatsapp ?? null,
        planTier: "trial",
        isActive: true,
        trialEndsAt,
        businessType: resolvedBusinessType,
        addressStreet: addressStreet ?? null,
        addressCity: addressCity ?? null,
        addressState: addressState ?? null,
        addressZip: addressZip ?? null,
        hasWifi: hasWifi ?? false,
        hasParking: hasParking ?? false,
        settings: cpfCnpj ? { cpfCnpj } : {},"""

if old_insert in modules:
    modules = modules.replace(old_insert, new_insert, 1)
    print("OK - insert atualizado")
else:
    print("NAO ENCONTRADO no insert")

# Adiciona geocoding após insert do tenant
old_geo = """      // Dispara e-mail de boas-vindas (fire and forget)"""
new_geo = """      // Geocoding automatico via Nominatim (fire and forget)
      if (addressCity || addressStreet) {
        (async () => {
          try {
            const q = [addressStreet, addressCity, addressState, "Brasil"].filter(Boolean).join(", ");
            const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`, {
              headers: { "User-Agent": "ZenSalon/1.0 (contato@zensalon.com.br)" }
            });
            const geoJson = await geoRes.json();
            if (geoJson?.[0]) {
              await db.update(tenants).set({
                lat: geoJson[0].lat,
                lng: geoJson[0].lon,
              }).where(eq(tenants.id, tenant.id));
              console.log(`[GEO] ${salonName}: ${geoJson[0].lat}, ${geoJson[0].lon}`);
            }
          } catch (e: any) { console.error("[GEO] Erro geocoding:", e.message); }
        })();
      }

      // Dispara e-mail de boas-vindas (fire and forget)"""

if old_geo in modules:
    modules = modules.replace(old_geo, new_geo, 1)
    print("OK - geocoding adicionado")
else:
    print("NAO ENCONTRADO no geocoding")

open('C:/projetos/beautytech-v2/backend/src/modules/all-modules.ts', 'w', encoding='utf-8').write(modules)
print("CONCLUIDO")
