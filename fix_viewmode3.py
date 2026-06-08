content = open("frontend/src/App.tsx", encoding="utf-8").read()

# Verificar contexto do useEffect da agenda
idx = content.find("viewMode === \"today\" ? appointmentsApi")
print(content[idx+200:idx+400])
