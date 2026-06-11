# -*- coding: utf-8 -*-
path = r"index.html"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()
idx = content.find("salao: {")
print(repr(content[idx:idx+300]))
