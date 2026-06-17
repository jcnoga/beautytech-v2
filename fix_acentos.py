# -*- coding: utf-8 -*-
path = r"C:\projetos\beautytech-v2\frontend\src\DiscoveryPage.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("Saloes, barbearias e clinicas de estetica perto de voce", "Sal\u00f5es, barbearias e cl\u00ednicas de est\u00e9tica perto de voc\u00ea")
content = content.replace("Salao de Beleza", "Sal\u00e3o de Beleza")
content = content.replace("Clinica de Estetica", "Cl\u00ednica de Est\u00e9tica")
content = content.replace("voce", "voc\u00ea")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("OK")
