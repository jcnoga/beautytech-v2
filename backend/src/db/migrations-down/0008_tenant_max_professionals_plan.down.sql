-- Reversão manual da migration 0008_tenant_max_professionals_plan (o migrator do Drizzle não tem "down").
-- Rodar só com backup e numa transação, ANTES de reverter a 0007. Contas sem limite próprio de
-- profissionais voltam ao padrão antigo (1) — inclusive as criadas depois da 0007.
BEGIN;
UPDATE "tenants" SET "max_professionals" = 1 WHERE "max_professionals" IS NULL;
-- Desregistrar a migration, para o migrator poder aplicá-la de novo no futuro:
DELETE FROM drizzle.__drizzle_migrations WHERE created_at = 1791200000000;
COMMIT;
