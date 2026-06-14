path = r"C:\projetos\beautytech-v2\frontend\src\App.tsx"
with open(path, "r", encoding="utf-8") as f:
    lines = f.readlines()

# idx 3225 = "if (loading) return ("
# idx 3226 = div interno (sem o pai)
# Inserir a div pai antes do idx 3226
lines.insert(3226, '    <div style={{ minHeight:"100vh", background: C.bg, display:"flex", alignItems:"center", justifyContent:"center" }}>\n')

with open(path, "w", encoding="utf-8", newline="\n") as f:
    f.writelines(lines)
print("OK - div pai do loading inserida")

with open(path, "r", encoding="utf-8") as f:
    ls = f.readlines()
for i, l in enumerate(ls[3224:3234], start=3225):
    print(f"{i}: {l}", end="")