with open("frontend/src/App.tsx", "r", encoding="utf-8") as f:
    content = f.read()

old_return = '''  return (
    <div>
      <PageHeader title="Dashboard"'''

new_return = '''  const impToken = sessionStorage.getItem("impersonation_token");
  const impTenantName = sessionStorage.getItem("impersonation_tenant_name");
  const impSaToken = sessionStorage.getItem("impersonation_sa_token");

  return (
    <div>
      {impToken && (
        <div style={{
          background: "#FF6B00",
          color: "#fff",
          padding: "10px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontFamily: "Outfit, sans-serif",
          fontSize: 14,
          fontWeight: 600,
          position: "sticky",
          top: 0,
          zIndex: 9999,
          boxShadow: "0 2px 8px rgba(0,0,0,0.3)"
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:18 }}>👁️</span>
            <span>Modo Impersonation — Você está acessando como <strong>{impTenantName}</strong></span>
          </div>
          <button
            onClick={() => {
              const saToken = impSaToken ?? "";
              sessionStorage.removeItem("impersonation_token");
              sessionStorage.removeItem("impersonation_tenant_name");
              sessionStorage.removeItem("impersonation_sa_token");
              sessionStorage.setItem("sa_token", saToken);
              window.location.href = "/?superadmin=1";
            }}
            style={{
              background: "rgba(255,255,255,0.2)",
              border: "1px solid rgba(255,255,255,0.5)",
              color: "#fff",
              padding: "6px 16px",
              borderRadius: 8,
              cursor: "pointer",
              fontWeight: 700,
              fontSize: 13,
              fontFamily: "Outfit, sans-serif"
            }}
          >
            Sair da Impersonation
          </button>
        </div>
      )}
      <PageHeader title="Dashboard"'''

if old_return in content:
    content = content.replace(old_return, new_return, 1)
    with open("frontend/src/App.tsx", "w", encoding="utf-8") as f:
        f.write(content)
    print("OK: banner laranja adicionado ao DashboardPage")
else:
    print("ERRO: marcador nao encontrado")
