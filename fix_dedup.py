content = open("C:/projetos/beautytech-v2/backend/src/modules/all-modules.ts", encoding="utf-8").read()

# Achar o primeiro bloco corrompido e o segundo correto
first = content.find("// CLIENT RECORDS MODULE")
second = content.find("// CLIENT RECORDS MODULE", first + 10)

print("Primeiro em:", first)
print("Segundo em:", second)

# Remover o primeiro bloco (corrompido) - manter apenas o segundo
result = content[:first] + content[second:]

open("C:/projetos/beautytech-v2/backend/src/modules/all-modules.ts", "w", encoding="utf-8").write(result)
print("DONE - linhas:", len(result.split("\n")))
print("Ocorrencias restantes:", result.count("CLIENT RECORDS MODULE"))
print("corrompido:", "sqlSELECT" in result)
