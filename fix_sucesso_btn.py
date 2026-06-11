# -*- coding: utf-8 -*-
path = r"index.html"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = '        Obrigado pelo seu interesse!<br><br>\n        Em breve entraremos em contato pelo WhatsApp informado para liberar seu acesso gratuito de 15 dias. \U0001f338\n      </p>'
new = '        Obrigado! Em breve entraremos em contato pelo WhatsApp informado.\U0001f338<br><br>\n        Enquanto isso, crie sua conta e explore o sistema gratuitamente.\n      </p>\n      <a href="https://beautytech-v2.vercel.app?tela=cadastro" style="display:inline-block;margin-top:20px;background:linear-gradient(135deg,#C9847A,#A05A52);color:#fff;padding:14px 32px;border-radius:100px;font-family:sans-serif;font-weight:700;font-size:1rem;text-decoration:none;">Criar Minha Conta Gratuita \u2192</a>'

if old in content:
    content = content.replace(old, new)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("OK botao adicionado!")
else:
    print("ERRO - trecho exato:")
    idx = content.find("Obrigado pelo seu interesse")
    print(repr(content[idx:idx+200]))
