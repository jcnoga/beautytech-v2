path = r"C:\projetos\beautytech-v2\frontend\src\App.tsx"
with open(path, "r", encoding="utf-8") as f:
    lines = f.readlines()

# Mostrar linhas 1988 ate 2200
for i, line in enumerate(lines[1987:2200], start=1988):
    print(f"{i}: {line}", end="")
