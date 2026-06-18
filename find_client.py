with open("frontend/src/api/client.ts", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    print(f"{i+1}: {line}", end="")
