path = r"C:\projetos\beautytech-v2\backend\src\server.ts"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = 'await server.register(cors, { origin: env.CORS_ORIGINS, credentials: true });'
new = '''await server.register(cors, {
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      const publicPaths = ["/api/v1/public/"];
      cb(null, true);
    },
    credentials: true,
  });'''

content = content.replace(old, new)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
print("OK - cors atualizado")
