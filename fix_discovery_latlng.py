path = r'C:\projetos\beautytech-v2\backend\src\modules\appointments\appointments.routes.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old = '      primaryColor: tenants.primaryColor, coverUrl: tenants.coverUrl, galleryImages: tenants.galleryImages,\n    }).from(tenants).where(and(...cond)).orderBy(tenants.name);'
new = '      primaryColor: tenants.primaryColor, coverUrl: tenants.coverUrl, galleryImages: tenants.galleryImages,\n      lat: tenants.lat, lng: tenants.lng,\n    }).from(tenants).where(and(...cond)).orderBy(tenants.name);'

if old in content:
    content = content.replace(old, new)
    print('OK - lat/lng adicionado ao endpoint discovery')
else:
    print('ATENCAO - trecho nao encontrado')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
