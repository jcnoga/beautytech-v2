import io

path = "src/db/schema/index.ts"

with io.open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = "export const tenantsRelations = relations(tenants, ({ many }) => ({"
new = "export const tenantsRelations = relations(tenants, ({ one, many }) => ({"

if new in content:
    print("Ja corrigido, nada a fazer.")
elif old not in content:
    raise SystemExit("ERRO: linha esperada nao encontrada. Abortando sem alterar nada.")
else:
    content = content.replace(old, new, 1)
    with io.open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Corrigido: 'one' adicionado a desestruturacao de tenantsRelations.")
