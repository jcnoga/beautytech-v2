# -*- coding: utf-8 -*-
path = r"index.html"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Corrige ordem: mostra sucesso primeiro, abre whatsapp depois
old = "  window.open(wppUrl, '_blank');\n  mostrarSucesso();\n});"
new = "  mostrarSucesso();\n  setTimeout(() => { window.open(wppUrl, '_blank'); }, 1500);\n});"

if old in content:
    content = content.replace(old, new)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("OK ordem corrigida!")
else:
    print("ERRO trecho nao encontrado")
