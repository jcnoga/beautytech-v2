import os

path = r"C:\projetos\beautytech-v2\backend\.env"
try:
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if any(k in line for k in ["WHATSAPP", "EVOLUTION", "NOTIFY"]):
                print(line)
except:
    print("Arquivo .env nao encontrado localmente - variaveis estao no Railway")
