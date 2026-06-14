path = r"C:\projetos\beautytech-v2\frontend\src\App.tsx"
with open(path, "r", encoding="utf-8") as f:
    lines = f.readlines()

# Remover linha 3227 (idx 3226)
lines[3226] = ""

with open(path, "w", encoding="utf-8", newline="\n") as f:
    f.writelines(lines)
print("OK - duplicado removido")
