# -*- coding: utf-8 -*-
path = r"C:\projetos\beautytech-v2\backend\src\modules\all-modules.ts"
with open(path, "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines, 1):
    if "slots" in line.lower() and ("route" in line.lower() or "available" in line.lower() or "get" in line.lower()):
        print(f"{i}: {line.rstrip()}")
