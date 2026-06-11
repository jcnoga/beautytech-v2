# -*- coding: utf-8 -*-
for fname in [r"index.html", r"frontend\public\landing.html"]:
    with open(fname, "r", encoding="utf-8") as f:
        content = f.read()

    # SALAO - destaca Salao de Beleza
    old_s = 'headline:    \'Transforme sua <span style="color:#C8BFB9;">Clínica de Estética</span>, <span style="color:#C9847A;font-weight:700;">Salão de Beleza</span> ou <span style="color:#C8BFB9;">Barbearia</span>'
    new_s = 'headline:    \'Transforme sua <span style="color:#C8BFB9;font-weight:400;">Clínica de Estética</span>, <span style="color:#C9847A;font-weight:900;text-decoration:underline;text-underline-offset:5px;text-decoration-thickness:3px;font-size:1.08em;">Salão de Beleza</span> ou <span style="color:#C8BFB9;font-weight:400;">Barbearia</span>'

    # BARBEARIA - destaca Barbearia
    old_b = 'headline:    \'Transforme sua <span style="color:#C8BFB9;">Clínica de Estética</span>, <span style="color:#C8BFB9;">Salão de Beleza</span> ou <span style="color:#8A7BAF;font-weight:700;">Barbearia</span>'
    new_b = 'headline:    \'Transforme sua <span style="color:#C8BFB9;font-weight:400;">Clínica de Estética</span>, <span style="color:#C8BFB9;font-weight:400;">Salão de Beleza</span> ou <span style="color:#8A7BAF;font-weight:900;text-decoration:underline;text-underline-offset:5px;text-decoration-thickness:3px;font-size:1.08em;">Barbearia</span>'

    # ESTETICA - destaca Clinica de Estetica
    old_e = 'headline:    \'Transforme sua <span style="color:#7C9E8F;font-weight:700;">Clínica de Estética</span>, <span style="color:#C8BFB9;">Salão de Beleza</span> ou <span style="color:#C8BFB9;">Barbearia</span>'
    new_e = 'headline:    \'Transforme sua <span style="color:#7C9E8F;font-weight:900;text-decoration:underline;text-underline-offset:5px;text-decoration-thickness:3px;font-size:1.08em;">Clínica de Estética</span>, <span style="color:#C8BFB9;font-weight:400;">Salão de Beleza</span> ou <span style="color:#C8BFB9;font-weight:400;">Barbearia</span>'

    c = 0
    for old, new in [(old_s, new_s), (old_b, new_b), (old_e, new_e)]:
        if old in content:
            content = content.replace(old, new)
            c += 1

    with open(fname, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"OK {fname} - {c}/3 substituicoes!")

print("Concluido!")
