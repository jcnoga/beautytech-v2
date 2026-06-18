# -*- coding: utf-8 -*-
path = r"C:\projetos\beautytech-v2\frontend\src\ProfessionalScheduleModal.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Adiciona funcao replicateMonthBlocks apos addBlock
old = "  const removeBlock = async (blockId: string) => {"
new = """  const replicateMonthBlocks = async () => {
    if (!confirm("Isso vai criar bloqueios para todos os dias de folga do mes atual. Continuar?")) return;
    setSaving(true);
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let created = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dow = date.getDay();
      const sched = schedule.find((s: any) => s.day_of_week === dow);
      if (!sched || !sched.is_working) {
        const dateStr = `${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
        try {
          await fetch(`${API}/professionals/${professional.id}/blocks`, {
            method: "POST", headers: {...h, "Content-Type": "application/json"},
            body: JSON.stringify({ startsAt: `${dateStr}T00:00:00`, endsAt: `${dateStr}T23:59:59`, reason: "Folga" })
          });
          created++;
        } catch {}
      }
    }
    fetch(`${API}/professionals/${professional.id}/blocks`, { headers: h }).then(r=>r.json()).then(d=>setBlocks(d.data??[]));
    setSaving(false);
    alert(`${created} bloqueios criados para o mes!`);
  };

  const removeBlock = async (blockId: string) => {"""

content = content.replace(old, new)

# Adiciona botao "Replicar para o mes" na aba de bloqueios
old_btn = "    setNewBlock({ startsAt:\"\", endsAt:\"\", reason:\"\" });\n    fetch(`${API}/professionals/${professional.id}/blocks`, { headers: h }).then(r=>r.json()).then(d=>setBlocks(d.data??[]));\n  };"
# Nao precisamos mudar addBlock, so adicionar o botao na UI

# Adiciona botao na aba blocks - busca pelo header da aba
old_blocks_header = '        {tab === "blocks" && ('
new_blocks_header = '''        {tab === "blocks" && ('''

# Busca o botao de adicionar bloqueio para inserir o novo botao antes
old_add_btn = '            <button onClick={addBlock}'
new_add_btn = '''            <button onClick={replicateMonthBlocks} disabled={saving}
              style={{ padding:"10px 18px", background:`${C.gold}20`, border:`1px solid ${C.gold}40`, borderRadius:10, color:C.gold, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:FB, marginBottom:16, width:"100%" }}>
              {saving ? "Criando bloqueios..." : "Replicar folgas para o mes atual"}
            </button>
            <button onClick={addBlock}'''

content = content.replace(old_add_btn, new_add_btn)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("OK")
