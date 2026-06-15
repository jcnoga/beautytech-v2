import os
for root, dirs, files in os.walk(r'C:\projetos\beautytech-v2\frontend\src'):
    for f in files:
        print(os.path.join(root, f))
