# -*- coding: utf-8 -*-
path = r"C:\projetos\beautytech-v2\backend\src\db\schema\index.ts"
with open(path, "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines, 1):
    if "schedule" in line.lower() or "Schedule" in line:
        print(f"{i}: {line.rstrip()}")
