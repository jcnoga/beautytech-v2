content = open('C:/projetos/beautytech-v2/frontend/src/App.tsx', encoding='utf-8').read()
old = '              <Inp label="WhatsApp" value={whatsapp} onChange={setWhatsapp} type="tel" placeholder="(34) 99999-9999" required />'
new = '              <Inp label="WhatsApp" value={whatsapp} onChange={setWhatsapp} type="tel" placeholder="(34) 99999-9999" required />\n              <Inp label="CPF ou CNPJ" value={cpfCnpj} onChange={setCpfCnpj} placeholder="000.000.000-00 ou 00.000.000/0001-00" />'
if old in content:
    open('C:/projetos/beautytech-v2/frontend/src/App.tsx', 'w', encoding='utf-8').write(content.replace(old, new, 1))
    print('CORRIGIDO')
else:
    print('TRECHO NAO ENCONTRADO')
