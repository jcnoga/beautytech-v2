# -*- coding: utf-8 -*-
path = r"index.html"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = """const CFG = {
  emailjs_public_key:  'COLE_SUA_PUBLIC_KEY_AQUI',
  emailjs_service_id:  'COLE_SEU_SERVICE_ID_AQUI',
  emailjs_template_id: 'COLE_SEU_TEMPLATE_ID_AQUI',
  email_destino:    'websitelogx@gmail.com',
  whatsapp_destino: '5534997824990',
  url_cadastro:     'https://beautytech-v2.vercel.app',
};"""

new = """const CFG = {
  emailjs_public_key:  'ZkNs2O6HgMI90_xsu',
  emailjs_service_id:  'service_htsrx6q',
  emailjs_template_id: 'template_yipj2uw',
  emailjs_template_cliente: 'template_rnzenvs',
  email_destino:    'websitelogx@gmail.com',
  whatsapp_destino: '5534997824990',
  url_cadastro:     'https://beautytech-v2.vercel.app',
};"""

if old in content:
    content = content.replace(old, new)
    print("OK CFG atualizado!")
else:
    print("ERRO CFG nao encontrado")

# Atualiza o submit para enviar 2 emails: admin + cliente
old_email = """  const emailjsConfigurado = CFG.emailjs_public_key !== 'COLE_SUA_PUBLIC_KEY_AQUI';
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
  }"""

new_email = """  try {
    const payload = {
      lead_nome:    dados.nome,
      lead_negocio: dados.negocio,
      lead_segmento: dados.segmento,
      lead_whatsapp: dados.whatsapp,
      lead_cidade:  dados.cidade,
      lead_email:   dados.email,
      lead_data:    new Date().toLocaleString('pt-BR'),
      to_email:     CFG.email_destino,
    };
    // Email para admin
    await emailjs.send(CFG.emailjs_service_id, CFG.emailjs_template_id, payload);
    // Email para cliente
    await emailjs.send(CFG.emailjs_service_id, CFG.emailjs_template_cliente, {
      ...payload,
      to_email: dados.email,
    });
  } catch (err) { console.warn('EmailJS:', err); }"""

if old_email in content:
    content = content.replace(old_email, new_email)
    print("OK envio de 2 emails configurado!")
else:
    print("ERRO trecho email nao encontrado")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
print("Arquivo salvo.")
