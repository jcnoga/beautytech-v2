with open("backend/src/modules/all-modules.ts", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i in range(1880, min(1960, len(lines))):
    print(f"{i+1}: {lines[i]}", end="")
