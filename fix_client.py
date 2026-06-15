content = open('C:/projetos/beautytech-v2/frontend/src/api/client.ts', encoding='utf-8').read()

old = """  private getToken(): string {
    const key = Object.keys(localStorage).find(k => k.includes("wthheg"));
    if (key) { const s = JSON.parse(localStorage.getItem(key) ?? "{}"); if (s?.access_token) return s.access_token; }
    throw new Error("Sessao expirada");
  }"""

new = """  private getToken(): string {
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
  }"""

if old in content:
    content = content.replace(old, new, 1)
    open('C:/projetos/beautytech-v2/frontend/src/api/client.ts', 'w', encoding='utf-8').write(content)
    print("OK - getToken corrigido")
else:
    print("NAO ENCONTRADO")
