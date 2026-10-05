-- Reversão manual da migration 0007_tenant_limits_nullable (o migrator do Drizzle não tem "down").
-- Rodar só com backup e numa transação. Contas sem limite próprio voltam aos padrões antigos
-- (100 clientes, 1 profissional) — inclusive as criadas depois da 0007.
BEGIN;
UPDATE "tenants" SET "max_clients" = 100 WHERE "max_clients" IS NULL;
UPDATE "tenants" SET "max_professionals" = 1 WHERE "max_professionals" IS NULL;
ALTER TABLE "tenants" ALTER COLUMN "max_clients" SET DEFAULT 100;
ALTER TABLE "tenants" ALTER COLUMN "max_clients" SET NOT NULL;
ALTER TABLE "tenants" ALTER COLUMN "max_professionals" SET DEFAULT 1;
ALTER TABLE "tenants" ALTER COLUMN "max_professionals" SET NOT NULL;
-- Desregistrar a migration, para o migrator poder aplicá-la de novo no futuro:
DELETE FROM drizzle.__drizzle_migrations WHERE created_at = 1791100000000;
COMMIT;
