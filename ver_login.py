# -*- coding: utf-8 -*-
path = r"frontend\src\App.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()
idx = content.find("RegisterPage")
print(repr(content[idx-200:idx+300]))
