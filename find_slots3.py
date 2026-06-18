# -*- coding: utf-8 -*-
path = r"C:\projetos\beautytech-v2\backend\src\modules\all-modules.ts"
with open(path, "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines, 1):
    if "available-slots" in line or "availableSlots" in line or "/slots" in line:
        print(f"{i}: {line.rstrip()}")
