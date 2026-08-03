#!/usr/bin/env bash
# ============================================================
# merge-prisma-schema.sh
# Mescla automaticamente os models da Vitrine Premium
# (SalonProfile, PortfolioImage, Testimonial, Promotion)
# no schema.prisma real do projeto BeautyTech v2.
#
# Uso:
#   cd /c/projetos/beautytech-v2
#   bash merge-prisma-schema.sh
# ============================================================

set -e

echo "=== 1. Localizando schema.prisma ==="
SCHEMA_PATH=$(find . -name "schema.prisma" -not -path "*/node_modules/*" | head -n 1)

if [ -z "$SCHEMA_PATH" ]; then
  echo "ERRO: nenhum schema.prisma encontrado a partir de $(pwd)."
  echo "Rode este script a partir da raiz do projeto (ex: /c/projetos/beautytech-v2)."
  exit 1
fi

echo "Encontrado: $SCHEMA_PATH"

echo ""
echo "=== 2. Fazendo backup ==="
BACKUP_PATH="${SCHEMA_PATH}.bak.$(date +%Y%m%d%H%M%S)"
cp "$SCHEMA_PATH" "$BACKUP_PATH"
echo "Backup salvo em: $BACKUP_PATH"

echo ""
echo "=== 3. Verificando se já foi aplicado antes ==="
if grep -q "model SalonProfile" "$SCHEMA_PATH"; then
  echo "AVISO: 'model SalonProfile' já existe em $SCHEMA_PATH."
  echo "Abortando para não duplicar. Verifique manualmente se precisa reaplicar."
  exit 1
fi

echo ""
echo "=== 4. Anexando os 4 models novos + enum ao final do arquivo ==="
cat >> "$SCHEMA_PATH" << 'PRISMA_EOF'

// ============================================================
// Vitrine Digital Premium por Salão — adicionado via merge-prisma-schema.sh
// ============================================================

model SalonProfile {
  id               String   @id @default(uuid())
  tenantId         String   @unique @map("tenant_id")
  tagline          String?  @db.VarChar(150)
  description      String?  @db.Text
  coverImageUrl    String?  @map("cover_image_url") @db.VarChar(500)
  instagramUrl     String?  @map("instagram_url") @db.VarChar(300)
  whatsappNumber   String?  @map("whatsapp_number") @db.VarChar(20)
  addressFull      String?  @map("address_full") @db.VarChar(300)
  isPremiumEnabled Boolean  @default(false) @map("is_premium_enabled")
  createdAt        DateTime @default(now()) @map("created_at")
  updatedAt        DateTime @updatedAt @map("updated_at")

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@map("salon_profiles")
}

model PortfolioImage {
  id             String   @id @default(uuid())
  tenantId       String   @map("tenant_id")
  professionalId String?  @map("professional_id")
  imageUrl       String   @map("image_url") @db.VarChar(500)
  caption        String?  @db.VarChar(200)
  category       String?  @db.VarChar(50)
  displayOrder   Int      @default(0) @map("display_order")
  createdAt      DateTime @default(now()) @map("created_at")

  tenant       Tenant        @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  professional Professional? @relation(fields: [professionalId], references: [id], onDelete: SetNull)

  @@index([tenantId])
  @@index([tenantId, displayOrder])
  @@map("portfolio_images")
}

model Testimonial {
  id         String   @id @default(uuid())
  tenantId   String   @map("tenant_id")
  clientName String   @map("client_name") @db.VarChar(100)
  rating     Int      @db.SmallInt
  comment    String   @db.Text
  isApproved Boolean  @default(false) @map("is_approved")
  createdAt  DateTime @default(now()) @map("created_at")

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@index([tenantId])
  @@index([tenantId, isApproved])
  @@map("testimonials")
}

enum DiscountType {
  PERCENTAGE
  FIXED_AMOUNT
}

model Promotion {
  id            String       @id @default(uuid())
  tenantId      String       @map("tenant_id")
  title         String       @db.VarChar(150)
  description   String?      @db.Text
  discountType  DiscountType @map("discount_type")
  discountValue Decimal      @map("discount_value") @db.Decimal(10, 2)
  validFrom     DateTime     @map("valid_from")
  validUntil    DateTime     @map("valid_until")
  isActive      Boolean      @default(true) @map("is_active")
  createdAt     DateTime     @default(now()) @map("created_at")

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@index([tenantId])
  @@index([tenantId, isActive])
  @@map("promotions")
}
PRISMA_EOF

echo "Models anexados."

echo ""
echo "=== 5. Inserindo relations no model Tenant (se encontrado) ==="
if grep -q "^model Tenant {" "$SCHEMA_PATH"; then
  awk '
    /^model Tenant {/ { in_tenant=1 }
    in_tenant && /^}/ {
      print "  salonProfile     SalonProfile?"
      print "  portfolioImages  PortfolioImage[]"
      print "  testimonials     Testimonial[]"
      print "  promotions       Promotion[]"
      print $0
      in_tenant=0
      next
    }
    { print }
  ' "$SCHEMA_PATH" > "${SCHEMA_PATH}.tmp" && mv "${SCHEMA_PATH}.tmp" "$SCHEMA_PATH"
  echo "Relations inseridas em model Tenant."
else
  echo "AVISO: 'model Tenant {' não encontrado (nesse formato exato)."
  echo "Você precisará adicionar manualmente estas linhas dentro do model Tenant:"
  echo "  salonProfile     SalonProfile?"
  echo "  portfolioImages  PortfolioImage[]"
  echo "  testimonials     Testimonial[]"
  echo "  promotions       Promotion[]"
fi

echo ""
echo "=== 6. Inserindo relation no model Professional (se encontrado) ==="
if grep -q "^model Professional {" "$SCHEMA_PATH"; then
  awk '
    /^model Professional {/ { in_prof=1 }
    in_prof && /^}/ {
      print "  portfolioImages  PortfolioImage[]"
      print $0
      in_prof=0
      next
    }
    { print }
  ' "$SCHEMA_PATH" > "${SCHEMA_PATH}.tmp" && mv "${SCHEMA_PATH}.tmp" "$SCHEMA_PATH"
  echo "Relation inserida em model Professional."
else
  echo "AVISO: 'model Professional {' não encontrado (nesse formato exato)."
  echo "Adicione manualmente dentro do model Professional:"
  echo "  portfolioImages  PortfolioImage[]"
fi

echo ""
echo "=== 7. Validando sintaxe do schema com Prisma ==="
if command -v npx &> /dev/null; then
  npx prisma format --schema="$SCHEMA_PATH" || {
    echo ""
    echo "ERRO: 'prisma format' falhou. O schema pode ter ficado inválido."
    echo "Restaurando backup automaticamente..."
    cp "$BACKUP_PATH" "$SCHEMA_PATH"
    echo "Backup restaurado. Nenhuma alteração ficou aplicada."
    exit 1
  }
else
  echo "npx não encontrado — pulei a validação automática."
fi

echo ""
echo "=== CONCLUÍDO ==="
echo "Schema atualizado em: $SCHEMA_PATH"
echo "Backup original em:   $BACKUP_PATH"
echo ""
echo "Próximo passo (NÃO automático, roda por sua conta):"
echo "  cd $(dirname "$SCHEMA_PATH")/.."
echo "  npx prisma migrate dev --name add_salon_vitrine_premium"
