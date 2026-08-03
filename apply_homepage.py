# -*- coding: utf-8 -*-
import shutil
import os

PROJECT = r"C:\projetos\beautytech-v2\frontend\src"
TARGET = os.path.join(PROJECT, "HomePage.tsx")
BACKUP = os.path.join(PROJECT, "HomePage.tsx.bak")

# Faz backup da HomePage atual antes de sobrescrever
if os.path.exists(TARGET):
    shutil.copy(TARGET, BACKUP)
    print(f"Backup salvo em: {BACKUP}")

NEW_CONTENT = open("HomePage_new.tsx", encoding="utf-8").read()

with open(TARGET, "w", encoding="utf-8") as f:
    f.write(NEW_CONTENT)

print("OK - HomePage.tsx atualizada com sucesso")
