-- Mensalidades do Pilates no Financeiro: cada parcela de uma matrícula é um lançamento (receita) ligado a ela.
-- enrollment_id + installment_no únicos: gerar de novo nunca duplica (lançamentos manuais ficam com os dois vazios;
-- vazio não conflita com vazio no UNIQUE). Apagar a matrícula não apaga o dinheiro: o vínculo vira vazio.
-- Reversão: src/db/migrations-down/0010_enrollment_installments.down.sql
-- VPS: só com backup do banco e ensaio em banco descartável (ver docs/contexto_zensalon_vps.md).
ALTER TABLE "financial_transactions"
  ADD COLUMN "enrollment_id" uuid REFERENCES "membership_enrollments"("id") ON DELETE SET NULL,
  ADD COLUMN "installment_no" smallint;--> statement-breakpoint
ALTER TABLE "financial_transactions"
  ADD CONSTRAINT "financial_transactions_installment_check" CHECK ("installment_no" IS NULL OR "installment_no" >= 1),
  ADD CONSTRAINT "financial_transactions_enrollment_installment_unique" UNIQUE ("enrollment_id", "installment_no");
