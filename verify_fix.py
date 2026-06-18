with open("backend/src/modules/all-modules.ts", "r", encoding="utf-8") as f:
    lines = f.readlines()

# Achar onde esta o impersonate agora
for i, line in enumerate(lines):
    if "IMPERSONATION" in line:
        print(f"=== Impersonate encontrado na linha {i+1} ===")
        for j in range(max(0,i-5), min(len(lines),i+10)):
            print(f"{j+1}: {lines[j]}", end="")
        break
