import io

with io.open('backend/src/modules/whatsapp/whatsapp.service.ts', 'r', encoding='utf-8') as f:
    content = f.read()

old = '  const existing = await findEvolutionInstance(apiUrl, apiKey, tenantId);\n  if (!existing) throw new Error("Instancia nao encontrada");\n  return evolutionRequest(apiUrl, apiKey, "/message/sendText/" + encodeURIComponent(existing.name), "POST", { number, text });'

new = '  const instanceName = cfg.instance ?? "zensalon";\n  return evolutionRequest(apiUrl, apiKey, "/message/sendText/" + encodeURIComponent(instanceName), "POST", { number, text });'

result = content.replace(old, new)
if result == content:
    print("ERRO: texto nao encontrado")
else:
    with io.open('backend/src/modules/whatsapp/whatsapp.service.ts', 'w', encoding='utf-8') as f:
        f.write(result)
    print("OK")
