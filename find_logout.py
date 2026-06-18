# -*- coding: utf-8 -*-
path = r"C:\projetos\beautytech-v2\frontend\src\App.tsx"
with open(path, "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines, 1):
    if any(x in line for x in ["logout", "Logout", "Sair", "signOut", "onLogout"]):
        print(f"{i}: {line.rstrip()}")
