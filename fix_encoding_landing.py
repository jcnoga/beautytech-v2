# -*- coding: utf-8 -*-
path = r"C:\projetos\beautytech-v2\frontend\src\LandingPageSobre.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Corrige travessao e checkmark corrompidos
content = content.replace("\u00e2\u20ac\u201d", "-")
content = content.replace("\u00e2\u009c\u201c", "+")

# Garante versoes corretas
content = content.replace("muito mais \u2014 tudo", "muito mais - tudo")
content = content.replace("\u2713", "+")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("OK")
