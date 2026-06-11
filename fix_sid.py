# -*- coding: utf-8 -*-
for fname in [r"index.html", r"frontend\public\landing.html"]:
    with open(fname, "r", encoding="utf-8") as f:
        content = f.read()
    content = content.replace("service_pis825m", "service_70lgemm")
    content = content.replace("service_htsrx6q", "service_70lgemm")
    with open(fname, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"OK {fname} atualizado!")
