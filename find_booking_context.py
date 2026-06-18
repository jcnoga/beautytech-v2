# -*- coding: utf-8 -*-
path = r"C:\projetos\beautytech-v2\frontend\src\BookingPage.tsx"
with open(path, "r", encoding="utf-8") as f:
    lines = f.readlines()

print("=== FETCH SLOTS ===")
for i, line in enumerate(lines[45:65], 46):
    print(f"{i}: {line.rstrip()}")

print("=== RENDER SLOTS ===")
for i, line in enumerate(lines[220:250], 221):
    print(f"{i}: {line.rstrip()}")
