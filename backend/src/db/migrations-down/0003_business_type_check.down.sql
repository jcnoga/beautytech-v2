-- Reversão manual da migration 0003_business_type_check (o migrator do Drizzle não tem "down").
-- Rodar só com backup e numa transação, e só se NÃO houver conta de Pilates (o enum antigo não tem 'pilates').
-- Remove a regra e, no banco de produção (que era enum), volta a coluna para business_type_enum.
BEGIN;
ALTER TABLE "tenants" DROP CONSTRAINT IF EXISTS "tenants_business_type_check";
-- Só no banco que tinha o enum (produção):
-- ALTER TABLE "tenants" ALTER COLUMN "business_type" DROP DEFAULT;
-- ALTER TABLE "tenants" ALTER COLUMN "business_type" TYPE business_type_enum USING "business_type"::business_type_enum;
-- ALTER TABLE "tenants" ALTER COLUMN "business_type" SET DEFAULT 'beauty_salon';
DELETE FROM drizzle.__drizzle_migrations WHERE created_at = 1790700000000;
COMMIT;
