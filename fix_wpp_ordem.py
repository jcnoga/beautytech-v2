# -*- coding: utf-8 -*-
path = r"index.html"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = "  mostrarSucesso();\n  setTimeout(() => { window.open(wppUrl, '_blank'); }, 1500);\n});"
new = "  mostrarSucesso();\n  setTimeout(() => { window.open(wppUrl, '_blank'); }, 2000);\n});"

if old in content:
    content = content.replace(old, new)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("OK ordem ajustada!")
else:
    # Mostra trecho atual
    idx = content.find("mostrarSucesso")
    idx2 = content.find("});", idx)
    print("ERRO - trecho atual:")
    print(repr(content[idx:idx2+3]))
