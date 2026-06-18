with open("frontend/src/api/client.ts", "r", encoding="utf-8") as f:
    content = f.read()

old_gettoken = '''  private async getToken(): Promise<string> {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (token) return token;
    throw new Error("Sessao expirada");
  }'''

new_gettoken = '''  private async getToken(): Promise<string> {
    // Impersonation: Super Admin acessando como tenant
    const impToken = sessionStorage.getItem("impersonation_token");
    if (impToken) return impToken;
    // Token normal via Supabase
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (token) return token;
    throw new Error("Sessao expirada");
  }'''

if old_gettoken in content:
    content = content.replace(old_gettoken, new_gettoken, 1)
    with open("frontend/src/api/client.ts", "w", encoding="utf-8") as f:
        f.write(content)
    print("OK: getToken atualizado para priorizar impersonation_token")
else:
    print("ERRO: marcador nao encontrado")
