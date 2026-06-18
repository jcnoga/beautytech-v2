# -*- coding: utf-8 -*-
path = r"C:\projetos\beautytech-v2\frontend\src\App.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# O fragment precisa fechar dentro do div de padding
old = "        }\n      </> }\n\n      {/* Aba Logs */}"
new = "        }\n        </> }\n\n      {/* Aba Logs */}"
content = content.replace(old, new)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("OK")
