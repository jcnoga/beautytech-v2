content = open('C:/projetos/beautytech-v2/backend/src/modules/all-modules.ts', encoding='utf-8').read()

# Mostra imports existentes relacionados ao resend
for i, line in enumerate(content.split('\n')[:30], 1):
    if 'resend' in line.lower() or ('import' in line.lower() and 'send' in line.lower()):
        print(f"linha {i}: {line}")
