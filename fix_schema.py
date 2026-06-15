path = r'C:\projetos\beautytech-v2\backend\src\db\schema\index.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()
old = '  maxClients:   integer("max_clients").notNull().default(100),\n  businessType: varchar("business_type"'
new = '  maxClients:       integer("max_clients").notNull().default(100),\n  maxProfessionals: integer("max_professionals").notNull().default(1),\n  businessType: varchar("business_type"'
if old in content:
    content = content.replace(old, new)
    print('OK - maxProfessionals adicionado no schema')
else:
    print('ATENCAO - trecho nao encontrado')
with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
