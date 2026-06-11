# -*- coding: utf-8 -*-
path = r"frontend\src\App.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Localiza os campos de login especificos
old1 = '<Inp label="E-mail" value={email} onChange={setEmail} type="email" placeholder="seu@email.com" />'
new1 = '<Inp label="E-mail" value={email} onChange={setEmail} type="email" placeholder="seu@email.com" autoComplete="off" />'

old2 = 'value={password} onChange={setPassword} type="password"'
new2 = 'value={password} onChange={setPassword} type="password" autoComplete="new-password"'

c = 0
if old1 in content:
    content = content.replace(old1, new1, 1)
    c += 1
    print("OK 1/2 email corrigido!")
else:
    print("ERRO 1/2 - buscando variante...")
    idx = content.find('value={email} onChange={setEmail}')
    print(repr(content[idx-10:idx+100]))

if old2 in content:
    content = content.replace(old2, new2, 1)
    c += 1
    print("OK 2/2 senha corrigida!")
else:
    print("ERRO 2/2 - buscando variante...")
    idx = content.find('value={password}')
    print(repr(content[idx-10:idx+100]))

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
print(f"Concluido {c}/2")
