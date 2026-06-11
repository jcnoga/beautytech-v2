# -*- coding: utf-8 -*-
path = r"frontend\src\App.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()
idx = content.find("function LoginPage")
print(repr(content[idx:idx+800]))
