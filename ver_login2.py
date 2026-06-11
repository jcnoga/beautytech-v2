# -*- coding: utf-8 -*-
path = r"frontend\src\App.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()
idx = content.find("LoginPage")
print(repr(content[idx-100:idx+400]))
