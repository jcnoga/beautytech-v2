# -*- coding: utf-8 -*-
path = r"index.html"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Remove init incorreto apos CFG
old = """};
emailjs.init({ publicKey: CFG.emailjs_public_key });
// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
// \u2699\ufe0f  CONFIGURA\u00c7\u00c3O \u2014 edite apenas estas linhas"""
new = """};
// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
// \u2699\ufe0f  CONFIGURA\u00c7\u00c3O \u2014 edite apenas estas linhas"""

if old in content:
    content = content.replace(old, new)
    print("OK init removido do lugar errado!")
else:
    print("ERRO trecho nao encontrado - buscando CFG...")
    idx = content.find("emailjs.init")
    print(repr(content[idx-50:idx+100]))

# Adiciona init correto apos definicao do CFG
old2 = "  url_cadastro:     'https://beautytech-v2.vercel.app',\n};"
new2 = "  url_cadastro:     'https://beautytech-v2.vercel.app',\n};\nemailjs.init({ publicKey: 'ZkNs2O6HgMI90_xsu' });"

if old2 in content:
    content = content.replace(old2, new2)
    print("OK init adicionado com chave hardcoded!")
else:
    print("ERRO CFG url_cadastro nao encontrado")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
print("Arquivo salvo.")
