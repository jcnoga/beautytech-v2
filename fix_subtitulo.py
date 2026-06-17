# -*- coding: utf-8 -*-
path = r"C:\projetos\beautytech-v2\frontend\src\DiscoveryPage.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace(
    "Sal\u00f5es, barbearias e cl\u00ednicas de est\u00e9tica perto de voc\u00ea",
    "Sal\u00f5es de Beleza, Barbearias e Cl\u00ednicas de Est\u00e9tica perto de voc\u00ea"
)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("OK")
