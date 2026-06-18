# -*- coding: utf-8 -*-
path = r"C:\projetos\beautytech-v2\frontend\src\App.tsx"
with open(path, "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines, 1):
    if "DashboardPage" in line or "dashboard" in line.lower():
        if "function" in line or "const" in line or "return" in line:
            print(f"{i}: {line.rstrip()}")
