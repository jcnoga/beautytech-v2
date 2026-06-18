with open("frontend/src/App.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "getToken" in line or ("const token" in line and "localStorage" in line and i < 200):
        start = max(0, i-2)
        end = min(len(lines), i+10)
        print(f"=== Linha {i+1} ===")
        for j in range(start, end):
            print(f"{j+1}: {lines[j]}", end="")
        print()
