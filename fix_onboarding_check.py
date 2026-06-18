# -*- coding: utf-8 -*-
path = r"C:\projetos\beautytech-v2\frontend\src\App.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = """        // Verifica se precisa de onboarding
        if (k.data && (k.data.totalProfessionals === 0 || k.data.totalServices === 0)) {
          try {
            const me = await fetch((import.meta as any).env?.VITE_API_URL + '/api/v1/auth/me', { headers: { Authorization: 'Bearer ' + (() => { const k2 = Object.keys(localStorage).find(x => x.includes('auth-token') || x.includes('sb-')); return k2 ? JSON.parse(localStorage.getItem(k2)||'{}').access_token : ''; })() } }).then(r2 => r2.json());
            setTenantName(me.data?.name ?? me.name ?? '');
          } catch {}
          setShowOnboarding(true);
        }"""

new = """        // Verifica se precisa de onboarding
        try {
          const token = (() => { const k2 = Object.keys(localStorage).find(x => x.includes('auth-token') || x.includes('sb-')); return k2 ? JSON.parse(localStorage.getItem(k2)||'{}').access_token : ''; })();
          const headers = { Authorization: 'Bearer ' + token };
          const base = (import.meta as any).env?.VITE_API_URL ?? '';
          const [profsRes, svcsRes, meRes] = await Promise.all([
            fetch(base + '/api/v1/professionals', { headers }).then(r2 => r2.json()),
            fetch(base + '/api/v1/services', { headers }).then(r2 => r2.json()),
            fetch(base + '/api/v1/auth/me', { headers }).then(r2 => r2.json()),
          ]);
          const profs = profsRes.data ?? [];
          const svcs = svcsRes.data ?? [];
          setTenantName(meRes.data?.name ?? meRes.name ?? '');
          if (profs.length === 0 || svcs.length === 0) {
            setShowOnboarding(true);
          }
        } catch {}"""

content = content.replace(old, new)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("OK")
