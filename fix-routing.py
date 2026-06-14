path = r"C:\projetos\beautytech-v2\frontend\src\App.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = "  const isRootDomain = ['zensalon.com.br','[www.zensalon.com.br](https://www.zensalon.com.br)'].includes(window.location.hostname);\n  if (isRootDomain) return <HomePage />;\n  if (isSubdomain) return <LandingPage />;"

new = "  const isRootDomain = ['zensalon.com.br','www.zensalon.com.br'].includes(window.location.hostname);\n  if (isSuperAdmin) return <SuperAdminApp />;\n  if (isRootDomain) return <HomePage />;\n  if (isSubdomain) return <LandingPage />;"

if old in content:
    content = content.replace(old, new)
    # Remove o isSuperAdmin duplicado mais abaixo
    content = content.replace(
        "  if (isSuperAdmin) return <SuperAdminApp />;",
        "",
        1  # remove apenas a segunda ocorrencia
    )
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(content)
    print("OK - routing corrigido")
else:
    print("ATENCAO - trecho nao encontrado, mostrando contexto:")
    idx = content.find("isRootDomain")
    print(repr(content[max(0,idx-20):idx+300]))
