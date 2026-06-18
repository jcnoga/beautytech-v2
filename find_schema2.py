# -*- coding: utf-8 -*-
import os
schema_dir = r"C:\projetos\beautytech-v2\backend\src\db\schema"
for fname in os.listdir(schema_dir):
    fpath = os.path.join(schema_dir, fname)
    with open(fpath, "r", encoding="utf-8", errors="ignore") as f:
        content = f.read()
    if "professional_schedule" in content.lower():
        print(f"Encontrado em: {fname}")
