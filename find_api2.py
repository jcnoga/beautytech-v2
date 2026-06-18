with open("frontend/src/App.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

keywords = ["access_token", "auth-token", "sb-", "getItem", "apiCall", "apiFetch", "const get =", "const post =", "async function get", "async function post"]

for i, line in enumerate(lines):
    for kw in keywords:
        if kw in line:
            print(f"{i+1}: {line.rstrip()}")
            break
