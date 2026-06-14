path = r"C:\projetos\beautytech-v2\backend\src\db\schema\index.ts"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = '  whatsappInstance: varchar("whatsapp_instance", { length: 255 })'
new = '  whatsappInstance: varchar("whatsapp_instance", { length: 255 }),\n  whatsappStatus: varchar("whatsapp_status", { length: 20 }).notNull().default("disconnected"),\n  whatsappPhone: varchar("whatsapp_phone", { length: 20 }),\n  whatsappConnectedAt: timestamp("whatsapp_connected_at", { withTimezone: true })'

if old in content:
    content = content.replace(old, new)
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(content)
    print("OK - schema atualizado")
else:
    print("ATENCAO - trecho nao encontrado, cole o conteudo atual:")
    idx = content.find("whatsappInstance")
    print(content[max(0,idx-100):idx+200])
