# -*- coding: utf-8 -*-
path = r"frontend\src\App.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = "  const [showRegister, setShowRegister] = useState(false);"
new = "  const [showRegister, setShowRegister] = useState(() => new URLSearchParams(window.location.search).get('tela') === 'cadastro');"

if old in content:
    content = content.replace(old, new)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("OK showRegister corrigido!")
else:
    print("ERRO - verificando estado atual:")
    idx = content.find("showRegister")
    print(repr(content[idx-20:idx+100]))
