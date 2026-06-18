# -*- coding: utf-8 -*-
path = r"C:\projetos\beautytech-v2\frontend\src\BookingPage.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = "      {/* HEADER */}\n      <div style={{background:C.card,borderBottom:`1px solid ${C.border}`,padding:\"16px 24px\",display:\"flex\",alignItems:\"center\",gap:12}}>"
new = "      {/* HERO COM FOTO DE FUNDO */}\n      {tenant && <BookingHero tenant={tenant} accent={accent} />}\n\n      {/* HEADER */}\n      <div style={{background:C.card,borderBottom:`1px solid ${C.border}`,padding:\"16px 24px\",display:\"flex\",alignItems:\"center\",gap:12}}>"

if old in content:
    content = content.replace(old, new)
    print("Substituido com sucesso")
else:
    print("ERRO: string nao encontrada")
    # Mostra o contexto
    idx = content.find("{/* HEADER */}")
    print(repr(content[idx-5:idx+150]))

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
