with open("backend/src/middleware/auth.ts", "r", encoding="utf-8") as f:
    content = f.read()

old = '''  const token = header.slice(7);
  try {
    const { payload } = await jwtVerify(token, JWKS);
    const userId = payload.sub as string;'''

new = '''  const token = header.slice(7);
  try {
    // Verificar se e token de impersonation (assinado com SUPER_ADMIN_SECRET)
    try {
      const jwt = await import("jsonwebtoken");
      const imp = jwt.default.verify(token, process.env.SUPER_ADMIN_SECRET!) as any;
      if (imp?.impersonation === true && imp?.tenantId && imp?.userId) {
        req.tenantContext = { tenantId: imp.tenantId, userId: imp.userId, role: imp.role ?? "owner" };
        return;
      }
    } catch (_) { /* nao e impersonation token, continuar com JWKS */ }

    const { payload } = await jwtVerify(token, JWKS);
    const userId = payload.sub as string;'''

if old in content:
    content = content.replace(old, new, 1)
    with open("backend/src/middleware/auth.ts", "w", encoding="utf-8") as f:
        f.write(content)
    print("OK: middleware atualizado para aceitar impersonation token")
else:
    print("ERRO: bloco nao encontrado")
