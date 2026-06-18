with open("frontend/src/App.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "function DashboardPage" in line:
        for j in range(i+50, min(i+120, len(lines))):
            print(f"{j+1}: {lines[j]}", end="")
        break
