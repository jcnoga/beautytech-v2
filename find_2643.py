# -*- coding: utf-8 -*-
path = r"C:\projetos\beautytech-v2\frontend\src\App.tsx"
with open(path, "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines[2638:2655], 2639):
    print(f"{i}: {line.rstrip()}")
