import re

# 1. Schema
path = r"C:\projetos\beautytech-v2\backend\src\db\schema\index.ts"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = '  primaryColor: varchar("primary_color", { length: 20 }).default("#c9a96e"),\n  coverUrl:     text("cover_url"),'
new = '  primaryColor: varchar("primary_color", { length: 20 }).default("#c9a96e"),\n  coverUrl:     text("cover_url"),\n  galleryImages: jsonb("gallery_images").notNull().default([]),'

content = content.replace(old, new)
with open(path, "w", encoding="utf-8") as f:
    f.write(content)
print("OK - schema atualizado")

# 2. Rota publica - lista tenants
path2 = r"C:\projetos\beautytech-v2\backend\src\modules\appointments\appointments.routes.ts"
with open(path2, "r", encoding="utf-8") as f:
    content2 = f.read()

old2 = '      primaryColor: tenants.primaryColor, coverUrl: tenants.coverUrl,\n    }).from(tenants).where(and(...cond))'
new2 = '      primaryColor: tenants.primaryColor, coverUrl: tenants.coverUrl, galleryImages: tenants.galleryImages,\n    }).from(tenants).where(and(...cond))'

old3 = '      primaryColor: tenants.primaryColor, coverUrl: tenants.coverUrl,\n    }).from(tenants).where(and(eq(tenants.slug, req.params.slug)'
new3 = '      primaryColor: tenants.primaryColor, coverUrl: tenants.coverUrl, galleryImages: tenants.galleryImages,\n    }).from(tenants).where(and(eq(tenants.slug, req.params.slug)'

content2 = content2.replace(old2, new2)
content2 = content2.replace(old3, new3)
with open(path2, "w", encoding="utf-8") as f:
    f.write(content2)
print("OK - rotas atualizadas")
