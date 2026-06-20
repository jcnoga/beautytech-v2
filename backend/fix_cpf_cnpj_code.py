import sys

path_asaas = r"C:\projetos\beautytech-v2\backend\src\modules\asaas.module.ts"

with open(path_asaas, "r", encoding="utf-8") as f:
    content = f.read()

old1 = """  const getOrCreateAsaasCustomer = async (tenant: any) => {
    const cpfCnpj = tenant.settings?.cpfCnpj;
    if (tenant.settings?.asaasCustomerId) {"""

new1 = """  const getOrCreateAsaasCustomer = async (tenant: any) => {
    const cpfCnpj = tenant.cpfCnpj;
    if (tenant.settings?.asaasCustomerId) {"""

if old1 not in content:
    sys.exit("ERRO: trecho 1 nao encontrado em asaas.module.ts")
content = content.replace(old1, new1, 1)

old2 = """    if (!tenant.email) return reply.status(400).send({ success: false, error: "Email do salao nao configurado." });
    if (!tenant.settings?.cpfCnpj) return reply.status(400).send({ success: false, error: "CPF/CNPJ do salao nao configurado. Acesse Configuracoes para cadastrar." });"""

new2 = """    if (!tenant.email) return reply.status(400).send({ success: false, error: "Email do salao nao configurado." });
    if (!tenant.cpfCnpj) return reply.status(400).send({ success: false, error: "CPF/CNPJ do salao nao configurado. Acesse Configuracoes para cadastrar." });"""

if old2 not in content:
    sys.exit("ERRO: trecho 2 nao encontrado em asaas.module.ts")
content = content.replace(old2, new2, 1)

with open(path_asaas, "w", encoding="utf-8") as f:
    f.write(content)

print("OK: asaas.module.ts atualizado (2 trechos)")

path_all = r"C:\projetos\beautytech-v2\backend\src\modules\all-modules.ts"

with open(path_all, "r", encoding="utf-8") as f:
    content2 = f.read()

old3 = """        hasWifi: hasWifi ?? false,
        hasParking: hasParking ?? false,
        settings: cpfCnpj ? { cpfCnpj } : {},
      }).returning();"""

new3 = """        hasWifi: hasWifi ?? false,
        hasParking: hasParking ?? false,
        cpfCnpj: cpfCnpj ?? null,
        settings: {},
      }).returning();"""

if old3 not in content2:
    sys.exit("ERRO: trecho do auth/register nao encontrado em all-modules.ts")
content2 = content2.replace(old3, new3, 1)

with open(path_all, "w", encoding="utf-8") as f:
    f.write(content2)

print("OK: all-modules.ts atualizado (1 trecho)")
