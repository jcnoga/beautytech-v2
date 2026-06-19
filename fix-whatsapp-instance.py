import re

# --- BACKEND ---
bpath = r'C:\projetos\beautytech-v2\backend\src\modules\all-modules.ts'
with open(bpath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Adiciona whatsapp_instance no body do PATCH
content = content.replace(
    'const { whatsapp_mode, whatsapp_api_url, whatsapp_api_key } = req.body as any;',
    'const { whatsapp_mode, whatsapp_api_url, whatsapp_api_key, whatsapp_instance } = req.body as any;'
)

# 2. Salva whatsapp_instance no update
content = content.replace(
    '      whatsappMode: whatsapp_mode,\n>       whatsappApiUrl: whatsapp_api_url ?? null,\n>       whatsappApiKey: whatsapp_api_key ?? null,',
    '      whatsappMode: whatsapp_mode,\n      whatsappApiUrl: whatsapp_api_url ?? null,\n      whatsappApiKey: whatsapp_api_key ?? null,\n      whatsappInstance: whatsapp_instance ?? null,'
)

# Alternativa sem o >
old_b = '      whatsappMode: whatsapp_mode,\n        whatsappApiUrl: whatsapp_api_url ?? null,\n        whatsappApiKey: whatsapp_api_key ?? null,'
new_b = '      whatsappMode: whatsapp_mode,\n        whatsappApiUrl: whatsapp_api_url ?? null,\n        whatsappApiKey: whatsapp_api_key ?? null,\n        whatsappInstance: whatsapp_instance ?? null,'
content = content.replace(old_b, new_b)

with open(bpath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Backend OK")

# --- FRONTEND ---
fpath = r'C:\projetos\beautytech-v2\frontend\src\App.tsx'
with open(fpath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Adiciona estado whatsappInstance
content = content.replace(
    "const [whatsappMode, setWhatsappMode] = useState(\"manual\");\n    const [whatsappUrl, setWhatsappUrl]   = useState(\"\");\n    const [whatsappKey, setWhatsappKey]   = useState(\"\");",
    "const [whatsappMode, setWhatsappMode] = useState(\"manual\");\n    const [whatsappUrl, setWhatsappUrl]   = useState(\"\");\n    const [whatsappKey, setWhatsappKey]   = useState(\"\");\n    const [whatsappInstance, setWhatsappInstance] = useState(\"\");"
)

# 2. Adiciona whatsapp_instance no payload do save
content = content.replace(
    "whatsapp_api_url: whatsappUrl || null,\n        whatsapp_api_key: whatsappKey || null,",
    "whatsapp_api_url: whatsappUrl || null,\n        whatsapp_api_key: whatsappKey || null,\n        whatsapp_instance: whatsappInstance || null,"
)

# 3. Carrega whatsappInstance ao selecionar tenant
content = content.replace(
    "setWhatsappUrl(t.whatsapp_api_url ?? \"\"); setWhatsappKey(t.whatsapp_api_key ?? \"\"); }}>Gerenciar</Btn>",
    "setWhatsappUrl(t.whatsapp_api_url ?? \"\"); setWhatsappKey(t.whatsapp_api_key ?? \"\"); setWhatsappInstance(t.whatsapp_instance ?? \"\"); }}>Gerenciar</Btn>"
)
content = content.replace(
    "setWhatsappUrl(t.whatsapp_api_url ?? \"\"); setWhatsappKey(t.whatsapp_api_key ?? \"\"); }} emptyMsg",
    "setWhatsappUrl(t.whatsapp_api_url ?? \"\"); setWhatsappKey(t.whatsapp_api_key ?? \"\"); setWhatsappInstance(t.whatsapp_instance ?? \"\"); }} emptyMsg"
)

with open(fpath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Frontend App.tsx OK")
