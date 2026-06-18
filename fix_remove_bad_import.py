# -*- coding: utf-8 -*-
path = r"C:\projetos\beautytech-v2\backend\src\modules\all-modules.ts"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Remove o import invalido que causa crash
content = content.replace(
    "  professionalSchedules, professionalServices,\n} from \"@db/schema/index\";",
    "} from \"@db/schema/index\";"
)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("OK")
