# -*- coding: utf-8 -*-
path = r"C:\projetos\beautytech-v2\frontend\src\App.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Remove fragment - substitui por div com display condicional
old = "        {saTab === \"tenants\" && <>\n        {/* KPIs */"
new = "        {saTab === \"tenants\" && <div>\n        {/* KPIs */"
content = content.replace(old, new)

# Fecha com div em vez de fragment
old2 = "        </> }"
new2 = "        </div> }"
content = content.replace(old2, new2)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("OK")
