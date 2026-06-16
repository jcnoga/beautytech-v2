content = open('backend/src/modules/appointments/appointments.routes.ts', 'r', encoding='latin-1').read()
print('blocks found:', content.count('professional_blocks'))
print('available found:', content.count('const available = slots.filter'))
