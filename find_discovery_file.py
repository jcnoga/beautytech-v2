import os
for root, dirs, files in os.walk(r'C:\projetos\beautytech-v2\backend\src'):
    for f in files:
        path = os.path.join(root, f)
        with open(path, 'r', encoding='utf-8', errors='ignore') as fh:
            content = fh.read()
        if 'discovery' in content or 'public/tenants' in content:
            print(path)
