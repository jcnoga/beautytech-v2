import os
for root, dirs, files in os.walk(r'C:\projetos\beautytech-v2\frontend\src'):
    for f in files:
        if 'super' in f.lower() or 'admin' in f.lower():
            print(os.path.join(root, f))
