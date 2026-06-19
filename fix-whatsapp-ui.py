fpath = r'C:\projetos\beautytech-v2\frontend\src\App.tsx'
with open(fpath, 'r', encoding='utf-8') as f:
    content = f.read()

old = '                  <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:12 }}>\n                   <Inp label="URL da API" value={whatsappUrl} onChange={setWhatsappUrl}\nplaceholder="https://..." />\n                   <Inp label="API Key" value={whatsappKey} onChange={setWhatsappKey}\nplaceholder="sua-chave" />'

# Busca e substitui pelo trecho com Instance Name
old2 = '<Inp label="URL da API" value={whatsappUrl} onChange={setWhatsappUrl} placeholder="https://..." />'
new2 = '<Inp label="URL da API" value={whatsappUrl} onChange={setWhatsappUrl} placeholder="https://..." />\n                   <Inp label="Instance Name" value={whatsappInstance} onChange={setWhatsappInstance} placeholder="zensalon" />'

if old2 in content:
    content = content.replace(old2, new2)
    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("OK: campo Instance Name adicionado")
else:
    print("ERRO: trecho nao encontrado")
    idx = content.find("URL da API")
    print("Contexto:", repr(content[idx-50:idx+150]))
