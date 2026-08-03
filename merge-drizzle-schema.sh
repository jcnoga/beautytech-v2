#!/usr/bin/env bash
# ============================================================
# merge-drizzle-schema.sh
# Mescla os models da Vitrine Premium no schema Drizzle real
# do BeautyTech v2 (backend/src/db/schema/index.ts).
#
# Reaproveita a tabela `reviews` já existente (não cria
# testimonials duplicado). Cria apenas:
#   - salonProfile
#   - portfolioImages
#   - promotions
#
# Uso:
#   cd /c/projetos/beautytech-v2
#   bash merge-drizzle-schema.sh
# ============================================================

set -e

SCHEMA_PATH="backend/src/db/schema/index.ts"

echo "=== 1. Verificando schema ==="
if [ ! -f "$SCHEMA_PATH" ]; then
  echo "ERRO: $SCHEMA_PATH não encontrado. Rode a partir da raiz do projeto."
  exit 1
fi
echo "OK: $SCHEMA_PATH"

echo ""
echo "=== 2. Backup ==="
BACKUP_PATH="${SCHEMA_PATH}.bak.$(date +%Y%m%d%H%M%S)"
cp "$SCHEMA_PATH" "$BACKUP_PATH"
echo "Backup salvo em: $BACKUP_PATH"

echo ""
echo "=== 3. Checando se já foi aplicado ==="
if grep -q "export const salonProfile = pgTable" "$SCHEMA_PATH"; then
  echo "AVISO: 'salonProfile' já existe em $SCHEMA_PATH. Abortando para não duplicar."
  exit 1
fi

echo ""
echo "=== 4. Inserindo as 3 tabelas novas antes de 'export const tenantsRelations' ==="
ANCHOR='export const tenantsRelations = relations(tenants, ({ many }) => ({'

if ! grep -qF "$ANCHOR" "$SCHEMA_PATH"; then
  echo "ERRO: âncora de inserção não encontrada. Abortando (schema não alterado)."
  exit 1
fi

TABLES_BLOCK='// ────────────────────────────────────────────────────────────
// VITRINE DIGITAL PREMIUM — adicionado via merge-drizzle-schema.sh
// ────────────────────────────────────────────────────────────

export const salonProfile = pgTable("salon_profiles", {
  id:               uuid("id").primaryKey().defaultRandom(),
  tenantId:         uuid("tenant_id").notNull().unique().references(() => tenants.id),
  tagline:          varchar("tagline", { length: 150 }),
  description:      text("description"),
  coverImageUrl:    text("cover_image_url"),
  instagramUrl:     varchar("instagram_url", { length: 300 }),
  whatsappNumber:   varchar("whatsapp_number", { length: 20 }),
  addressFull:      varchar("address_full", { length: 300 }),
  isPremiumEnabled: boolean("is_premium_enabled").notNull().default(false),
  ...audit,
}, (t) => ({
  tenantIdx: index("salon_profiles_tenant_idx").on(t.tenantId),
}));

export const portfolioImages = pgTable("portfolio_images", {
  id:             uuid("id").primaryKey().defaultRandom(),
  tenantId:       uuid("tenant_id").notNull().references(() => tenants.id),
  professionalId: uuid("professional_id").references(() => professionals.id),
  imageUrl:       text("image_url").notNull(),
  caption:        varchar("caption", { length: 200 }),
  category:       varchar("category", { length: 50 }),
  sortOrder:      integer("sort_order").notNull().default(0),
  ...audit,
}, (t) => ({
  tenantIdx: index("portfolio_images_tenant_idx").on(t.tenantId),
  professionalIdx: index("portfolio_images_professional_idx").on(t.professionalId),
}));

export const promotionDiscountTypeEnum = pgEnum("promotion_discount_type", ["percentage", "fixed_amount"]);

export const promotions = pgTable("promotions", {
  id:            uuid("id").primaryKey().defaultRandom(),
  tenantId:      uuid("tenant_id").notNull().references(() => tenants.id),
  title:         varchar("title", { length: 150 }).notNull(),
  description:   text("description"),
  discountType:  promotionDiscountTypeEnum("discount_type").notNull(),
  discountValue: numeric("discount_value", { precision: 10, scale: 2 }).notNull(),
  validFrom:     timestamp("valid_from", { withTimezone: true }).notNull(),
  validUntil:    timestamp("valid_until", { withTimezone: true }).notNull(),
  isActive:      boolean("is_active").notNull().default(true),
  ...audit,
}, (t) => ({
  tenantIdx: index("promotions_tenant_idx").on(t.tenantId),
}));

export const salonProfileRelations = relations(salonProfile, ({ one }) => ({
  tenant: one(tenants, { fields: [salonProfile.tenantId], references: [tenants.id] }),
}));

export const portfolioImagesRelations = relations(portfolioImages, ({ one }) => ({
  tenant: one(tenants, { fields: [portfolioImages.tenantId], references: [tenants.id] }),
  professional: one(professionals, { fields: [portfolioImages.professionalId], references: [professionals.id] }),
}));

export const promotionsRelations = relations(promotions, ({ one }) => ({
  tenant: one(tenants, { fields: [promotions.tenantId], references: [tenants.id] }),
}));

'

# Usa awk para inserir o bloco de tabelas exatamente antes da âncora
awk -v block="$TABLES_BLOCK" -v anchor="$ANCHOR" '
  index($0, anchor) == 1 && !done {
    print block
    done=1
  }
  { print }
' "$SCHEMA_PATH" > "${SCHEMA_PATH}.tmp" && mv "${SCHEMA_PATH}.tmp" "$SCHEMA_PATH"

echo "Tabelas inseridas."

echo ""
echo "=== 5. Adicionando relations dentro de tenantsRelations ==="
awk '
  /professionals: many\(professionals\),/ && !done {
    print $0
    print "  salonProfile: one(salonProfile),"
    print "  portfolioImages: many(portfolioImages),"
    print "  promotions: many(promotions),"
    done=1
    next
  }
  { print }
' "$SCHEMA_PATH" > "${SCHEMA_PATH}.tmp" && mv "${SCHEMA_PATH}.tmp" "$SCHEMA_PATH"
echo "OK."

echo ""
echo "=== 6. Adicionando relation dentro de professionalsRelations ==="
awk '
  /reviews: many\(reviews\),/ && !done {
    print $0
    print "  portfolioImages: many(portfolioImages),"
    done=1
    next
  }
  { print }
' "$SCHEMA_PATH" > "${SCHEMA_PATH}.tmp" && mv "${SCHEMA_PATH}.tmp" "$SCHEMA_PATH"
echo "OK."

echo ""
echo "=== 7. Validando com drizzle-kit ==="
cd backend
if npx drizzle-kit generate:pg 2>&1 | tee /tmp/drizzle-check.log | grep -qi "error"; then
  echo ""
  echo "ERRO detectado na validação. Restaurando backup..."
  cd ..
  cp "$BACKUP_PATH" "$SCHEMA_PATH"
  echo "Backup restaurado. Veja o log acima para o erro."
  exit 1
fi
cd ..

echo ""
echo "=== CONCLUÍDO ==="
echo "Schema atualizado: $SCHEMA_PATH"
echo "Backup original:   $BACKUP_PATH"
echo ""
echo "Próximo passo (rode manualmente, mexe no banco Supabase real):"
echo "  cd backend"
echo "  npm run db:generate"
echo "  npm run db:push"
