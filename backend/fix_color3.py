path = r"C:\projetos\beautytech-v2\backend\src\modules\appointments\appointments.routes.ts"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = 'ts.website, businessHours: tenants.businessHours, googlePlaceId: tenants.googlePlaceId,\n    }).from(tenants).where(and(eq(tenants.slug, req.params.slug)'
new = 'ts.website, businessHours: tenants.businessHours, googlePlaceId: tenants.googlePlaceId,\n      primaryColor: tenants.primaryColor, coverUrl: tenants.coverUrl,\n    }).from(tenants).where(and(eq(tenants.slug, req.params.slug)'

if old in content:
    content = content.replace(old, new)
    print("OK - substituicao feita")
else:
    print("ERRO - texto nao encontrado")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
