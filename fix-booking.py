import re

with open(r'C:\projetos\beautytech-v2\frontend\src\BookingPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Inicia no passo servico
content = content.replace(
    'const [step, setStep] = useState<Step>("data");',
    'const [step, setStep] = useState<Step>("servico");'
)

# 2. Ordem correta dos steps no indicador visual
content = content.replace(
    '(["data","servico","profissional","dados"] as Step[])',
    '(["servico","profissional","data","dados"] as Step[])'
)
content = content.replace(
    '["data","servico","profissional","dados"].indexOf(step) > i ? `${C.green}30` : C.card2,',
    '["servico","profissional","data","dados"].indexOf(step) > i ? `${C.green}30` : C.card2,'
)
content = content.replace(
    '["data","servico","profissional","dados"].indexOf(step) > i ? C.green : C.textMuted,',
    '["servico","profissional","data","dados"].indexOf(step) > i ? C.green : C.textMuted,'
)
content = content.replace(
    '["data","servico","profissional","dados"].indexOf(step) > i ? C.green : C.border}`,',
    '["servico","profissional","data","dados"].indexOf(step) > i ? C.green : C.border}`,'
)

# 3. Servico -> vai para profissional (ja correto)
# 4. Profissional -> vai para DATA (corrigir: estava indo para "dados")
content = content.replace(
    'onClick={() => { setSelPro(p); setStep("dados"); }}',
    'onClick={() => { setSelPro(p); setStep("data"); }}'
)

# 5. Botao voltar do profissional -> volta para servico (ja correto)

# 6. Data: botao voltar -> profissional; continuar -> dados
content = content.replace(
    '<button onClick={() => setStep("profissional")} style={{...btnStyle(true),background:"transparent",border:`1px solid ${C.border}`,color:C.textMuted,flex:1}}>\n                \u2190 Voltar\n              </button>\n              <button onClick={() => { if (selTime) setStep("servico"); }} disabled={!selTime}',
    '<button onClick={() => setStep("profissional")} style={{...btnStyle(true),background:"transparent",border:`1px solid ${C.border}`,color:C.textMuted,flex:1}}>\n                \u2190 Voltar\n              </button>\n              <button onClick={() => { if (selTime) setStep("dados"); }} disabled={!selTime}'
)

# 7. Dados: botao voltar -> data (ja correto)

with open(r'C:\projetos\beautytech-v2\frontend\src\BookingPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("OK: BookingPage corrigido - ordem: servico > profissional > data > dados")
