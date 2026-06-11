path = r"frontend\src\App.tsx"
with open(path, "r", encoding="utf-8") as f:
    lines = f.readlines()
for i in range(100, 135):
    print(f"{i+1}: {repr(lines[i])}")
