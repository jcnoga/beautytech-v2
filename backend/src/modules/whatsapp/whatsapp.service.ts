async function evolutionRequest(path: string, method: string, body?: object) {
  const url = process.env["WHATSAPP_API_URL"] ?? "";
  const key = process.env["WHATSAPP_API_KEY"] ?? "";
  if (!url) throw new Error("WHATSAPP_API_URL nao configurada");
  const res = await fetch(url + path, { method, headers: { "Content-Type": "application/json", "apikey": key }, body: body ? JSON.stringify(body) : undefined });
  if (!res.ok) { const error = await res.text(); throw new Error("Evolution API error: " + res.status + " - " + error); }
  return res.json();
}
async function findTenantInstance(tenantId: string) {
  const all = await evolutionRequest("/instance/fetchInstances", "GET") as any;
  const instances = Array.isArray(all) ? all : (all.value ?? []);
  return instances.find((i: any) => i.name.startsWith("salon-" + tenantId.slice(0,8)));
}
export async function sendTextMessage(number: string, text: string, tenantId?: string) {
  const instance = tenantId ?? (process.env["WHATSAPP_INSTANCE"] ?? "");
  return evolutionRequest("/message/sendText/" + encodeURIComponent(instance), "POST", { number, text });
}
export async function sendTemplateMessage(number: string, template: string, variables: Record<string, string>, tenantId?: string) {
  let text = template;
  for (const [key, value] of Object.entries(variables)) { text = text.replace("{{" + key + "}}", value); }
  return sendTextMessage(number, text, tenantId);
}
export async function getInstanceStatus(tenantId?: string) {
  try {
    const all = await evolutionRequest("/instance/fetchInstances", "GET") as any;
    const instances = Array.isArray(all) ? all : (all.value ?? []);
    if (tenantId) {
      const found = instances.find((i: any) => i.name.startsWith("salon-" + tenantId.slice(0,8)));
      if (found) {
        if (found.connectionStatus === "open") {
          return { instance: found.name, state: "open" };
        }
        try {
          const qr = await evolutionRequest("/instance/connect/" + encodeURIComponent(found.name), "GET") as any;
          if (qr?.base64) return { instance: found.name, state: "connecting", base64: qr.base64, code: qr.code };
        } catch {}
        return { instance: found.name, state: "close" };
      }
      return { instance: null, state: "close" };
    }
    return instances;
  } catch { return { instance: null, state: "close" }; }
}
export async function connectInstance(tenantId: string) {
  try {
    const existing = await findTenantInstance(tenantId);
    if (existing) {
      if (existing.connectionStatus === "open") {
        return { state: "open", instance: existing.name };
      }
      const qr = await evolutionRequest("/instance/connect/" + encodeURIComponent(existing.name), "GET") as any;
      if (qr?.base64) return { base64: qr.base64, code: qr.code, instance: existing.name };
      try { await evolutionRequest("/instance/logout/" + encodeURIComponent(existing.name), "DELETE"); } catch {}
      try { await evolutionRequest("/instance/delete/" + encodeURIComponent(existing.name), "DELETE"); } catch {}
      await new Promise(r => setTimeout(r, 1000));
    }
    const instanceName = "salon-" + tenantId.slice(0,8) + "-" + Date.now();
    await evolutionRequest("/instance/create", "POST", { instanceName, integration: "WHATSAPP-BAILEYS", qrcode: true });
    await new Promise(r => setTimeout(r, 2000));
    const qr = await evolutionRequest("/instance/connect/" + encodeURIComponent(instanceName), "GET") as any;
    if (qr?.base64) return { base64: qr.base64, code: qr.code, instance: instanceName };
    return { state: "connecting", instance: instanceName };
  } catch (err: any) {
    throw new Error(err.message ?? "Erro ao conectar instancia");
  }
}
export async function getQRCode(tenantId: string) {
  const existing = await findTenantInstance(tenantId);
  if (!existing) throw new Error("Instancia nao encontrada");
  return evolutionRequest("/instance/connect/" + encodeURIComponent(existing.name), "GET");
}
export async function disconnectInstance(tenantId: string) {
  const existing = await findTenantInstance(tenantId);
  if (!existing) return { message: "Instancia nao encontrada" };
  return evolutionRequest("/instance/logout/" + encodeURIComponent(existing.name), "DELETE");
}
export async function deleteInstance(tenantId: string) {
  const existing = await findTenantInstance(tenantId);
  if (!existing) return { message: "Instancia nao encontrada" };
  return evolutionRequest("/instance/delete/" + encodeURIComponent(existing.name), "DELETE");
}