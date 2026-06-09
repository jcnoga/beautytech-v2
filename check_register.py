content = open('C:/projetos/beautytech-v2/backend/src/modules/all-modules.ts', encoding='utf-8').read()
old = '      return reply.status(201).send({'
new = '      console.log("[REGISTER] tenant criado:", tenant?.id);\n      return reply.status(201).send({'
# Busca a primeira ocorrencia no contexto do register
idx = content.find('if (!json.success) throw new Error(json.error)')
print(f"Nao encontrado no lugar esperado")
# Busca o catch do register
idx2 = content.find('} catch (e: any) {\n      setError(e.message)')
print(f"Catch frontend: {idx2}")
# Busca no backend
idx3 = content.find('Salao cadastrado com sucesso')
print(f"Posicao sucesso: {idx3}")
print(repr(content[max(0,idx3-300):idx3]))
