path = r"C:\projetos\beautytech-v2\backend\src\modules\whatsapp\whatsapp.routes.ts"
with open(path, "r", encoding="utf-8") as f:
    lines = f.readlines()

# Encontrar linha com "Notificar dono"
for i, line in enumerate(lines):
    if "Notificar dono" in line:
        print(f"Linha {i+1}: {repr(line)}")
        # Mostrar contexto
        for j in range(i, min(len(lines), i+25)):
            print(f"{j+1}: {repr(lines[j])}")
        break
