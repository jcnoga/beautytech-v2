path = r"index.html"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

changes = 0

# ============================================================
# 1 — Seletor de nicho em destaque
# ============================================================
old_css = """  .nicho-switcher {
      position: fixed;
      top: 0; left: 0; right: 0;
      z-index: 200;
      letter-spacing: .04em;
      color: rgba(250,246,242,.55);
    }"""

new_css = """  .nicho-switcher {
      position: fixed;
      top: 0; left: 0; right: 0;
      z-index: 200;
      letter-spacing: .04em;
      color: rgba(250,246,242,.85);
      background: linear-gradient(135deg, rgba(28,25,23,.97), rgba(44,36,30,.97));
      border-bottom: 1px solid rgba(196,169,109,.25);
      padding: .75rem 1.5rem;
      box-shadow: 0 2px 20px rgba(0,0,0,.4);
      font-size: .9rem;
      font-weight: 600;
    }"""

if old_css in content:
    content = content.replace(old_css, new_css)
    changes += 1
    print("✅ CSS do switcher atualizado!")
else:
    print("⚠️  CSS do switcher não encontrado — ajuste manual necessário.")

# Botões do seletor
old_btn_css = """  .nicho-btn {
      background: rgba(255,255,255,.07);
      border: 1px solid rgba(255,255,255,.12);
      color: rgba(250,246,242,.7);
      font-family: var(--font-body);
      transition: all .2s;
    }"""

new_btn_css = """  .nicho-btn {
      background: rgba(255,255,255,.08);
      border: 1px solid rgba(196,169,109,.3);
      color: rgba(250,246,242,.85);
      font-family: var(--font-body);
      font-size: .85rem;
      font-weight: 600;
      padding: .5rem 1.2rem;
      border-radius: 50px;
      cursor: pointer;
      transition: all .25s;
      letter-spacing: .03em;
    }"""

if old_btn_css in content:
    content = content.replace(old_btn_css, new_btn_css)
    changes += 1
    print("✅ CSS dos botões atualizado!")
else:
    print("⚠️  CSS dos botões não encontrado.")

# Botão ativo
old_active = """  .nicho-btn:hover, .nicho-btn.active {
      background: var(--accent);
      border-color: var(--accent);
      color: #fff;"""

new_active = """  .nicho-btn:hover, .nicho-btn.active {
      background: linear-gradient(135deg, var(--gold), var(--accent));
      border-color: var(--gold);
      color: #fff;
      box-shadow: 0 0 16px rgba(196,169,109,.45);
      transform: translateY(-1px);"""

if old_active in content:
    content = content.replace(old_active, new_active)
    changes += 1
    print("✅ CSS do botão ativo atualizado!")
else:
    print("⚠️  CSS do botão ativo não encontrado.")

# Texto do seletor
old_span = """  .nicho-switcher span { color: rgba(250,246,242,.4); }"""
new_span = """  .nicho-switcher span { color: rgba(196,169,109,.9); font-weight: 700; letter-spacing: .06em; font-size: .78rem; text-transform: uppercase; }"""

if old_span in content:
    content = content.replace(old_span, new_span)
    changes += 1
    print("✅ CSS do label atualizado!")
else:
    print("⚠️  CSS do label não encontrado.")

# ============================================================
# 2 — CFG: WhatsApp configurado
# ============================================================
old_cfg = """const CFG = {
    emailjs_public_key:  'COLE_SUA_PUBLIC_KEY_AQUI',
    emailjs_service_id:  'COLE_SEU_SERVICE_ID_AQUI',
    emailjs_template_id: 'COLE_SEU_TEMPLATE_ID_AQUI',
  }"""

new_cfg = """const CFG = {
    emailjs_public_key:  'COLE_SUA_PUBLIC_KEY_AQUI',
    emailjs_service_id:  'COLE_SEU_SERVICE_ID_AQUI',
    emailjs_template_id: 'COLE_SEU_TEMPLATE_ID_AQUI',
    whatsapp:            '5534997824990',
    email_destino:       'contato@beautytech.com.br',
    url_cadastro:        'https://beautytech-v2.vercel.app',
  }"""

if old_cfg in content:
    content = content.replace(old_cfg, new_cfg)
    changes += 1
    print("✅ CFG atualizado com WhatsApp e URL de cadastro!")
else:
    print("⚠️  CFG não encontrado.")

# ============================================================
# 3 — Função enviarWhatsApp + redirect para cadastro
# ============================================================
old_submit = """  submitBtn.disabled = true;
  submitBtn.textContent = 'â³ Enviando...';
  const emailjsConfigurado = CFG.emailjs_public_key !== 'COLE_SUA_PUBLIC_KEY_AQUI';
  if (emailjsConfigurado) {
    try {
      await emailjs.send(CFG.emailjs_service_id, CFG.emailjs_template_id, {
        to_email:        CFG.email_destino,
        lead_nome:       dados.nome,
        lead_negocio:    dados.negocio,
        lead_segmento:   dados.segmento,
        lead_whatsapp:   dados.whatsapp,
        lead_cidade:     dados.cidade,
        lead_email:      dados.email,
        lead_data:       new Date().toLocaleString('pt-BR'),
      });
    } catch (err) {
      enviarWhatsApp(dados);
    }
  } else {
    enviarWhatsApp(dados);
  }
  mostrarSucesso();"""

new_submit = """  submitBtn.disabled = true;
  submitBtn.textContent = '⏳ Enviando...';

  // Monta mensagem WhatsApp
  const msg = encodeURIComponent(
    `Olá! Tenho interesse no BeautyTech.\\n\\n` +
    `👤 Nome: ${dados.nome}\\n` +
    `🏪 Negócio: ${dados.negocio}\\n` +
    `📋 Segmento: ${dados.segmento}\\n` +
    `📱 WhatsApp: ${dados.whatsapp}\\n` +
    `📍 Cidade: ${dados.cidade}\\n` +
    `📧 E-mail: ${dados.email}\\n\\n` +
    `Quero conhecer o sistema e começar o teste gratuito!`
  );
  const wppUrl = `https://wa.me/${CFG.whatsapp}?text=${msg}`;

  const emailjsConfigurado = CFG.emailjs_public_key !== 'COLE_SUA_PUBLIC_KEY_AQUI';
  if (emailjsConfigurado) {
    try {
      await emailjs.send(CFG.emailjs_service_id, CFG.emailjs_template_id, {
        to_email:        CFG.email_destino,
        lead_nome:       dados.nome,
        lead_negocio:    dados.negocio,
        lead_segmento:   dados.segmento,
        lead_whatsapp:   dados.whatsapp,
        lead_cidade:     dados.cidade,
        lead_email:      dados.email,
        lead_data:       new Date().toLocaleString('pt-BR'),
      });
    } catch (err) { /* silencioso */ }
  }

  mostrarSucesso();

  // Abre WhatsApp e redireciona para cadastro
  setTimeout(() => {
    window.open(wppUrl, '_blank');
  }, 800);
  setTimeout(() => {
    window.location.href = CFG.url_cadastro;
  }, 2500);"""

if old_submit in content:
    content = content.replace(old_submit, new_submit)
    changes += 1
    print("✅ Formulário atualizado com WhatsApp + redirect!")
else:
    print("⚠️  Trecho do submit não encontrado.")

# ============================================================
# Salva
# ============================================================
with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print(f"\n🎯 Script concluído — {changes}/6 alterações aplicadas.")
