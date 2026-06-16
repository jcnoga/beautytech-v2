content = open('fix19.py', 'r', encoding='latin-1').read()
open('backend/src/modules/professionals/professional-schedule.routes.ts', 'w', encoding='utf-8').write(content.split('content = """')[1].split('"""\nopen(')[0])
print('OK')
