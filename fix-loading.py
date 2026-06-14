path = r"C:\projetos\beautytech-v2\frontend\src\App.tsx"
with open(path, "r", encoding="utf-8") as f:
    lines = f.readlines()

# Linha 3227 (idx 3226): restaurar o bloco loading completo
lines[3226] = '  if (loading) return (\n'
lines[3227] = '    <div style={{ minHeight:"100vh", background: C.bg, display:"flex", alignItems:"center", justifyContent:"center" }}>\n'
lines[3228] = '      <div style={{ fontSize:32, color: C.rose, fontFamily: FD }}>BeautyTech</div>\n'
lines[3229] = '    </div>\n'
lines[3230] = '  );\n'

with open(path, "w", encoding="utf-8", newline="\n") as f:
    f.writelines(lines)
print("OK - loading restaurado")
