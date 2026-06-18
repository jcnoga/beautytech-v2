# -*- coding: utf-8 -*-
path = r"C:\projetos\beautytech-v2\frontend\src\App.tsx"
with open(path, "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines, 1):
    if "SuperAdmin" in line and ("tab" in line.lower() or "aba" in line.lower() or "nav" in line.lower()):
        print(f"{i}: {line.rstrip()}")
