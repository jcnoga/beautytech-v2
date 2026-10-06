-- Reversão manual da migration 0010_enrollment_installments (o migrator do Drizzle não tem "down").
-- Rodar só com backup e numa transação. As parcelas já geradas CONTINUAM no Financeiro como lançamentos
-- comuns (dinheiro não é apagado), só perdem o vínculo com a matrícula. Se a 0010 for aplicada de novo depois,
-- "Gerar mensalidades" criaria as parcelas outra vez: antes, apague à mão as pendentes geradas, se for o caso.
BEGIN;
ALTER TABLE "financial_transactions" DROP CONSTRAINT IF EXISTS "financial_transactions_enrollment_installment_unique";
ALTER TABLE "financial_transactions" DROP CONSTRAINT IF EXISTS "financial_transactions_installment_check";
ALTER TABLE "financial_transactions" DROP COLUMN IF EXISTS "installment_no";
ALTER TABLE "financial_transactions" DROP COLUMN IF EXISTS "enrollment_id";
-- Desregistrar a migration, para o migrator poder aplicá-la de novo no futuro:
DELETE FROM drizzle.__drizzle_migrations WHERE created_at = 1791400000000;
COMMIT;
