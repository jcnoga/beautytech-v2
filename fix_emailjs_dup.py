# -*- coding: utf-8 -*-
path = r"index.html"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Remove o init duplicado com CFG
old = "emailjs.init({ publicKey: CFG.emailjs_public_key });\n"
if old in content:
    content = content.replace(old, "")
    print("OK init duplicado removido!")
else:
    print("INFO nao encontrado - ok")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
print("Arquivo salvo.")
