path = r"C:\projetos\beautytech-v2\frontend\src\App.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Adicionar coluna WhatsApp na tabela de tenants
old_col = '    { key:"createdAt", label:"Cadastro", render: (t: any) => <span style={{ fontSize:12, color:C.textMuted }}>{fmtDate(t.createdAt)}</span> },'
new_col = '''    { key:"createdAt", label:"Cadastro", render: (t: any) => <span style={{ fontSize:12, color:C.textMuted }}>{fmtDate(t.createdAt)}</span> },
    { key:"whatsapp_status", label:"WhatsApp", render: (t: any) => {
      const connected = t.whatsapp_status === "connected";
      return (
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <div style={{ width:8, height:8, borderRadius:"50%", background: connected ? "#4CAF50" : "#666", flexShrink:0 }} />
          <span style={{ fontSize:11, color: connected ? "#4CAF50" : C.textMuted }}>
            {connected ? (t.whatsapp_phone ?? "Conectado") : "Desconectado"}
          </span>
        </div>
      );
    }},'''

# 2. Adicionar bloco de status WhatsApp no modal
old_modal = '            {/* Estender Trial */}'
new_modal = '''            {/* Status WhatsApp */}
            <div style={{ background:C.surface, borderRadius:12, padding:16, marginBottom:20 }}>
              <div style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:12 }}>WhatsApp</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <div>
                  <div style={{ fontSize:10, color:C.textMuted, textTransform:"uppercase", marginBottom:4 }}>Status</div>
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <div style={{ width:10, height:10, borderRadius:"50%", background: selected.whatsapp_status === "connected" ? "#4CAF50" : "#666" }} />
                    <span style={{ fontSize:13, color: selected.whatsapp_status === "connected" ? "#4CAF50" : C.textMuted, fontWeight:600 }}>
                      {selected.whatsapp_status === "connected" ? "Conectado" : "Desconectado"}
                    </span>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize:10, color:C.textMuted, textTransform:"uppercase", marginBottom:4 }}>Numero</div>
                  <div style={{ fontSize:13, color:C.text }}>{selected.whatsapp_phone ?? "-"}</div>
                </div>
                <div>
                  <div style={{ fontSize:10, color:C.textMuted, textTransform:"uppercase", marginBottom:4 }}>Modo</div>
                  <div style={{ fontSize:13, color:C.text }}>{selected.whatsapp_mode ?? "manual"}</div>
                </div>
                <div>
                  <div style={{ fontSize:10, color:C.textMuted, textTransform:"uppercase", marginBottom:4 }}>Conectado em</div>
                  <div style={{ fontSize:12, color:C.textMuted }}>{selected.whatsapp_connected_at ? new Date(selected.whatsapp_connected_at).toLocaleString("pt-BR") : "-"}</div>
                </div>
              </div>
            </div>

            {/* Estender Trial */}'''

ok1 = old_col in content
ok2 = old_modal in content

if ok1:
    content = content.replace(old_col, new_col)
    print("OK - coluna WhatsApp adicionada na tabela")
else:
    print("ATENCAO - coluna nao encontrada")

if ok2:
    content = content.replace(old_modal, new_modal)
    print("OK - card WhatsApp adicionado no modal")
else:
    print("ATENCAO - modal nao encontrado")

if ok1 or ok2:
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(content)
    print("ARQUIVO SALVO")
