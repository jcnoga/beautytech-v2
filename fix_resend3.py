content = open('C:/projetos/beautytech-v2/backend/src/modules/resend.module.ts', encoding='utf-8').read()

old = 'const FROM = `${process.env.RESEND_FROM_NAME [PRO] "ZenSalon"} <${process.env.RESEND_FROM_EMAIL [PRO] "noreply@zensalon.com.br"}>`; '
new = 'const FROM = `${process.env.RESEND_FROM_NAME ?? "ZenSalon"} <${process.env.RESEND_FROM_EMAIL ?? "noreply@zensalon.com.br"}>`; '

if old.strip() in content:
    content = content.replace(old.strip(), new.strip(), 1)
    open('C:/projetos/beautytech-v2/backend/src/modules/resend.module.ts', 'w', encoding='utf-8').write(content)
    print("OK - FROM corrigido")
else:
    # Tenta corrigir por linha
    lines = content.split('\n')
    for i, line in enumerate(lines):
        if 'RESEND_FROM_NAME' in line and '[PRO]' in line:
            lines[i] = 'const FROM = `${process.env.RESEND_FROM_NAME ?? "ZenSalon"} <${process.env.RESEND_FROM_EMAIL ?? "noreply@zensalon.com.br"}>`; '
            print(f"OK - linha {i+1} corrigida")
            break
    content = '\n'.join(lines)
    open('C:/projetos/beautytech-v2/backend/src/modules/resend.module.ts', 'w', encoding='utf-8').write(content)
