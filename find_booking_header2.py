# -*- coding: utf-8 -*-
path = r"C:\projetos\beautytech-v2\frontend\src\BookingPage.tsx"
with open(path, "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines[134:145], 135):
    print(f"{i}: {line.rstrip()}")
