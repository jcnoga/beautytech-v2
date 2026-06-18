# -*- coding: utf-8 -*-
path = r"C:\projetos\beautytech-v2\backend\src\modules\all-modules.ts"
with open(path, "r", encoding="utf-8") as f:
    lines = f.readlines()

# Busca a linha onde o agendamento é retornado
for i, line in enumerate(lines, 1):
    if "reply.status(201).send({ success: true, data: appt" in line:
        print(f"{i}: {line.rstrip()}")
