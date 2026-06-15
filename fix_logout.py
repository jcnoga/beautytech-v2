content = open('C:/projetos/beautytech-v2/frontend/src/App.tsx', encoding='utf-8').read()
old = "const logout = async () => {\n  await supabase.auth.signOut();\n  setUser(null);\n  setToken(null);"
new = "const logout = async () => {\n  await supabase.auth.signOut();\n  setUser(null);"
if old in content:
    content = content.replace(old, new, 1)
    open('C:/projetos/beautytech-v2/frontend/src/App.tsx', 'w', encoding='utf-8').write(content)
    print("OK - corrigido")
else:
    print("NAO ENCONTRADO - cole o trecho exato do logout aqui")
