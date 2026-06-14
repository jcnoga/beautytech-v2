path = r"C:\projetos\beautytech-v2\frontend\src\App.tsx"
with open(path, "r", encoding="utf-8") as f:
    lines = f.readlines()

# Encontrar a linha com isRootDomain
for i, line in enumerate(lines):
    if "isRootDomain" in line and "const" in line:
        print(f"Linha {i+1}: {repr(line)}")
    if "isRootDomain" in line and "return" in line:
        print(f"Linha {i+1}: {repr(line)}")
    if "isSubdomain" in line and "return" in line:
        print(f"Linha {i+1}: {repr(line)}")
    if "isSuperAdmin" in line and "return" in line:
        print(f"Linha {i+1}: {repr(line)}")
