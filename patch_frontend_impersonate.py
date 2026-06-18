with open("frontend/src/App.tsx", "r", encoding="utf-8") as f:
    content = f.read()

old_btn = '        <Btn small variant="danger" onClick={(e: any) => { e.stopPropagation(); deleteTenant(t.id, t.name); }}>Deletar</Btn>'
new_btn = '        <Btn small variant="danger" onClick={(e: any) => { e.stopPropagation(); deleteTenant(t.id, t.name); }}>Deletar</Btn>\n        <Btn small variant="gold" onClick={(e: any) => { e.stopPropagation(); impersonateTenant(t.id, t.name); }}>Acessar como</Btn>'

old_fn = '  const deleteTenant = async (id: string, name: string) => {'
new_fn = '''  const impersonateTenant = async (id: string, name: string) => {
    if (!window.confirm(`Acessar painel de "${name}" como administrador?`)) return;
    try {
      const res = await fetch(`${API}/api/v1/super-admin/tenants/${id}/impersonate`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" }
      });
      const json = await res.json();
      if (!json.success) { alert("Erro: " + (json.error ?? "Falha na impersonation")); return; }
      sessionStorage.setItem("impersonation_token", json.token);
      sessionStorage.setItem("impersonation_tenant_name", name);
      sessionStorage.setItem("impersonation_sa_token", token ?? "");
      window.location.href = "/";
    } catch (err) {
      alert("Erro ao acessar tenant");
    }
  };

  const deleteTenant = async (id: string, name: string) => {'''

found_btn = old_btn in content
found_fn = old_fn in content

if found_btn and found_fn:
    content = content.replace(old_btn, new_btn, 1)
    content = content.replace(old_fn, new_fn, 1)
    with open("frontend/src/App.tsx", "w", encoding="utf-8") as f:
        f.write(content)
    print("OK: botao e funcao impersonateTenant adicionados")
else:
    if not found_btn:
        print("ERRO: marcador do botao nao encontrado")
    if not found_fn:
        print("ERRO: marcador da funcao deleteTenant nao encontrado")
