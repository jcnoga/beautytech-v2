content = open('fix21.py', 'r', encoding='latin-1').read()
code = content.split('content = """')[1].split('"""\nopen(')[0]
open('frontend/src/ProfessionalScheduleModal.tsx', 'w', encoding='utf-8').write(code)
print('OK - size:', len(code))
