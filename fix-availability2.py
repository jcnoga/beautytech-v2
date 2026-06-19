path = r'C:\projetos\beautytech-v2\backend\src\modules\appointments\appointments.routes.ts'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old = '      const dayConfig = wh[dayName];\n      if (!dayConfig || !dayConfig.enabled) {'
new = '      const dayConfig = wh[String(dayOfWeek)] ?? wh[dayName];\n      if (!dayConfig || (!dayConfig.enabled && !dayConfig.isWorking)) {'

if old in content:
    content = content.replace(old, new)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("OK: corrigido")
else:
    print("ERRO: trecho nao encontrado")
    # Debug
    idx = content.find('dayConfig = wh')
    print("Encontrado em:", repr(content[idx-5:idx+60]))
