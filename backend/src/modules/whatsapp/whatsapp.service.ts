import { env } from '../../config/env.js';

const EVOLUTION_URL = env.WHATSAPP_API_URL!;
const EVOLUTION_KEY = env.WHATSAPP_API_KEY!;
const EVOLUTION_INSTANCE = env.WHATSAPP_INSTANCE!;

async function evolutionRequest(path: string, method: string, body?: object) {
  const res = await fetch(EVOLUTION_URL + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'apikey': EVOLUTION_KEY,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const error = await res.text();
    throw new Error('Evolution API error: ' + res.status + ' - ' + error);
  }
  return res.json();
}

export async function sendTextMessage(number: string, text: string) {
  const instance = encodeURIComponent(EVOLUTION_INSTANCE);
  return evolutionRequest('/message/sendText/' + instance, 'POST', { number, text });
}

export async function sendTemplateMessage(number: string, template: string, variables: Record<string, string>) {
  let text = template;
  for (const [key, value] of Object.entries(variables)) {
    text = text.replace('{{' + key + '}}', value);
  }
  return sendTextMessage(number, text);
}

export async function getInstanceStatus() {
  return evolutionRequest('/instance/fetchInstances', 'GET');
}
