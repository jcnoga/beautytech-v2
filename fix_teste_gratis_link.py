import re

path = "frontend/src/HomePage.tsx"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Botão do menu (header)
old_menu = '''<button className="zs-btn-primary" onClick={() => scrollTo("cadastro")}>
              Teste Grátis
            </button>'''
new_menu = '''<a className="zs-btn-primary" href="https://beautytech-v2.vercel.app" style={{ textDecoration: "none" }}>
              Teste Grátis
            </a>'''

# Botão do hero (CTA principal)
old_hero = '''<button className="zs-btn-primary" onClick={() => scrollTo("cadastro")}>
            Iniciar Teste Grátis de {trialDays} Dias
          </button>'''
new_hero = '''<a className="zs-btn-primary" href="https://beautytech-v2.vercel.app" style={{ textDecoration: "none" }}>
            Iniciar Teste Grátis de {trialDays} Dias
          </a>'''

if old_menu not in content:
    print("AVISO: bloco do menu não encontrado — verifique indentação")
else:
    content = content.replace(old_menu, new_menu)
    print("Botão do menu atualizado.")

if old_hero not in content:
    print("AVISO: bloco do hero não encontrado — verifique indentação")
else:
    content = content.replace(old_hero, new_hero)
    print("Botão do hero atualizado.")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("Concluído.")