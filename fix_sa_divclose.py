# -*- coding: utf-8 -*-
path = r"C:\projetos\beautytech-v2\frontend\src\App.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Corrige o fechamento incorreto
old = "        }\n      </div>\n\n        </div>)}\n\n        {saTab === \"logs\""
new = "        }\n        </div>\n        )}\n\n        {saTab === \"logs\""

if old in content:
    content = content.replace(old, new)
    print("OK")
else:
    print("Nao encontrou - mostrando contexto")
    idx = content.find("</div>)}")
    print(repr(content[idx-100:idx+100]))

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
