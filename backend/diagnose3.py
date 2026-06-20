path = r"C:\projetos\beautytech-v2\backend\src\modules\all-modules.ts"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

lines_to_check = [
    '  fastify.patch("/super-admin/tenants/:id/whatsapp-mode", { preHandler: [requireSuperAdmin] }, async (req: any, reply: any) => {',
    '    const { whatsapp_mode, whatsapp_api_url, whatsapp_api_key, whatsapp_instance } = req.body as any;',
    '    const valid = ["manual", "local", "zapi", "cloud"];',
    '    if (!valid.includes(whatsapp_mode)) return reply.status(400).send({ success: false, error: "Modo invalido" });',
    '    const [tenant] = await db.update(tenants).set({',
    '      whatsappMode: whatsapp_mode,',
    '      whatsappApiUrl: whatsapp_api_url ?? null,',
    '      whatsappApiKey: whatsapp_api_key ?? null,',
    '      updatedAt: new Date(),',
    '    }).where(eq(tenants.id, req.params.id)).returning();',
    '    return reply.send({ success: true, data: tenant });',
    '  });',
]

block = lines_to_check[0]
print(f"Linha 1 sozinha: {'OK' if block in content else 'FALHOU'}")
if block not in content:
    keyword = "whatsapp-mode"
    idx = content.find(keyword)
    print(f"  Palavra-chave 'whatsapp-mode' encontrada? {idx >= 0}")
    if idx >= 0:
        print(f"  Texto real ao redor: {repr(content[idx-40:idx+250])}")

for i in range(1, len(lines_to_check)):
    candidate = block + "\n" + lines_to_check[i]
    ok = candidate in content
    print(f"Linhas 1-{i+1} juntas: {'OK' if ok else 'QUEBROU AQUI'}")
    if not ok:
        idx = content.find(block)
        if idx >= 0:
            real_after = content[idx:idx+len(block)+80]
            print(f"  Texto real no arquivo a partir da linha {i}: {repr(real_after)}")
        break
    block = candidate
else:
    print("\nTODAS as linhas bateram como bloco continuo!")
