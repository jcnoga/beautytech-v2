content = open('C:/projetos/beautytech-v2/backend/src/modules/all-modules.ts', encoding='utf-8').read()

old = "    const { salonName, ownerName, email, password, whatsapp, businessType } = req.body as any;"
new = "    const { salonName, ownerName, email, password, whatsapp, businessType, cpfCnpj } = req.body as any;"
content = content.replace(old, new, 1)

old2 = "        businessType: resolvedBusinessType,\n      }).returning();"
new2 = "        businessType: resolvedBusinessType,\n        settings: cpfCnpj ? { cpfCnpj } : {},\n      }).returning();"
content = content.replace(old2, new2, 1)

open('C:/projetos/beautytech-v2/backend/src/modules/all-modules.ts', 'w', encoding='utf-8').write(content)
print('CORRIGIDO')
