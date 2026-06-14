path = r"C:\projetos\beautytech-v2\backend\src\modules\all-modules.ts"
with open(path, "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines[1140:1165], start=1141):
    print(f"{i}: {line}", end="")
