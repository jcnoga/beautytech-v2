content = open("frontend/src/App.tsx", encoding="utf-8").read()
idx = content.find("viewMode === \"today\" ? appointmentsApi")
idx2 = content.find("load();\n  }, []);\n\n  const han", idx)
old = "load();\n  }, []);\n\n  const han"
new = "load();\n  }, [viewMode]);\n\n  const han"
result = content[:idx2] + new + content[idx2+len(old):]
open("frontend/src/App.tsx", "w", encoding="utf-8").write(result)
print("DONE")
