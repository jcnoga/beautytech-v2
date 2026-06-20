import sys

path = r"C:\projetos\beautytech-v2\backend\src\db\schema\index.ts"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old_tenants = """  email:        varchar("email", { length: 255 }),
  phone:        varchar("phone", { length: 20 }),
  whatsapp:     varchar("whatsapp", { length: 20 }),
  logoUrl:      text("logo_url"),"""

new_tenants = """  email:        varchar("email", { length: 255 }),
  cpfCnpj:      varchar("cpf_cnpj", { length: 18 }),
  phone:        varchar("phone", { length: 20 }),
  whatsapp:     varchar("whatsapp", { length: 20 }),
  logoUrl:      text("logo_url"),"""

if old_tenants not in content:
    sys.exit("ERRO: bloco da tabela tenants nao encontrado - espacamento pode ter mudado")

content = content.replace(old_tenants, new_tenants, 1)

old_profiles = """  email:         varchar("email", { length: 255 }),
  phone:         varchar("phone", { length: 20 }),
  whatsapp:      varchar("whatsapp", { length: 20 }),
  avatarUrl:     text("avatar_url"),"""

new_profiles = """  email:         varchar("email", { length: 255 }),
  cpfCnpj:       varchar("cpf_cnpj", { length: 18 }),
  phone:         varchar("phone", { length: 20 }),
  whatsapp:      varchar("whatsapp", { length: 20 }),
  avatarUrl:     text("avatar_url"),"""

if old_profiles not in content:
    sys.exit("ERRO: bloco da tabela user_profiles nao encontrado - espacamento pode ter mudado")

content = content.replace(old_profiles, new_profiles, 1)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("OK: cpfCnpj adicionado em tenants e user_profiles")
