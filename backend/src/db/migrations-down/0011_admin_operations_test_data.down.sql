-- Reversão manual da migration 0011_admin_operations_test_data (o migrator do Drizzle não tem "down").
-- Rodar só com backup e numa transação. ATENÇÃO: apaga a auditoria do Super Admin (admin_operations) e o
-- registro dos lotes de teste. Os dados de teste gerados CONTINUAM nas tabelas da conta, sem a lista que permite
-- apagá-los com segurança: apague os lotes pelo Super Admin ANTES de reverter, se for o caso.
BEGIN;
DROP TABLE IF EXISTS "test_batch_items";
DROP TABLE IF EXISTS "test_batches";
DROP TABLE IF EXISTS "admin_operations";
ALTER TABLE "tenants" DROP COLUMN IF EXISTS "is_test_account";
ALTER TABLE "tenants" DROP COLUMN IF EXISTS "is_protected";
-- Desregistrar a migration, para o migrator poder aplicá-la de novo no futuro:
DELETE FROM drizzle.__drizzle_migrations WHERE created_at = 1791500000000;
COMMIT;
