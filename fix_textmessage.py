import io

with io.open('backend/src/modules/whatsapp/whatsapp.service.ts', 'r', encoding='utf-8') as f:
    content = f.read()

old = 'return evolutionRequest(apiUrl, apiKey, "/message/sendText/" + encodeURIComponent(instanceName), "POST", { number, text });'
new = 'return evolutionRequest(apiUrl, apiKey, "/message/sendText/" + encodeURIComponent(instanceName), "POST", { number, textMessage: { text } });'

result = content.replace(old, new)
if result == content:
    print("ERRO: texto nao encontrado")
else:
    with io.open('backend/src/modules/whatsapp/whatsapp.service.ts', 'w', encoding='utf-8') as f:
        f.write(result)
    print("OK")
