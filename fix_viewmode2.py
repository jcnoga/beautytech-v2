content = open("frontend/src/App.tsx", encoding="utf-8").read()
old = "    load();\n  }, [viewMode]);\n  if (loading) return (\n    <div style={{ display:\"flex\", alignItems:\"center\""
new = "    load();\n  }, []);\n  if (loading) return (\n    <div style={{ display:\"flex\", alignItems:\"center\""
result = content.replace(old, new, 1)
open("frontend/src/App.tsx", "w", encoding="utf-8").write(result)
print("DONE" if old not in result else "NAO SUBSTITUIU")
