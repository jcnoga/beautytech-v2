original = open('C:/projetos/beautytech-v2/backend/src/modules/all-modules_original.ts', encoding='utf-16').read()
correct_modules = open('C:/projetos/beautytech-v2/backend/src/modules/all-modules.ts', encoding='utf-8').read()
start = correct_modules.find('// CLIENT RECORDS MODULE')
end = correct_modules.find("export { whatsappModule }")
modules_block = correct_modules[start:end]
print('--- PRIMEIROS 300 chars dos modulos ---')
print(modules_block[:300])
print('--- LINHA COM clientId ---')
for i, line in enumerate(modules_block.split('\n')):
    if 'client_records' in line:
        print(f"{i}: {line[:100]}")
        break
