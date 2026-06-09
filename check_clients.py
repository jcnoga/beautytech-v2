content = open('C:/projetos/beautytech-v2/backend/src/modules/all-modules.ts', encoding='utf-8').read()

# Encontra o POST de clientes
old = '  fastify.post("/clients",'
idx = content.find(old)
print(f"Posicao POST clients: {idx}")

# Pega o trecho do handler ate o primeiro RETURNING
snippet = content[idx:idx+300]
print(repr(snippet))
