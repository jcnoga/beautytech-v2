# -*- coding: utf-8 -*-
import io

path = r"frontend\src\App.tsx"
content = io.open(path, encoding="utf-8").read()

changes_made = []

# 1) Adiciona novo estado defaultTrialDays logo apos o estado trialDays
old1 = '  const [trialDays, setTrialDays] = useState("15");'
new1 = '''  const [trialDays, setTrialDays] = useState("15");
  const [defaultTrialDays, setDefaultTrialDays] = useState("15");'''
if content.count(old1) == 1:
    content = content.replace(old1, new1, 1)
    changes_made.append("estado defaultTrialDays adicionado")
else:
    print(f"AVISO - passo 1: ancora encontrada {content.count(old1)} vezes (esperado 1)")

# 2) Adiciona useEffect que busca o trial_days configurado, logo apos a definicao de saFetch
old2 = '''    return res.json();
  };

  const loadLogs = async () => {'''
new2 = '''    return res.json();
  };

  useEffect(() => {
    saFetch("GET", "/super-admin/plan-settings").then((r: any) => {
      const rows = r?.data ?? [];
      const found = rows.find((row: any) => row.key === "trial_days");
      if (found?.value !== undefined) setDefaultTrialDays(String(found.value));
    }).catch(() => {});
  }, []);

  const loadLogs = async () => {'''
if content.count(old2) == 1:
    content = content.replace(old2, new2, 1)
    changes_made.append("useEffect de busca do trial_days adicionado")
else:
    print(f"AVISO - passo 2: ancora encontrada {content.count(old2)} vezes (esperado 1)")

# 3) Troca os setTrialDays("15") fixos por setTrialDays(defaultTrialDays)
old3 = 'setTrialDays("15")'
count3 = content.count(old3)
if count3 >= 1:
    content = content.replace(old3, "setTrialDays(defaultTrialDays)")
    changes_made.append(f"{count3} ocorrencia(s) de setTrialDays(\"15\") trocadas")
else:
    print("AVISO - passo 3: nenhuma ocorrencia de setTrialDays(\"15\") encontrada")

# 4) Troca o placeholder fixo "15" pelo valor dinamico
old4 = '<Inp label="Dias de trial" value={trialDays} onChange={setTrialDays} type="number" placeholder="15" />'
new4 = '<Inp label="Dias de trial" value={trialDays} onChange={setTrialDays} type="number" placeholder={defaultTrialDays} />'
if content.count(old4) == 1:
    content = content.replace(old4, new4, 1)
    changes_made.append("placeholder do campo atualizado")
else:
    print(f"AVISO - passo 4: ancora encontrada {content.count(old4)} vezes (esperado 1)")

if len(changes_made) == 4:
    io.open(path, "w", encoding="utf-8").write(content)
    print("OK - todas as 4 alteracoes aplicadas:")
    for c in changes_made:
        print(f"  - {c}")
else:
    print(f"ERRO - apenas {len(changes_made)}/4 alteracoes aplicadas. Nada foi salvo, revisar manualmente.")
