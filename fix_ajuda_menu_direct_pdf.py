path = "frontend/src/App.tsx"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

changes = 0

old_click = '<button key={m.id} onClick={() => { if (locked) { alert("Este recurso requer plano pago. Acesse Planos para fazer upgrade."); return; } setPage(m.id); }}'
new_click = '<button key={m.id} onClick={() => { if (locked) { alert("Este recurso requer plano pago. Acesse Planos para fazer upgrade."); return; } if (m.id === "ajuda") { window.open("/manual/Manual_ZenSalon.pdf", "_blank", "noopener,noreferrer"); return; } setPage(m.id); }}'

if old_click in content:
    content = content.replace(old_click, new_click)
    changes += 1
    print("OK: menu Ajuda agora abre o PDF direto em nova aba")
else:
    print("AVISO: trecho do onClick do menu nao encontrado")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print(f"\nTotal de mudancas aplicadas: {changes}/1")
