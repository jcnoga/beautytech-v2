-- Reversão manual da migration 0012_example_batches (o migrator do Drizzle não tem "down").
-- Rodar só com backup e numa transação. ATENÇÃO: os lotes 'example' passam a parecer lotes de teste ('test') e
-- voltariam a impedir a assinatura dessas contas. Apague-os (ou apague as linhas de test_batches com kind='example')
-- ANTES de reverter, se for o caso.
BEGIN;
DROP INDEX IF EXISTS "test_batches_tenant_kind_idx";
ALTER TABLE "test_batches" DROP CONSTRAINT IF EXISTS "test_batches_kind_check";
ALTER TABLE "test_batches" DROP COLUMN IF EXISTS "kind";
-- Desregistrar a migration, para o migrator poder aplicá-la de novo no futuro:
DELETE FROM drizzle.__drizzle_migrations WHERE created_at = 1791600000000;
COMMIT;
