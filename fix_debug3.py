content = open('C:/projetos/beautytech-v2/frontend/src/App.tsx', encoding='utf-8').read()
old = "        alert('DEBUG: ' + JSON.stringify(newForm));"
new = "        alert('DEBUG rGet: ' + JSON.stringify(rGet));"
if old in content:
    open('C:/projetos/beautytech-v2/frontend/src/App.tsx', 'w', encoding='utf-8').write(content.replace(old, new, 1))
    print('CORRIGIDO')
else:
    print('TRECHO NAO ENCONTRADO')
