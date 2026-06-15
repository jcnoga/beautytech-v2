content = open('C:/projetos/beautytech-v2/backend/src/modules/all-modules.ts', encoding='utf-8').read()

old = """    const { name, logoUrl, coverUrl, primaryColor, whatsapp, instagram, facebook, phone, addressStreet, addressCity, addressState, addressZip, website, businessHours } = req.body as any;
    const updateData: any = { updatedAt: new Date() };
    if (name !== undefined)          updateData.name = name;
    if (logoUrl !== undefined)        updateData.logoUrl = logoUrl;
    if (coverUrl !== undefined)       updateData.coverUrl = coverUrl;
    if (primaryColor !== undefined)   updateData.primaryColor = primaryColor;
    if (whatsapp !== undefined)       updateData.whatsapp = whatsapp;
    if (instagram !== undefined)      updateData.instagram = instagram;
    if (facebook !== undefined)       updateData.facebook = facebook;
    if (phone !== undefined)          updateData.phone = phone;
    if (addressStreet !== undefined)  updateData.addressStreet = addressStreet;
    if (addressCity !== undefined)    updateData.addressCity = addressCity;
    if (addressState !== undefined)   updateData.addressState = addressState;
    if (addressZip !== undefined)     updateData.addressZip = addressZip;
    if (website !== undefined)        updateData.website = website;
    if (businessHours !== undefined)  updateData.businessHours = businessHours;
    const [updated] = await db.update(tenants).set(updateData).where(eq(tenants.id, tenantId)).returning();
    return reply.send({ success: true, data: updated });"""

new = """    const { name, logoUrl, coverUrl, primaryColor, whatsapp, instagram, facebook, phone, addressStreet, addressCity, addressState, addressZip, website, businessHours, hasWifi, hasParking } = req.body as any;
    const updateData: any = { updatedAt: new Date() };
    if (name !== undefined)          updateData.name = name;
    if (logoUrl !== undefined)        updateData.logoUrl = logoUrl;
    if (coverUrl !== undefined)       updateData.coverUrl = coverUrl;
    if (primaryColor !== undefined)   updateData.primaryColor = primaryColor;
    if (whatsapp !== undefined)       updateData.whatsapp = whatsapp;
    if (instagram !== undefined)      updateData.instagram = instagram;
    if (facebook !== undefined)       updateData.facebook = facebook;
    if (phone !== undefined)          updateData.phone = phone;
    if (addressStreet !== undefined)  updateData.addressStreet = addressStreet;
    if (addressCity !== undefined)    updateData.addressCity = addressCity;
    if (addressState !== undefined)   updateData.addressState = addressState;
    if (addressZip !== undefined)     updateData.addressZip = addressZip;
    if (website !== undefined)        updateData.website = website;
    if (businessHours !== undefined)  updateData.businessHours = businessHours;
    if (hasWifi !== undefined)        updateData.hasWifi = hasWifi;
    if (hasParking !== undefined)     updateData.hasParking = hasParking;
    const [updated] = await db.update(tenants).set(updateData).where(eq(tenants.id, tenantId)).returning();
    // Geocoding automatico se endereco foi alterado (fire and forget)
    if (addressCity || addressStreet) {
      (async () => {
        try {
          const city  = addressCity  ?? updated.addressCity;
          const state = addressState ?? updated.addressState;
          const street = addressStreet ?? updated.addressStreet;
          const q = [street, city, state, "Brasil"].filter(Boolean).join(", ");
          const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`, {
            headers: { "User-Agent": "ZenSalon/1.0 (contato@zensalon.com.br)" }
          });
          const geoJson = await geoRes.json();
          if (geoJson?.[0]) {
            await db.update(tenants).set({ lat: geoJson[0].lat, lng: geoJson[0].lon }).where(eq(tenants.id, tenantId));
            console.log(`[GEO] ${updated.name}: ${geoJson[0].lat}, ${geoJson[0].lon}`);
          }
        } catch (e: any) { console.error("[GEO] Erro geocoding:", e.message); }
      })();
    }
    return reply.send({ success: true, data: updated });"""

if old in content:
    content = content.replace(old, new, 1)
    open('C:/projetos/beautytech-v2/backend/src/modules/all-modules.ts', 'w', encoding='utf-8').write(content)
    print("OK - patch profile atualizado com hasWifi, hasParking e geocoding")
else:
    print("NAO ENCONTRADO")
