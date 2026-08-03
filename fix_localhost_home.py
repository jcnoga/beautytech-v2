# -*- coding: utf-8 -*-
path = r"frontend\src\App.tsx"
content = open(path, encoding="utf-8").read()

old = "const isRootDomain = window.location.hostname.includes('zensalon.com.br')"
new = "const isRootDomain = (window.location.hostname.includes('zensalon.com.br') || window.location.hostname === 'localhost')"

if old in content:
    content = content.replace(old, new, 1)
    open(path, "w", encoding="utf-8").write(content)
    print("OK - isRootDomain agora aceita localhost para testes")
else:
    print("ERRO - trecho nao encontrado, nao foi alterado")
