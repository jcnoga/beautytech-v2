content = open("frontend/src/App.tsx", encoding="utf-8").read()

# Achar o useEffect da agenda especificamente
idx = content.find("viewMode === \"today\" ? appointmentsApi")
trecho = content[idx:idx+700]
old_dep = "    load();\n  }, [];\n  const"
# Buscar exato
idx2 = content.find("    load();\n  }, [];\n  const", idx)
print("idx2:", idx2)
# Tentar variacao
idx3 = content.find("    load();\n  }, []);\n  const", idx)
print("idx3:", idx3)
print(repr(content[idx3-10:idx3+40]))
