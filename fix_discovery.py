import re

path = r"C:\projetos\beautytech-v2\frontend\src\DiscoveryPage.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Bug 1: emoji lupa como string literal no JSX
content = content.replace(
    '<div style={{ fontSize: "3rem", marginBottom: 16 }}>\\uD83D\\uDD0D</div>',
    '<div style={{ fontSize: "3rem", marginBottom: 16 }}>{"??"}</div>'
)

# Bug 2: encoding corrompido nos textos
content = content.replace("â€"", "—")
content = content.replace("ðŸ"", "??")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("OK")
