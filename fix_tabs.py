content = open('frontend/src/App.tsx', encoding='utf-8').read()

old = '''  const tabStyle = (tab: string) => ({
    padding: "8px 20px",
    borderRadius: 8,
    border: "none",
    cursor: "pointer",
    fontFamily: FB,
    fontSize: 13,
    fontWeight: 600,
    background: activeTab === tab ? C.rose : "transparent",
    color: activeTab === tab ? "#fff" : C.textMuted,
    transition: "all 0.2s",
  });'''

new = '''  const tabStyle = (tab: string) => ({
    padding: "10px 24px",
    borderRadius: 8,
    border: "none",
    cursor: "pointer",
    fontFamily: FB,
    fontSize: 15,
    fontWeight: 700,
    background: activeTab === tab ? C.rose : "transparent",
    color: activeTab === tab ? "#fff" : C.text,
    transition: "all 0.2s",
  });'''

if old in content:
    content = content.replace(old, new)
    print("OK")
else:
    print("NAO ENCONTRADO")

open('frontend/src/App.tsx', 'w', encoding='utf-8').write(content)
