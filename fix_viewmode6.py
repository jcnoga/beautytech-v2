content = open("frontend/src/App.tsx", encoding="utf-8").read()
idx = content.find("viewMode === \"today\" ? appointmentsApi")
idx2 = content.find("load();\n", idx)
print(repr(content[idx2:idx2+30]))
