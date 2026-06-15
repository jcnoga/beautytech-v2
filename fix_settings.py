content = open('C:/projetos/beautytech-v2/frontend/src/TenantSettingsPage.tsx', encoding='utf-8').read()

# 1. Adiciona hasWifi e hasParking no estado inicial
old_form = """  const [form, setForm] = useState<any>({ name:"", logoUrl:"", coverUrl:"", primaryColor:"#c9a96e", whatsapp:"", instagram:"", facebook:"", phone:"", website:"", addressStreet:"", addressCity:"", addressState:"", addressZip:"" });"""
new_form = """  const [form, setForm] = useState<any>({ name:"", logoUrl:"", coverUrl:"", primaryColor:"#c9a96e", whatsapp:"", instagram:"", facebook:"", phone:"", website:"", addressStreet:"", addressCity:"", addressState:"", addressZip:"", hasWifi:false, hasParking:false });"""

if old_form in content:
    content = content.replace(old_form, new_form, 1)
    print("OK - estado inicial atualizado")
else:
    print("NAO ENCONTRADO no estado inicial")

# 2. Adiciona hasWifi e hasParking no carregamento dos dados
old_load = """        addressZip: t.addressZip ?? "",
      });"""
new_load = """        addressZip: t.addressZip ?? "",
        hasWifi: t.hasWifi ?? false,
        hasParking: t.hasParking ?? false,
      });"""

if old_load in content:
    content = content.replace(old_load, new_load, 1)
    print("OK - carregamento atualizado")
else:
    print("NAO ENCONTRADO no carregamento")

# 3. Adiciona wifi e estacionamento na aba Endereco
old_address = """        {activeTab === "address" && (
          <div>
            <Inp label="Rua / Endereço" value={form.addressStreet} onChange={f("addressStreet")} placeholder="Rua das Flores, 123" />
            <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:12 }}>
              <Inp label="Cidade" value={form.addressCity} onChange={f("addressCity")} placeholder="Uberaba" />
              <Inp label="Estado (UF)" value={form.addressState} onChange={f("addressState")} placeholder="MG" />
            </div>
            <Inp label="CEP" value={form.addressZip} onChange={f("addressZip")} placeholder="38000-000" />
          </div>
        )}"""

new_address = """        {activeTab === "address" && (
          <div>
            <Inp label="Rua / Logradouro" value={form.addressStreet} onChange={f("addressStreet")} placeholder="Rua das Flores, 123" />
            <Inp label="CEP" value={form.addressZip} onChange={f("addressZip")} placeholder="38000-000" />
            <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:12 }}>
              <Inp label="Cidade" value={form.addressCity} onChange={f("addressCity")} placeholder="Uberaba" />
              <Inp label="UF" value={form.addressState} onChange={(v: string) => setForm((p: any) => ({ ...p, addressState: v.toUpperCase().slice(0,2) }))} placeholder="MG" />
            </div>
            <div style={{ fontSize:11, fontWeight:700, color:C.textMuted, textTransform:"uppercase", letterSpacing:".08em", margin:"16px 0 8px" }}>Comodidades</div>
            <div style={{ display:"flex", gap:20, marginBottom:16 }}>
              <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", fontSize:13, color:C.text }}>
                <input type="checkbox" checked={form.hasWifi ?? false} onChange={e => setForm((p: any) => ({ ...p, hasWifi: e.target.checked }))}
                  style={{ accentColor:C.gold, width:16, height:16 }} />
                📶 Wi-Fi gratuito
              </label>
              <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", fontSize:13, color:C.text }}>
                <input type="checkbox" checked={form.hasParking ?? false} onChange={e => setForm((p: any) => ({ ...p, hasParking: e.target.checked }))}
                  style={{ accentColor:C.gold, width:16, height:16 }} />
                🅿️ Estacionamento
              </label>
            </div>
            <div style={{ background:"rgba(201,169,110,0.08)", border:"1px solid rgba(201,169,110,0.2)", borderRadius:10, padding:"10px 14px", fontSize:11, color:C.textMuted }}>
              📍 Ao salvar, as coordenadas do endereço serão atualizadas automaticamente para aparecer na busca por proximidade.
            </div>
          </div>
        )}"""

if old_address in content:
    content = content.replace(old_address, new_address, 1)
    print("OK - aba endereco atualizada")
else:
    print("NAO ENCONTRADO na aba endereco")

open('C:/projetos/beautytech-v2/frontend/src/TenantSettingsPage.tsx', 'w', encoding='utf-8').write(content)
print("CONCLUIDO")
