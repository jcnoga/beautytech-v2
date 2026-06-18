# -*- coding: utf-8 -*-
path = r"C:\projetos\beautytech-v2\frontend\src\App.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Adiciona fechamento do div de tenants antes do Modal
old = "        }\n      {/* Modal Gerenciar Tenant */}"
new = "        }\n        </div> }\n\n      {/* Modal Gerenciar Tenant */}"

if old in content:
    content = content.replace(old, new)
    print("OK - div fechado")
else:
    # Mostra contexto
    idx = content.find("{/* Modal Gerenciar Tenant */}")
    print("Contexto:")
    print(repr(content[idx-100:idx+50]))

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
