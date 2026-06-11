# -*- coding: utf-8 -*-
for fname in [r"index.html", r"frontend\public\landing.html"]:
    with open(fname, "r", encoding="utf-8") as f:
        content = f.read()

    # 1 - Botoes maiores e mais destacados
    old_btn = "  .nicho-btn {\n    background: rgba(255,255,255,.08);\n    border: 1px solid rgba(196,169,109,.25);\n    color: rgba(250,246,242,.75);\n    border-radius: 100px;\n    padding: .45rem 1.3rem;\n    cursor: pointer;\n    font-size: .82rem;\n    font-weight: 600;\n    font-family: var(--font-body);\n    letter-spacing: .03em;\n    transition: all .25s;\n  }"

    new_btn = "  .nicho-btn {\n    background: rgba(255,255,255,.08);\n    border: 1px solid rgba(196,169,109,.25);\n    color: rgba(250,246,242,.75);\n    border-radius: 100px;\n    padding: .6rem 1.8rem;\n    cursor: pointer;\n    font-size: .92rem;\n    font-weight: 600;\n    font-family: var(--font-body);\n    letter-spacing: .03em;\n    transition: all .25s;\n  }"

    if old_btn in content:
        content = content.replace(old_btn, new_btn)
        print(f"OK botoes maiores em {fname}!")
    else:
        print(f"ERRO botoes nao encontrados em {fname}")

    # 2 - Estilo para nome destacado no headline
    old_style = "  .hero-headline em { font-style: italic; color: var(--accent); }"
    new_style = "  .hero-headline em { font-style: italic; color: var(--accent); }\n  .nicho-highlight { font-weight: 900; text-decoration: underline; text-underline-offset: 4px; text-decoration-thickness: 3px; font-style: normal; }\n  .nicho-highlight.salao { color: #C9847A; }\n  .nicho-highlight.barbearia { color: #8A7BAF; }\n  .nicho-highlight.estetica { color: #7C9E8F; }"

    if old_style in content:
        content = content.replace(old_style, new_style)
        print(f"OK estilo highlight adicionado em {fname}!")
    else:
        print(f"ERRO estilo nao encontrado em {fname}")

    with open(fname, "w", encoding="utf-8") as f:
        f.write(content)

print("Concluido!")
