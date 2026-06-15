content = open('C:/projetos/beautytech-v2/backend/.env', encoding='utf-8').read()
old = "CORS_ORIGINS=http://localhost:5173,http://localhost:5174"
new = "CORS_ORIGINS=http://localhost:5173,http://localhost:5174,https://www.zensalon.com.br,https://beautytech-v2.vercel.app"
if old in content:
    content = content.replace(old, new, 1)
    open('C:/projetos/beautytech-v2/backend/.env', 'w', encoding='utf-8').write(content)
    print("OK - CORS atualizado no .env local")
else:
    print("NAO ENCONTRADO")
