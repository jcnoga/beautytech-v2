import { db } from "@db/connection";
import { tenants } from "@db/schema/index";
import { eq } from "drizzle-orm";

const EVOLUTION_TIMEOUT_MS = 25000;
const EVOLUTION_MAX_RETRIES = 1;

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function getTenantWhatsappConfig(tenantId: string) {
  const [tenant] = await db.select({
    mode: tenants.whatsappMode,
    apiUrl: tenants.whatsappApiUrl,
    apiKey: tenants.whatsappApiKey,
    instance: tenants.whatsappInstance,
  }).from(tenants).where(eq(tenants.id, tenantId)).limit(1);
  return tenant ?? { mode: "manual", apiUrl: null, apiKey: null, instance: null };
}

function getCloudConfig() {
  return {
    apiUrl: process.env["WHATSAPP_API_URL"] ?? "",
    apiKey: process.env["WHATSAPP_API_KEY"] ?? "",
  };
}

async function evolutionRequest(apiUrl: string, apiKey: string, path: string, method: string, body?: object) {
  if (!apiUrl) throw new Error("WHATSAPP_API_URL nao configurada");
  let lastError: Error = new Error("Evolution API: erro desconhecido em " + path);
  for (let attempt = 1; attempt <= EVOLUTION_MAX_RETRIES + 1; attempt++) {
    try {
      const res = await fetchWithTimeout(apiUrl + path, {
        method,
        headers: { "Content-Type": "application/json", "apikey": apiKey },
        body: body ? JSON.stringify(body) : undefined,
      }, EVOLUTION_TIMEOUT_MS);
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error("Evolution API error: " + res.status + " - " + errorText);
      }
      return await res.json();
    } catch (err: any) {
      if (err?.name === "AbortError") {
        lastError = new Error("Evolution API timeout apos " + (EVOLUTION_TIMEOUT_MS / 1000) + "s em " + path + " (tentativa " + attempt + " de " + (EVOLUTION_MAX_RETRIES + 1) + ")");
        console.error("[WhatsApp]", lastError.message);
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

async function zapiRequest(apiUrl: string, apiKey: string, path: string, method: string, body?: object) {
  if (!apiUrl) throw new Error("Z-API URL nao configurada");
  let lastError: Error = new Error("Z-API: erro desconhecido em " + path);
  for (let attempt = 1; attempt <= EVOLUTION_MAX_RETRIES + 1; attempt++) {
    try {
      const res = await fetchWithTimeout(apiUrl + path, {
        method,
        headers: { "Content-Type": "application/json", "Client-Token": apiKey },
        body: body ? JSON.stringify(body) : undefined,
      }, EVOLUTION_TIMEOUT_MS);
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error("Z-API error: " + res.status + " - " + errorText);
      }
      return await res.json();
    } catch (err: any) {
      if (err?.name === "AbortError") {
        lastError = new Error("Z-API timeout apos " + (EVOLUTION_TIMEOUT_MS / 1000) + "s em " + path + " (tentativa " + attempt + " de " + (EVOLUTION_MAX_RETRIES + 1) + ")");
        console.error("[WhatsApp]", lastError.message);
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

async function findEvolutionInstance(apiUrl: string, apiKey: string, tenantId: string) {
  const all = await evolutionRequest(apiUrl, apiKey, "/instance/fetchInstances", "GET") as any;
  const instances = Array.isArray(all) ? all : (all.value ?? []);
  return instances.find((i: any) => i.name.startsWith("salon-" + tenantId.slice(0, 8)));
}

export async function getInstanceStatus(tenantId: string) {
  const cfg = await getTenantWhatsappConfig(tenantId);

  if (cfg.mode === "manual") {
    return { mode: "manual", state: "manual", instance: null };
  }

  if (cfg.mode === "zapi") {
    if (!cfg.apiUrl || !cfg.apiKey) return { mode: "zapi", state: "close", instance: null };
    try {
      const data = await zapiRequest(cfg.apiUrl, cfg.apiKey, "/phone-exists", "GET") as any;
      const connected = data?.connected ?? false;
      return { mode: "zapi", state: connected ? "open" : "close", instance: cfg.instance };
    } catch { return { mode: "zapi", state: "close", instance: null }; }
  }

  // evolution (local ou cloud)
  const apiUrl = cfg.mode === "cloud" ? getCloudConfig().apiUrl : (cfg.apiUrl ?? "");
  const apiKey = cfg.mode === "cloud" ? getCloudConfig().apiKey : (cfg.apiKey ?? "");

  try {
    const all = await evolutionRequest(apiUrl, apiKey, "/instance/fetchInstances", "GET") as any;
    const instances = Array.isArray(all) ? all : (all.value ?? []);
    const instanceName = cfg.instance ?? ("salon-" + tenantId.slice(0, 8));
    const found = instances.find((i: any) => i.name === instanceName || i.instance?.instanceName === instanceName);
    if (found) {
      const connStatus = found.connectionStatus ?? found.instance?.status ?? found.state ?? "";
      if (connStatus === "open") return { mode: cfg.mode, state: "open", instance: found.instance?.instanceName ?? found.name };
      try {
        const qr = await evolutionRequest(apiUrl, apiKey, "/instance/connect/" + encodeURIComponent(found.name), "GET") as any;
        if (qr?.base64) return { mode: cfg.mode, state: "connecting", base64: qr.base64, code: qr.code, instance: found.name };
      } catch {}
      return { mode: cfg.mode, state: "close", instance: found.name };
    }
    return { mode: cfg.mode, state: "close", instance: null };
  } catch (err: any) {
    console.error("[WhatsApp] getInstanceStatus falhou:", err?.message ?? err);
    return { mode: cfg.mode, state: "close", instance: null, error: err?.message };
  }
}

export async function connectInstance(tenantId: string) {
  const cfg = await getTenantWhatsappConfig(tenantId);

  if (cfg.mode === "manual") throw new Error("Modo manual nao suporta conexao automatica");

  if (cfg.mode === "zapi") {
    if (!cfg.apiUrl || !cfg.apiKey) throw new Error("Z-API nao configurada para este salao");
    const qr = await zapiRequest(cfg.apiUrl, cfg.apiKey, "/qr-code/image", "GET") as any;
    if (qr?.value) return { base64: qr.value, mode: "zapi" };
    return { mode: "zapi", state: "connecting" };
  }

  const apiUrl = cfg.mode === "cloud" ? getCloudConfig().apiUrl : (cfg.apiUrl ?? "");
  const apiKey = cfg.mode === "cloud" ? getCloudConfig().apiKey : (cfg.apiKey ?? "");

  const existing = await findEvolutionInstance(apiUrl, apiKey, tenantId);
  if (existing) {
    if (existing.connectionStatus === "open") return { state: "open", instance: existing.name, mode: cfg.mode };
    const qr = await evolutionRequest(apiUrl, apiKey, "/instance/connect/" + encodeURIComponent(existing.name), "GET") as any;
    if (qr?.base64) return { base64: qr.base64, code: qr.code, instance: existing.name, mode: cfg.mode };
    try { await evolutionRequest(apiUrl, apiKey, "/instance/logout/" + encodeURIComponent(existing.name), "DELETE"); } catch {}
    try { await evolutionRequest(apiUrl, apiKey, "/instance/delete/" + encodeURIComponent(existing.name), "DELETE"); } catch {}
    await new Promise(r => setTimeout(r, 1000));
  }
  const instanceName = "salon-" + tenantId.slice(0, 8) + "-" + Date.now();
  await evolutionRequest(apiUrl, apiKey, "/instance/create", "POST", { instanceName, integration: "WHATSAPP-BAILEYS", qrcode: true });
  await new Promise(r => setTimeout(r, 2000));
  const qr = await evolutionRequest(apiUrl, apiKey, "/instance/connect/" + encodeURIComponent(instanceName), "GET") as any;
  if (qr?.base64) return { base64: qr.base64, code: qr.code, instance: instanceName, mode: cfg.mode };
  return { state: "connecting", instance: instanceName, mode: cfg.mode };
}

export async function disconnectInstance(tenantId: string) {
  const cfg = await getTenantWhatsappConfig(tenantId);
  if (cfg.mode === "manual") return { message: "Modo manual" };
  if (cfg.mode === "zapi") {
    if (!cfg.apiUrl || !cfg.apiKey) return { message: "Z-API nao configurada" };
    return zapiRequest(cfg.apiUrl, cfg.apiKey, "/disconnect", "DELETE");
  }
  const apiUrl = cfg.mode === "cloud" ? getCloudConfig().apiUrl : (cfg.apiUrl ?? "");
  const apiKey = cfg.mode === "cloud" ? getCloudConfig().apiKey : (cfg.apiKey ?? "");
  const existing = await findEvolutionInstance(apiUrl, apiKey, tenantId);
  if (!existing) return { message: "Instancia nao encontrada" };
  return evolutionRequest(apiUrl, apiKey, "/instance/logout/" + encodeURIComponent(existing.name), "DELETE");
}

export async function deleteInstance(tenantId: string) {
  const cfg = await getTenantWhatsappConfig(tenantId);
  if (cfg.mode === "manual" || cfg.mode === "zapi") return { message: "Operacao nao aplicavel para este modo" };
  const apiUrl = cfg.mode === "cloud" ? getCloudConfig().apiUrl : (cfg.apiUrl ?? "");
  const apiKey = cfg.mode === "cloud" ? getCloudConfig().apiKey : (cfg.apiKey ?? "");
  const existing = await findEvolutionInstance(apiUrl, apiKey, tenantId);
  if (!existing) return { message: "Instancia nao encontrada" };
  return evolutionRequest(apiUrl, apiKey, "/instance/delete/" + encodeURIComponent(existing.name), "DELETE");
}

export async function sendTextMessage(number: string, text: string, tenantId: string) {
  const cfg = await getTenantWhatsappConfig(tenantId);
  if (cfg.mode === "manual") throw new Error("Modo manual - envio automatico desabilitado");
  if (cfg.mode === "zapi") {
    if (!cfg.apiUrl || !cfg.apiKey) throw new Error("Z-API nao configurada");
    return zapiRequest(cfg.apiUrl, cfg.apiKey, "/send-text", "POST", { phone: number, message: text });
  }
  const apiUrl = cfg.mode === "cloud" ? getCloudConfig().apiUrl : (cfg.apiUrl ?? "");
  const apiKey = cfg.mode === "cloud" ? getCloudConfig().apiKey : (cfg.apiKey ?? "");
  const instanceName = cfg.instance ?? "zensalon";
  return evolutionRequest(apiUrl, apiKey, "/message/sendText/" + encodeURIComponent(instanceName), "POST", { number, textMessage: { text } });
}

export async function sendAppointmentConfirmation(tenantId: string, appt: any) {
  try {
    if (!appt || !appt.clientId) { console.log("[WP-CONFIRM] Sem clientId:", appt?.id); return; }
    const { db } = await import("../../db/index.js");
    const { clients, services, professionals, appointmentServices } = await import("../../db/schema/index.js");
    const { eq, and } = await import("drizzle-orm");
    const [client] = await db.select({ name: clients.fullName, phone: clients.phone, whatsapp: clients.whatsapp }).from(clients).where(and(eq(clients.id, appt.clientId), eq(clients.tenantId, tenantId)));
    const clientPhone = client?.whatsapp ?? client?.phone;
    if (!clientPhone) { console.log("[WP-CONFIRM] Sem telefone:", appt.clientId); return; }
    const [apptSvc] = await db.select({ name: services.name }).from(appointmentServices).innerJoin(services, eq(appointmentServices.serviceId, services.id)).where(eq(appointmentServices.appointmentId, appt.id)).limit(1);
    let profName = "";
    if (appt.professionalId) { const [prof] = await db.select({ name: professionals.name }).from(professionals).where(eq(professionals.id, appt.professionalId)); profName = prof?.name ?? ""; }
    const number = clientPhone.replace(/\D/g, "");
    const fullNumber = number.startsWith("55") ? number : "55" + number;
    const dt = new Date(appt.scheduledAt);
    const dataF = dt.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric" });
    const horaF = dt.toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });
    const msg = "Ola, " + (client.fullName ?? "Cliente") + "! Agendamento confirmado.\n\nData: " + dataF + "\nHorario: " + horaF + "\nServico: " + (apptSvc?.name ?? "Servico") + (profName ? "\nProfissional: " + profName : "") + "\n\nZenSalon";
    await sendTextMessage(fullNumber, msg, tenantId);
    console.log("[WP-CONFIRM] Enviado para:", fullNumber);
  } catch (e: any) { console.error("[WP-CONFIRM] Erro:", e.message); throw e; }
}

export async function sendTemplateMessage(number: string, template: string, variables: Record<string, string>, tenantId: string) {
  let text = template;
  for (const [key, value] of Object.entries(variables)) {
    text = text.replace("{{" + key + "}}", value);
  }
  return sendTextMessage(number, text, tenantId);
}
