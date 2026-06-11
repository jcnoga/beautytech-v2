path = r"index.html"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = "  const emailjsConfigurado = CFG.emailjs_public_key !== 'COLE_SUA_PUBLIC_KEY_AQUI';\n  if (emailjsConfigurado) {\n    try {\n      await emailjs.send(CFG.emailjs_service_id, CFG.emailjs_template_id, {\n        to_email:        CFG.email_destino,\n        lead_nome:       dados.nome,\n        lead_negocio:    dados.negocio,\n        lead_segmento:   dados.segmento,\n        lead_whatsapp:   dados.whatsapp,\n        lead_cidade:     dados.cidade,\n        lead_email:      dados.email,\n        lead_data:       new Date().toLocaleString('pt-BR'),\n      });\n    } catch (err) {\n      enviarWhatsApp(dados);\n    }\n  } else {\n    enviarWhatsApp(dados);\n  }"

new = "  const emailjsConfigurado = CFG.emailjs_public_key !== 'COLE_SUA_PUBLIC_KEY_AQUI';\n  if (emailjsConfigurado) {\n    try {\n      await emailjs.send(CFG.emailjs_service_id, CFG.emailjs_template_id, {\n        to_email:        CFG.email_destino,\n        lead_nome:       dados.nome,\n        lead_negocio:    dados.negocio,\n        lead_segmento:   dados.segmento,\n        lead_whatsapp:   dados.whatsapp,\n        lead_cidade:     dados.cidade,\n        lead_email:      dados.email,\n        lead_data:       new Date().toLocaleString('pt-BR'),\n      });\n    } catch (err) { /* silencioso */ }\n  }"

if old in content:
    content = content.replace(old, new)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("OK chamadas duplicadas removidas!")
else:
    print("ERRO trecho nao encontrado")
