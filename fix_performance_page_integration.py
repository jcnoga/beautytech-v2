path = "frontend/src/App.tsx"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

changes = 0

# 1. Adicionar import da PerformancePage (logo apos outros imports de paginas externas)
old_import = 'import { WhatsAppPage as WhatsAppPageComponent } from "./WhatsAppPage";'
new_import = 'import { WhatsAppPage as WhatsAppPageComponent } from "./WhatsAppPage";\nimport PerformancePage from "./PerformancePage";'
if old_import in content:
    content = content.replace(old_import, new_import)
    changes += 1
    print("OK (1/3): import da PerformancePage adicionado")
else:
    print("AVISO (1/3): linha de import de referencia nao encontrada")

# 2. Adicionar item no menu, logo apos o Dashboard
old_menu = """    group: "VISAO GERAL",
    items: [
      { id:"dashboard", label:"Dashboard", icon:"*", premium:false },
    ]
  },"""
new_menu = """    group: "VISAO GERAL",
    items: [
      { id:"dashboard",   label:"Dashboard",   icon:"*", premium:false },
      { id:"performance", label:"Desempenho",  icon:"*", premium:false },
    ]
  },"""
if old_menu in content:
    content = content.replace(old_menu, new_menu)
    changes += 1
    print("OK (2/3): item 'Desempenho' adicionado ao menu")
else:
    print("AVISO (2/3): bloco do menu VISAO GERAL nao encontrado")

# 3. Adicionar ao mapa de paginas (PAGES)
old_pages = """    agenda:        AgendaPage,"""
new_pages = """    agenda:        AgendaPage,
    performance:   () => <PerformancePage C={C} />,"""
if old_pages in content:
    content = content.replace(old_pages, new_pages, 1)
    changes += 1
    print("OK (3/3): rota 'performance' adicionada ao mapa de paginas")
else:
    print("AVISO (3/3): linha 'agenda: AgendaPage,' nao encontrada")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print(f"\nTotal de mudancas aplicadas: {changes}/3")
