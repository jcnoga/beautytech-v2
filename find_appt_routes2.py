# -*- coding: utf-8 -*-
path = r"C:\projetos\beautytech-v2\backend\src\modules\appointments\appointments.routes.ts"
with open(path, "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines[99:140], 100):
    print(f"{i}: {line.rstrip()}")
