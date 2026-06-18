with open("frontend/src/App.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "function SuperAdminDashboard" in line:
        for j in range(i, min(i+20, len(lines))):
            print(f"{j+1}: {lines[j].rstrip()}")
        break
