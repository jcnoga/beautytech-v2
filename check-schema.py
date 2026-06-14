path = r"C:\projetos\beautytech-v2\backend\src\db\schema\index.ts"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Mostrar tabelas relevantes
for table in ["export const tenants", "export const services", "export const professionals", "export const appointments"]:
    idx = content.find(table)
    if idx != -1:
        print(f"\n=== {table} ===")
        print(content[idx:idx+600])
        print("...")
