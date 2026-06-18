with open("frontend/src/App.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "const api" in line or "createApi" in line or "axios" in line.lower() or ("fetch" in line and "Authorization" in line and "localStorage" in line):
        start = max(0, i-2)
        end = min(len(lines), i+20)
        print(f"=== Linha {i+1} ===")
        for j in range(start, end):
            print(f"{j+1}: {lines[j]}", end="")
        print()
