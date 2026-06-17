path = r"C:\projetos\beautytech-v2\backend\src\modules\all-modules.ts"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = '        planTier: "trial",'
new = '        planTier: "free",'

count = content.count(old)
print(f"Ocorrencias encontradas: {count}")

if count > 0:
    content = content.replace(old, new, 1)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("OK - planTier corrigido para free")
else:
    print("ERRO - trecho nao encontrado")
