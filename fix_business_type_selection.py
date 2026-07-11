import re

path = "frontend/src/App.tsx"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

changes = 0

# 1. Remover pré-seleção padrão
old_state = '  const [businessType, setBusinessType] = useState("beauty_salon");'
new_state = '  const [businessType, setBusinessType] = useState("");'
if old_state in content:
    content = content.replace(old_state, new_state)
    changes += 1
    print("OK: valor padrao removido (nenhuma opcao pre-selecionada)")
else:
    print("AVISO: linha do useState nao encontrada")

# 2. Corrigir icones corrompidos (??)
old_icons = '{[{v:"beauty_salon",l:"Salao de Beleza",i:"??"},{v:"aesthetics_clinic",l:"Clinica de Estetica",i:"??"},{v:"barbershop",l:"Barbearia",i:"??"}].map(opt => ('
new_icons = '{[{v:"beauty_salon",l:"Salao de Beleza",i:"\U0001F487"},{v:"aesthetics_clinic",l:"Clinica de Estetica",i:"\U0001F486"},{v:"barbershop",l:"Barbearia",i:"\U0001FA92"}].map(opt => ('
if old_icons in content:
    content = content.replace(old_icons, new_icons)
    changes += 1
    print("OK: icones corrigidos")
else:
    print("AVISO: linha dos icones nao encontrada")

# 3. Bloquear envio sem selecao explicita
old_submit = '''  const submit = async () => {
    setLoading(true); setError(""); setSuccess("");
    try {'''
new_submit = '''  const submit = async () => {
    setLoading(true); setError(""); setSuccess("");
    if (!businessType) {
      setError("Selecione o tipo de negocio antes de continuar.");
      setLoading(false);
      return;
    }
    try {'''
if old_submit in content:
    content = content.replace(old_submit, new_submit)
    changes += 1
    print("OK: validacao de bloqueio adicionada")
else:
    print("AVISO: bloco do submit nao encontrado")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print(f"\nTotal de mudancas aplicadas: {changes}/3")