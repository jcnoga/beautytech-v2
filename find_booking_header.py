# -*- coding: utf-8 -*-
path = r"C:\projetos\beautytech-v2\frontend\src\BookingPage.tsx"
with open(path, "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines, 1):
    if "HEADER" in line or "header" in line.lower() or "BookingHero" in line:
        print(f"{i}: {line.rstrip()}")
