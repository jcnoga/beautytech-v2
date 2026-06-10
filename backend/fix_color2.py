path = r"C:\projetos\beautytech-v2\backend\src\modules\appointments\appointments.routes.ts"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = '      businessHours: tenants.businessHours, googlePlaceId: tenants.googlePlaceId,\n    }).from(tenants).where(and(eq(tenants.slug, req.params.slug)'
new = '      businessHours: tenants.businessHours, googlePlaceId: tenants.googlePlaceId,\n      primaryColor: tenants.primaryColor, coverUrl: tenants.coverUrl,\n    }).from(tenants).where(and(eq(tenants.slug, req.params.slug)'

if old in content:
    content = content.replace(old, new)
    print("OK - substituicao feita")
else:
    print("ERRO - texto nao encontrado")
    # mostra trecho relevante
    idx = content.find("googlePlaceId")
    print(repr(content[idx-50:idx+150]))

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
