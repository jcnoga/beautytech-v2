path = r"index.html"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()
idx = content.find("submitBtn.disabled = true")
print(repr(content[idx:idx+1200]))
