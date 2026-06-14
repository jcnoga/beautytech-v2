path = r"C:\projetos\beautytech-v2\backend\src\modules\all-modules.ts"
with open(path, "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "public" in line.lower() or "slug" in line.lower() or "agendar" in line.lower() or "booking" in line.lower():
        print(f"{i+1}: {line}", end="")
