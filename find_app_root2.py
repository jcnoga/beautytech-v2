with open("frontend/src/App.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i in range(3848, min(3920, len(lines))):
    print(f"{i+1}: {lines[i]}", end="")
