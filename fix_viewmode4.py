content = open("frontend/src/App.tsx", encoding="utf-8").read()
idx = content.find("viewMode === \"today\" ? appointmentsApi")
print(content[idx+400:idx+600])
