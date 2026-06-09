content = open('C:/projetos/beautytech-v2/frontend/src/App.tsx', encoding='utf-8').read()
old = "        await api.post(\"/consent-forms\", { clientId: lgpdClient.id, type: \"lgpd\", content: \"Autorizo o uso dos meus dados pessoais conforme a LGPD (Lei 13.709/2018).\" });\n        const rGet: any = await api.get(\"/consent-forms/\" + lgpdClient.id);\n        const newForm = Array.isArray(rGet?.data) ? rGet.data[0] : (Array.isArray(rGet) ? rGet[0] : rGet?.data);\n        alert('DEBUG rGet: ' + JSON.stringify(rGet));\n        if (newForm?.id) await api.post(\"/consent-forms/\" + newForm.id + \"/sign\", { signedByName: lgpdClient.fullName });"
new = "        const rPost: any = await api.post(\"/consent-forms\", { clientId: lgpdClient.id, type: \"lgpd\", content: \"Autorizo o uso dos meus dados pessoais conforme a LGPD (Lei 13.709/2018).\" });\n        const newId = rPost?.data?.id ?? rPost?.id;\n        if (newId) await api.post(\"/consent-forms/\" + newId + \"/sign\", { signedByName: lgpdClient.fullName });"
if old in content:
    open('C:/projetos/beautytech-v2/frontend/src/App.tsx', 'w', encoding='utf-8').write(content.replace(old, new, 1))
    print('CORRIGIDO')
else:
    print('TRECHO NAO ENCONTRADO')
