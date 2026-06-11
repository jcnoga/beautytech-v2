path = r"index.html"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = "window.location.href = CFG.url_cadastro;"
new = "window.location.href = CFG.url_cadastro + '?tela=cadastro';"

if old in content:
    content = content.replace(old, new)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("OK redirect atualizado!")
else:
    print("ERRO trecho nao encontrado")
