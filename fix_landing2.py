path = r"index.html"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

changes = 0

# ============================================================
# 1 — Seletor de nicho: mais destaque visual
# ============================================================
old_switcher = """.nicho-switcher {
    position: fixed;
    top: 0; left: 0; right: 0;
    z-index: 200;
    background: var(--charcoal);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: .5rem;
    padding: .45rem 1rem;
    font-size: .72rem;
    font-weight: 500;
    letter-spacing: .04em;
    color: rgba(250,246,242,.55);
  }"""

new_switcher = """.nicho-switcher {
    position: fixed;
    top: 0; left: 0; right: 0;
    z-index: 200;
    background: linear-gradient(135deg, #1a1410 0%, #2a1f14 50%, #1a1410 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: .75rem;
    padding: .75rem 1.5rem;
    font-size: .78rem;
    font-weight: 500;
    letter-spacing: .04em;
    color: rgba(250,246,242,.8);
    border-bottom: 1px solid rgba(196,169,109,.3);
    box-shadow: 0 2px 24px rgba(0,0,0,.5);
  }"""

if old_switcher in content:
    content = content.replace(old_switcher, new_switcher)
    changes += 1
    print("✅ 1/4 — Fundo do switcher atualizado!")
else:
    print("⚠️  1/4 — Fundo do switcher não encontrado.")

# ============================================================
# 2 — Botões do seletor: maior e mais vistoso
# ============================================================
old_btn = """.nicho-btn {
    background: rgba(255,255,255,.07);
    border: 1px solid rgba(255,255,255,.12);
    color: rgba(250,246,242,.7);
    border-radius: 100px;
    padding: .25rem .85rem;
    cursor: pointer;
    font-size: .72rem;
    font-family: var(--font-body);
    transition: all .2s;
  }
  .nicho-btn:hover, .nicho-btn.active {
    background: var(--accent);
    border-color: var(--accent);
    color: #fff;
  }"""

new_btn = """.nicho-btn {
    background: rgba(255,255,255,.08);
    border: 1px solid rgba(196,169,109,.25);
    color: rgba(250,246,242,.75);
    border-radius: 100px;
    padding: .45rem 1.3rem;
    cursor: pointer;
    font-size: .82rem;
    font-weight: 600;
    font-family: var(--font-body);
    letter-spacing: .03em;
    transition: all .25s;
  }
  .nicho-btn:hover {
    background: rgba(196,169,109,.2);
    border-color: rgba(196,169,109,.5);
    color: #fff;
    transform: translateY(-1px);
  }
  .nicho-btn.active {
    background: linear-gradient(135deg, var(--gold) 0%, var(--accent) 100%);
    border-color: var(--gold);
    color: #fff;
    box-shadow: 0 0 18px rgba(196,169,109,.5), 0 4px 12px rgba(0,0,0,.3);
    transform: translateY(-1px);
  }"""

if old_btn in content:
    content = content.replace(old_btn, new_btn)
    changes += 1
    print("✅ 2/4 — Botões do seletor atualizados!")
else:
    print("⚠️  2/4 — Botões não encontrados.")

# ============================================================
# 3 — Label "Selecione seu segmento" mais destacado
# ============================================================
old_span = """  .nicho-switcher span { color: rgba(196,169,109,.9); font-weight: 700; letter-spacing: .06em; font-size: .78rem; text-transform: uppercase; }"""

new_span = """  .nicho-switcher span { color: rgba(196,169,109,1); font-weight: 700; letter-spacing: .1em; font-size: .72rem; text-transform: uppercase; margin-right: .25rem; }"""

if old_span in content:
    content = content.replace(old_span, new_span)
    changes += 1
    print("✅ 3/4 — Label atualizado!")
else:
    print("⚠️  3/4 — Label não encontrado.")

# ============================================================
# 4 — Formulário: WhatsApp + redirect para cadastro
# ============================================================
old_cfg = """const CFG = {
  emailjs_public_key:  'COLE_SUA_PUBLIC_KEY_AQUI',
  emailjs_service_id:  'COLE_SEU_SERVICE_ID_AQUI',
  emailjs_template_id: 'COLE_SEU_TEMPLATE_ID_AQUI',
  email_destino:    'websitelogx@gmail.com',
  whatsapp_destino: '5534997824990',
};"""

new_cfg = """const CFG = {
  emailjs_public_key:  'COLE_SUA_PUBLIC_KEY_AQUI',
  emailjs_service_id:  'COLE_SEU_SERVICE_ID_AQUI',
  emailjs_template_id: 'COLE_SEU_TEMPLATE_ID_AQUI',
  email_destino:    'websitelogx@gmail.com',
  whatsapp_destino: '5534997824990',
  url_cadastro:     'https://beautytech-v2.vercel.app',
};"""

if old_cfg in content:
    content = content.replace(old_cfg, new_cfg)
    changes += 1
    print("✅ 4/4 — CFG atualizado com url_cadastro!")
else:
    print("⚠️  4/4 — CFG não encontrado.")

# ============================================================
# 5 — Submit: redirect para cadastro após envio
# ============================================================
old_submit = """  mostrarSucesso();
});
</script>"""

new_submit = """  mostrarSucesso();

  // Abre WhatsApp com os dados do lead
  setTimeout(() => {
    enviarWhatsApp(dados);
  }, 900);

  // Redireciona para cadastro no sistema
  setTimeout(() => {
    window.location.href = CFG.url_cadastro;
  }, 3000);
});
</script>"""

if old_submit in content:
    content = content.replace(old_submit, new_submit)
    changes += 1
    print("✅ 5/5 — Redirect pós-formulário adicionado!")
else:
    print("⚠️  5/5 — Trecho do submit não encontrado.")

# ============================================================
# Salva
# ============================================================
with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print(f"\n🎯 Concluído — {changes}/5 alterações aplicadas.")
