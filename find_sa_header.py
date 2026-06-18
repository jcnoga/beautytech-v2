# -*- coding: utf-8 -*-
path = r"C:\projetos\beautytech-v2\frontend\src\App.tsx"
with open(path, "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines, 1):
    if "Super Admin" in line or "super-admin" in line.lower():
        if "header" in line.lower() or "nav" in line.lower() or "painel" in line.lower() or "titulo" in line.lower() or "title" in line.lower():
            print(f"{i}: {line.rstrip()}")
