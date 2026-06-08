content = open("frontend/src/App.tsx", encoding="utf-8").read()

# Contar ocorrencias
print("viewMode count:", content.count("viewMode"))

# Mostrar todas as ocorrencias
idx = 0
while True:
    idx = content.find("viewMode", idx)
    if idx < 0: break
    print("---", idx, "---")
    print(content[idx-50:idx+80])
    idx += 1
