# -*- coding: utf-8 -*-
for fname in [r"index.html", r"frontend\public\landing.html"]:
    with open(fname, "r", encoding="utf-8") as f:
        content = f.read()

    old = "  .nicho-btn:hover {\n    background: rgba(196,169,109,.2);\n    border-color: rgba(196,169,109,.5);\n    color: #fff;\n    transform: translateY(-1px);\n  }\n  .nicho-btn.active {\n    background: linear-gradient(135deg, var(--gold) 0%, var(--accent) 100%);\n    border-color: var(--gold);\n    color: #fff;\n    box-shadow: 0 0 18px rgba(196,169,109,.5), 0 4px 12px rgba(0,0,0,.3);\n    transform: translateY(-1px);\n  }"

    new = "  .nicho-btn:hover {\n    background: rgba(196,169,109,.2);\n    border-color: rgba(196,169,109,.5);\n    color: #fff;\n    transform: translateY(-1px);\n  }\n  .nicho-btn.active {\n    background: linear-gradient(135deg, #C4A96D 0%, #C9847A 100%);\n    border-color: #fff;\n    color: #fff;\n    box-shadow: 0 0 28px rgba(196,169,109,.8), 0 4px 16px rgba(0,0,0,.4);\n    transform: translateY(-2px) scale(1.08);\n    font-weight: 800;\n    text-decoration: underline;\n    text-underline-offset: 4px;\n    text-decoration-thickness: 2px;\n    font-size: .92rem;\n    letter-spacing: .04em;\n  }"

    if old in content:
        content = content.replace(old, new)
        with open(fname, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"OK {fname} atualizado!")
    else:
        print(f"ERRO {fname} nao encontrado")
