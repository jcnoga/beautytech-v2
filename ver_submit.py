path = r"index.html"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()
idx = content.find("mostrarSucesso")
print(repr(content[idx-200:idx+400]))
