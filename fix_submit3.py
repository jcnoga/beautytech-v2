path = r"index.html"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = "  mostrarSucesso();\n\n  // Abre WhatsApp em nova aba e redireciona para cadastro\n  setTimeout(() => {\n    const seg = dados.segmento || 'Salao';\n    const wppMsg = '*Novo Lead BeautyTech (' + seg + ')*\\n\\nNome: ' + dados.nome + '\\nNegocio: ' + dados.negocio + '\\nWhatsApp: ' + dados.whatsapp + '\\nCidade: ' + dados.cidade + '\\nEmail: ' + dados.email + '\\n\\nInteresse em teste gratuito de 15 dias.';\n    const wppUrl = 'https://wa.me/' + CFG.whatsapp_destino + '?text=' + encodeURIComponent(wppMsg);\n    window.open(wppUrl, '_blank');\n  }, 800);\n\n  setTimeout(() => {\n    window.location.href = CFG.url_cadastro + '?tela=cadastro';\n  }, 2500);\n});"

new = "  // Abre WhatsApp imediatamente (dentro do evento de clique - nao bloqueia popup)\n  const seg = dados.segmento || 'Salao';\n  const wppMsg = '*Novo Lead BeautyTech (' + seg + ')*\\n\\nNome: ' + dados.nome + '\\nNegocio: ' + dados.negocio + '\\nWhatsApp: ' + dados.whatsapp + '\\nCidade: ' + dados.cidade + '\\nEmail: ' + dados.email + '\\n\\nInteresse em teste gratuito de 15 dias.';\n  const wppUrl = 'https://wa.me/' + CFG.whatsapp_destino + '?text=' + encodeURIComponent(wppMsg);\n  window.open(wppUrl, '_blank');\n\n  mostrarSucesso();\n\n  // Redireciona para cadastro\n  setTimeout(() => {\n    window.location.href = CFG.url_cadastro + '?tela=cadastro';\n  }, 2500);\n});"

if old in content:
    content = content.replace(old, new)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("OK fluxo corrigido!")
else:
    print("ERRO trecho nao encontrado")
