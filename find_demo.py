with open("backend/src/modules/all-modules.ts", "r", encoding="utf-8") as f:
    lines = f.readlines()

# Encontrar linha do demoModule
start = None
end = None
for i, line in enumerate(lines):
    if "export async function demoModule" in line:
        start = i
    if start and i > start and line.strip() == "}":
        end = i + 1
        break

print(f"demoModule: linhas {start+1} a {end}")
