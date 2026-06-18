# -*- coding: utf-8 -*-
path = r"C:\projetos\beautytech-v2\frontend\src\App.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace(
    'clearInterval(checkReturn);\n            setCurrentPage("payment_success");',
    'clearInterval(checkReturn);\n            onPaymentSuccess?.();'
)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("OK")
