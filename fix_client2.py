old = """  private getToken(): string {
    // Tenta chave direta do Supabase (formato session object)
    const key = Object.keys(localStorage).find(k => k.startsWith("sb-") && k.endsWith("-auth-token"));
    if (key) {
      try {
        const s = JSON.parse(localStorage.getItem(key) ?? "{}");
        const token = s?.access_token ?? s?.session?.access_token;
        if (token) return token;
      } catch {}
    }
    // Fallback: busca por wthheg (chave antiga)
    const key2 = Object.keys(localStorage).find(k => k.includes("wthheg"));
    if (key2) {
      try {
        const s = JSON.parse(localStorage.getItem(key2) ?? "{}");
        const token = s?.access_token ?? s?.session?.access_token;
        if (token) return token;
      } catch {}
    }
    throw new Error("Sessao expirada");
  }

  private async request<T>(method: string, endpoint: string, body?: unknown, params?: Record<string, any>): Promise<T> {
    const token = this.getToken();"""

new = """  private async getToken(): Promise<string> {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (token) return token;
    throw new Error("Sessao expirada");
  }

  private async request<T>(method: string, endpoint: string, body?: unknown, params?: Record<string, any>): Promise<T> {
    const token = await this.getToken();"""

content = open('C:/projetos/beautytech-v2/frontend/src/api/client.ts', encoding='utf-8').read()
if old in content:
    content = content.replace(old, new, 1)
    open('C:/projetos/beautytech-v2/frontend/src/api/client.ts', 'w', encoding='utf-8').write(content)
    print("OK - getToken agora usa supabase.auth.getSession()")
else:
    print("NAO ENCONTRADO")
