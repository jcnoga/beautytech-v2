# -*- coding: utf-8 -*-
path = r"index.html"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()
idx = content.find("hero-headline")
print(repr(content[idx:idx+300]))
