content = open('C:/projetos/beautytech-v2/frontend/src/App.tsx', encoding='utf-8').read()
old = "        const newForm = Array.isArray(rGet?.data) ? rGet.data[0] : rGet?.data;\n        if (newForm?.id) await api.post(\"/consent-forms/\" + newForm.id + \"/sign\", { signedByName: lgpdClient.fullName });"
new = "        const newForm = Array.isArray(rGet?.data) ? rGet.data[0] : (Array.isArray(rGet) ? rGet[0] : rGet?.data);\n        alert('DEBUG: ' + JSON.stringify(newForm));\n        if (newForm?.id) await api.post(\"/consent-forms/\" + newForm.id + \"/sign\", { signedByName: lgpdClient.fullName });"
if old in content:
    open('C:/projetos/beautytech-v2/frontend/src/App.tsx', 'w', encoding='utf-8').write(content.replace(old, new, 1))
    print('CORRIGIDO')
else:
    print('TRECHO NAO ENCONTRADO')
