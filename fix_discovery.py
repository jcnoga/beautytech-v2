# -*- coding: utf-8 -*-
path = r"C:\projetos\beautytech-v2\frontend\src\DiscoveryPage.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Bug 1: emoji lupa como string literal no JSX
content = content.replace(
    '<div style={{ fontSize: "3rem", marginBottom: 16 }}>\\uD83D\\uDD0D</div>',
    '<div style={{ fontSize: "3rem", marginBottom: 16 }}>{"' + "\U0001F50D" + '"}</div>'
)

# Bug 2: encoding corrompido
content = content.replace("\xe2\x80\x94", "\u2014")  # dash
content = content.replace("\xc3\xb0\xc5\xb8\x22\x94", "\U0001F4CD")  # pin

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("OK - arquivo corrigido")
