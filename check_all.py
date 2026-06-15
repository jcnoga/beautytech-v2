path = r'C:\projetos\beautytech-v2\backend\src\modules\all-modules.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()
print('checkProfessionalLimit:', 'SIM' if 'checkProfessionalLimit' in content else 'NAO')
print('checkClientLimit:', 'SIM' if 'checkClientLimit' in content else 'NAO')
print('PLAN_LIMITS import:', 'SIM' if 'plan-limits' in content else 'NAO')

path2 = r'C:\projetos\beautytech-v2\backend\src\db\schema\index.ts'
with open(path2, 'r', encoding='utf-8') as f:
    content2 = f.read()
print('maxProfessionals no schema:', 'SIM' if 'maxProfessionals' in content2 else 'NAO')

path3 = r'C:\projetos\beautytech-v2\backend\src\config\plan-limits.ts'
import os
print('plan-limits.ts existe:', 'SIM' if os.path.exists(path3) else 'NAO')
