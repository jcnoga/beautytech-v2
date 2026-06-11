path = r"index.html"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = """  mostrarSucesso();

  // Abre WhatsApp com os dados do lead
  setTimeout(() => {
    enviarWhatsApp(dados);
  }, 900);

  // Redireciona para cadastro no sistema
  setTimeout(() => {
    window.location.href = CFG.url_cadastro;
  }, 3000);
});"""

new = """  // Monta mensagem WhatsApp
  const seg = dados.segmento || 'Salao';
  const emoji = seg.includes('Barbe') ? 'xE2x9Cx82' : seg.includes('Est') ? 'xE2x9Cx85' : 'xF0x9Fx8CxB8';
  const wppMsg = emoji + ' *Novo Lead BeautyTech (' + seg + ')*\\n\\n' +
    'Nome: ' + dados.nome + '\\n' +
    'Negocio: ' + dados.negocio + '\\n' +
    'WhatsApp: ' + dados.whatsapp + '\\n' +
    'Cidade: ' + dados.cidade + '\\n' +
    'Email: ' + dados.email + '\\n\\n' +
    'Interesse em teste gratuito de 15 dias.';
  const wppUrl = 'https://wa.me/' + CFG.whatsapp_destino + '?text=' + encodeURIComponent(wppMsg);

  mostrarSucesso();

  // Abre WhatsApp em nova aba e redireciona pagina atual para cadastro
  setTimeout(() => {
    window.open(wppUrl, '_blank');
    setTimeout(() => {
      window.location.href = CFG.url_cadastro;
    }, 1500);
  }, 1000);
});"""

if old in content:
    content = content.replace(old, new)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("OK fluxo corrigido!")
else:
    print("ERRO trecho nao encontrado")
