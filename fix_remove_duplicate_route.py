# -*- coding: utf-8 -*-
path = r"C:\projetos\beautytech-v2\backend\src\modules\all-modules.ts"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Remove o endpoint duplicado que adicionamos
start = "  // ============================================================\n  // PUBLIC: GET /public/tenants/:slug/availability\n  // ============================================================"
end = "  fastify.post(\"/demo/seed\", { preHandler: [authenticate] }"

idx_start = content.find(start)
idx_end = content.find(end)

if idx_start != -1 and idx_end != -1:
    content = content[:idx_start] + "  " + content[idx_end:]
    print("Endpoint duplicado removido")
else:
    print("Nao encontrou o bloco para remover")
    print(f"idx_start={idx_start}, idx_end={idx_end}")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("OK")
