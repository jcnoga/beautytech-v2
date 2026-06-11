# -*- coding: utf-8 -*-
path = r"index.html"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# 1 - Corrige o submit: remove redirect automatico, mantem so whatsapp
old_submit = "  window.open(wppUrl, '_blank');\n\n  mostrarSucesso();\n\n  // Redireciona para cadastro\n  setTimeout(() => {\n    window.location.href = CFG.url_cadastro + '?tela=cadastro';\n  }, 2500);\n});"
new_submit = "  window.open(wppUrl, '_blank');\n  mostrarSucesso();\n});"

if old_submit in content:
    content = content.replace(old_submit, new_submit)
    print("OK submit corrigido!")
else:
    print("ERRO submit nao encontrado")

# 2 - Corrige tela de sucesso com link clicavel
old_success = '      <div class="success-icon">\u2713</div>\n      <div class="success-title">Solicita\u00e7\u00e3o Recebida!</div>\n      <p class="success-sub">\n        Obrigado! Em breve entraremos em contato pelo WhatsApp informado.\U0001f338<br><br>\n        Enquanto isso, crie sua conta e explore o sistema gratuitamente.\n      </p>\n      <a href="https://beautytech-v2.vercel.app?tela=cadastro" style="display:inline-block;margin-top:20px;background:linear-gradient(135deg,#C9847A,#A05A52);color:#fff;padding:14px 32px;border-radius:100px;font-family:sans-serif;font-weight:700;font-size:1rem;text-decoration:none;">Criar Minha Conta Gratuita \u2192</a>'
new_success = '      <div class="success-icon">\u2713</div>\n      <div class="success-title">Solicita\u00e7\u00e3o Recebida!</div>\n      <p class="success-sub">\n        Obrigado! Sua mensagem foi enviada pelo WhatsApp e nossa equipe entrara em contato em breve.\U0001f338<br><br>\n        Para come\u00e7ar agora, clique no link abaixo e crie sua conta gratuita:\n      </p>\n      <div style="margin-top:24px;padding:16px;background:#f5f0eb;border-radius:12px;border:1px solid #C9847A40;">\n        <div style="font-size:12px;color:#9B8E87;margin-bottom:8px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;">Seu link de acesso</div>\n        <a href="https://beautytech-v2.vercel.app?tela=cadastro" target="_blank" style="color:#A05A52;font-weight:700;font-size:15px;word-break:break-all;">https://beautytech-v2.vercel.app</a>\n      </div>\n      <a href="https://beautytech-v2.vercel.app?tela=cadastro" target="_blank" style="display:inline-block;margin-top:20px;background:linear-gradient(135deg,#C9847A,#A05A52);color:#fff;padding:14px 32px;border-radius:100px;font-family:sans-serif;font-weight:700;font-size:1rem;text-decoration:none;box-shadow:0 6px 20px rgba(160,90,82,.3);">\U0001f4f2 Criar Minha Conta Gratuita \u2192</a>'

if old_success in content:
    content = content.replace(old_success, new_success)
    print("OK tela de sucesso atualizada!")
else:
    print("ERRO tela de sucesso nao encontrada")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
print("Arquivo salvo.")
