with open("frontend/src/App.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

keywords = ["setTenants", "getTenants", "listTenants", ".map(t =>", ".map((t,", "t.name", "t.email", "t.slug", "Bloquear", "Desbloquear", "extend-trial", "whatsapp-mode"]

for i, line in enumerate(lines):
    for kw in keywords:
        if kw in line:
            print(f"Linha {i+1}: {line.rstrip()}")
            break
