with open("backend/src/modules/all-modules.ts", "r", encoding="utf-8") as f:
    content = f.read()

# Encontrar demoModule
start = content.find("export async function demoModule")
end = content.find("\nexport async function ", start + 10)
demo = content[start:end]

# Contar chaves
opens = demo.count("{")
closes = demo.count("}")
print(f"Chaves abertas: {opens}")
print(f"Chaves fechadas: {closes}")
print(f"Diferenca: {opens - closes}")

# Mostrar ultimas 20 linhas do demoModule
lines = demo.split("\n")
print(f"\nTotal de linhas: {len(lines)}")
print("\nUltimas 15 linhas:")
for i, l in enumerate(lines[-15:]):
    print(f"{len(lines)-15+i+1}: {l}")
