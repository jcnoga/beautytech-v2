content = open('C:/projetos/beautytech-v2/frontend/src/App.tsx', encoding='utf-8').read()

old = '  const [whatsapp, setWhatsapp] = useState("");\n  const [businessType, setBusinessType] = useState("beauty_salon");'
new = '  const [whatsapp, setWhatsapp] = useState("");\n  const [cpfCnpj, setCpfCnpj] = useState("");\n  const [businessType, setBusinessType] = useState("beauty_salon");'
content = content.replace(old, new, 1)

old2 = 'body: JSON.stringify({ salonName, ownerName, email, password, whatsapp, businessType }),'
new2 = 'body: JSON.stringify({ salonName, ownerName, email, password, whatsapp, businessType, cpfCnpj: cpfCnpj.replace(/\\D/g,"") || undefined }),'
content = content.replace(old2, new2, 1)

if old in content or old2 in content:
    print("ALGUM TRECHO NAO ENCONTRADO")
else:
    open('C:/projetos/beautytech-v2/frontend/src/App.tsx', 'w', encoding='utf-8').write(content)
    print('CORRIGIDO')
