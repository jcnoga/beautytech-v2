async function evolutionRequest(path: string, method: string, body?: object) {
  const url = process.env['WHATSAPP_API_URL'] ?? '';
  const key = process.env['WHATSAPP_API_KEY'] ?? '';
  if (!url) throw new Error('WHATSAPP_API_URL nao configurada');
  const res = await fetch(url + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'apikey': key,
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
  const instance = process.env['WHATSAPP_INSTANCE'] ?? '';
  const inst = encodeURIComponent(instance);
  return evolutionRequest('/message/sendText/' + inst, 'POST', { number, text });
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
