# -*- coding: utf-8 -*-
path = r"C:\projetos\beautytech-v2\frontend\src\LandingPageSobre.tsx"

with open(path, "rb") as f:
    raw = f.read()

# Substitui bytes corrompidos
raw = raw.replace(b"\xe2\x80\x94", b"-")   # travessao em UTF-8
raw = raw.replace(b"\xe2\x9c\x93", b"+")   # checkmark em UTF-8
raw = raw.replace(b"\xc3\xa2\xe2\x82\xac\xe2\x80\x9d", b"-")   # travessao duplo corrompido
raw = raw.replace(b"\xc3\xa2\xc5\x93\xe2\x80\x9c", b"+")       # checkmark corrompido

with open(path, "wb") as f:
    f.write(raw)

print("OK")
