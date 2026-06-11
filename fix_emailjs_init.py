# -*- coding: utf-8 -*-
path = r"index.html"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Substitui carregamento assíncrono por script síncrono no head
old_emailjs = """(function(){
  const s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js';
  s.onload = () => emailjs.init({ publicKey: CFG.emailjs_public_key });
  document.head.appendChild(s);
})();"""

new_emailjs = """// EmailJS inicializado via head"""

if old_emailjs in content:
    content = content.replace(old_emailjs, new_emailjs)
    print("OK script inline removido!")
else:
    print("ERRO script inline nao encontrado")

# Adiciona script no head antes do </head>
old_head = "</head>"
new_head = """<script src="https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js"></script>
</head>"""

if old_head in content:
    content = content.replace(old_head, new_head, 1)
    print("OK script adicionado no head!")
else:
    print("ERRO head nao encontrado")

# Inicializa emailjs logo apos o CFG
old_init = """};
// ═══════════════════════════════════════════════"""
new_init = """};
emailjs.init({ publicKey: CFG.emailjs_public_key });
// ═══════════════════════════════════════════════"""

if old_init in content:
    content = content.replace(old_init, new_init, 1)
    print("OK init adicionado apos CFG!")
else:
    print("ERRO ponto de init nao encontrado")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
print("Arquivo salvo.")
