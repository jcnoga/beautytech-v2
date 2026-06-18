# -*- coding: utf-8 -*-
path = r"C:\projetos\beautytech-v2\frontend\src\OnboardingWizard.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Adiciona estado do slug
old = "  const [step, setStep] = useState(1);\n  const [saving, setSaving] = useState(false);\n  const [error, setError] = useState(\"\");"
new = "  const [step, setStep] = useState(1);\n  const [saving, setSaving] = useState(false);\n  const [error, setError] = useState(\"\");\n  const [slug, setSlug] = useState(\"\");"
content = content.replace(old, new)

# Busca o slug no useEffect ao montar
old2 = "  // Step 1 - Perfil do salao"
new2 = """  // Busca slug ao montar
  useState(() => {
    const token = getToken();
    if (token) {
      fetch(`${API}/api/v1/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(d => { const t = d.data ?? d; setSlug(t.slug ?? ""); })
        .catch(() => {});
    }
  });

  // Step 1 - Perfil do salao"""
content = content.replace(old2, new2)

# Corrige a URL na tela final
old3 = "              zensalon.com.br/agendar/..."
new3 = "              {`zensalon.com.br/agendar/${slug || '...'}`}"
content = content.replace(old3, new3)

# Torna a URL clicavel
old4 = "              <div style={{ background: C.surface, borderRadius: 12, padding: \"14px 16px\", marginBottom: 24, fontSize: 13, color: C.gold, fontFamily: \"monospace\", wordBreak: \"break-all\" as const }}>\n                {`zensalon.com.br/agendar/${slug || '...'}`}\n              </div>"
new4 = "              <a href={`https://www.zensalon.com.br/agendar/${slug}`} target=\"_blank\" style={{ display: \"block\", background: C.surface, borderRadius: 12, padding: \"14px 16px\", marginBottom: 24, fontSize: 13, color: C.gold, fontFamily: \"monospace\", wordBreak: \"break-all\" as const, textDecoration: \"none\" }}>\n                {`zensalon.com.br/agendar/${slug || '...'}`}\n              </a>"
content = content.replace(old4, new4)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("OK")
