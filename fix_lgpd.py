content = open('C:/projetos/beautytech-v2/frontend/src/App.tsx', encoding='utf-8').read()
old = 'await api.post("/consent-forms/" + r.data.id + "/sign"'
new = 'await api.post("/consent-forms/" + r.data.data.id + "/sign"'
if old in content:
    open('C:/projetos/beautytech-v2/frontend/src/App.tsx', 'w', encoding='utf-8').write(content.replace(old, new, 1))
    print('CORRIGIDO')
else:
    print('TRECHO NAO ENCONTRADO')
