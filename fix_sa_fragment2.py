# -*- coding: utf-8 -*-
path = r"C:\projetos\beautytech-v2\frontend\src\App.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Corrige o fechamento incorreto - o </div> estava dentro do fragment
old = "      </div>\n\n      </> }\n\n      {/* Aba Logs */}"
new = "      </> }\n\n      {/* Aba Logs */}"
content = content.replace(old, new)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("OK")
