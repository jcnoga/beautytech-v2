path = r"C:\projetos\beautytech-v2\frontend\src\App.tsx"
with open(path, "r", encoding="utf-8") as f:
    lines = f.readlines()

# Linha 3226 (idx 3225) esta com div solto - inserir o if (loading) antes
lines[3225] = "  if (loading) return (\n"

with open(path, "w", encoding="utf-8", newline="\n") as f:
    f.writelines(lines)
print("OK - loading restaurado")

with open(path, "r", encoding="utf-8") as f:
    ls = f.readlines()
for i, l in enumerate(ls[3222:3235], start=3223):
    print(f"{i}: {l}", end="")