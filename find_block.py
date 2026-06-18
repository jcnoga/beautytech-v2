with open("frontend/src/App.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

start = 2560
end = 2630
for i in range(start, min(end, len(lines))):
    print(f"{i+1}: {lines[i]}", end="")
