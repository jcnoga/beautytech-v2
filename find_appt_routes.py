# -*- coding: utf-8 -*-
path = r"C:\projetos\beautytech-v2\backend\src\modules\appointments\appointments.routes.ts"
with open(path, "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines[65:100], 66):
    print(f"{i}: {line.rstrip()}")
