path = r"C:\projetos\beautytech-v2\frontend\src\App.tsx"
with open(path, "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "superadmin" in line.lower() or "super_admin" in line.lower() or "SuperAdmin" in line:
        print(f"{i+1}: {line}", end="")
